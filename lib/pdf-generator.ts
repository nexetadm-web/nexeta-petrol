import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRs, formatLitres, formatDate } from "@/lib/formatters";

/**
 * Generates and downloads Daily Audit PDF report
 */
export function downloadDailyAuditPDF(data: any, reportDate: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const formattedDate = formatDate(reportDate);

  // 1. Header Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("NEXETA PETROL", 14, 13);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("PUMP MANAGEMENT SYSTEM - DAILY AUDIT REPORT", 14, 20);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Date: ${formattedDate} (Asia/Karachi)`, 210 - 14, 14, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Timezone: Pakistan Standard Time", 210 - 14, 20, { align: "right" });

  let currentY = 34;

  // 2. Top Summary Box (4 Cards)
  if (data?.summary) {
    const s = data.summary;
    const isProfit = s.netProfit >= 0;

    autoTable(doc, {
      startY: currentY,
      theme: "grid",
      head: [
        [
          "1. Total Fuel Sold",
          "2. Grand Total Sales",
          "3. Daily Expenses",
          "4. Net Estimated Profit",
        ],
      ],
      body: [
        [
          `${formatLitres(s.totalFuelLitres)}\nRs. ${s.totalFuelAmount?.toLocaleString()}`,
          `Rs. ${s.grandTotalSales?.toLocaleString()}\n(Fuel + Mobil Oil/Shop)`,
          `Rs. ${s.totalExpenses?.toLocaleString()}\n(Bijli, Staff, Misc)`,
          `Rs. ${s.netProfit?.toLocaleString()}\n(${isProfit ? "NET PROFIT" : "NET LOSS"})`,
        ],
      ],
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        fontSize: 10,
        fontStyle: "bold",
        halign: "center",
        cellPadding: 4,
        textColor: [15, 23, 42],
      },
      columnStyles: {
        3: {
          textColor: isProfit ? [16, 122, 65] : [220, 38, 38],
        },
      },
      styles: {
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 3. Section 1: Nozzle-Wise Meter Readings
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("1. NOZZLE METER READINGS & FUEL SALES", 14, currentY);
  currentY += 4;

  const readingRows = (data?.readings || []).map((r: any) => [
    r.nozzleName || `Nozzle ${r.nozzleId}`,
    r.fuelType || "Petrol",
    `${r.startTime || "08:00 AM"} - ${r.endTime || "08:00 PM"}`,
    (r.startReading !== undefined ? r.startReading : r.morningReading)?.toLocaleString() || "0",
    (r.endReading !== undefined ? r.endReading : r.eveningReading)?.toLocaleString() || "0",
    formatLitres(r.litresSold || 0),
    `Rs. ${r.rate || 0}`,
    `Rs. ${(r.amount || 0).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: "striped",
    head: [
      [
        "Nozzle",
        "Fuel",
        "Shift / Time (12h)",
        "Start Meter",
        "End Meter",
        "Sold (L)",
        "Rate (Rs)",
        "Amount (Rs)",
      ],
    ],
    body: readingRows.length > 0 ? readingRows : [["No readings recorded for this date", "", "", "", "", "", "", ""]],
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
      6: { halign: "right" },
      7: { halign: "right", fontStyle: "bold", textColor: [67, 56, 202] },
    },
    foot: [
      [
        "Total",
        "",
        "",
        "",
        "",
        formatLitres(data?.summary?.totalFuelLitres || 0),
        "",
        `Rs. ${(data?.summary?.totalFuelAmount || 0).toLocaleString()}`,
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 8,
      halign: "right",
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 4. Section 2 & 3 Side by side or stacked: Products and Expenses
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  // Section 2: Products & Mobil Oil
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("2. MOBIL OIL & SHOP SALES", 14, currentY);
  currentY += 4;

  const productRows = (data?.productSales || []).map((ps: any) => [
    ps.productName || "Product",
    `${ps.qty} pcs`,
    `Rs. ${(ps.total || 0).toLocaleString()}`,
    `+Rs. ${(ps.profit || 0).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: "striped",
    head: [["Product Name", "Quantity", "Sale Amount (Rs)", "Profit (Rs)"]],
    body: productRows.length > 0 ? productRows : [["No product sales recorded for this date", "", "", ""]],
    headStyles: {
      fillColor: [13, 148, 136], // Teal 600
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold", textColor: [16, 122, 65] },
    },
    foot: [
      [
        "Total Product Sales",
        "",
        `Rs. ${(data?.summary?.totalProductSales || 0).toLocaleString()}`,
        `Rs. ${(data?.summary?.totalProductProfit || 0).toLocaleString()}`,
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 8,
      halign: "right",
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Section 3: Expenses
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("3. DAILY EXPENSES (KHARCHA)", 14, currentY);
  currentY += 4;

  const expenseRows = (data?.expenses || []).map((ex: any) => [
    ex.type || "Expense",
    ex.note || "—",
    `Rs. ${(ex.amount || 0).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: "striped",
    head: [["Expense Category", "Note / Details", "Amount (Rs)"]],
    body: expenseRows.length > 0 ? expenseRows : [["No expenses recorded for this date", "", ""]],
    headStyles: {
      fillColor: [225, 29, 72], // Rose 600
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      2: { halign: "right", fontStyle: "bold", textColor: [225, 29, 72] },
    },
    foot: [
      [
        "Total Daily Expenses",
        "",
        `Rs. ${(data?.summary?.totalExpenses || 0).toLocaleString()}`,
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 8,
      halign: "right",
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Signatures
  if (currentY > 255) {
    doc.addPage();
    currentY = 30;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY + 10, 60, currentY + 10);
  doc.line(80, currentY + 10, 130, currentY + 10);
  doc.line(150, currentY + 10, 196, currentY + 10);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Prepared By (Cashier)", 14, currentY + 15);
  doc.text("Checked By (Manager)", 80, currentY + 15);
  doc.text("Approved By (Owner)", 150, currentY + 15);

  doc.save(`Nexeta-Daily-Audit-${formattedDate}.pdf`);
}

/**
 * Generates and downloads Monthly Audit PDF report
 */
export function downloadMonthlyAuditPDF(data: any, monthStr: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("NEXETA PETROL", 14, 13);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("PUMP MANAGEMENT SYSTEM - MONTHLY AUDIT REPORT", 14, 20);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Month: ${monthStr}`, 210 - 14, 14, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Timezone: Pakistan Standard Time", 210 - 14, 20, { align: "right" });

  let currentY = 34;

  if (data?.monthlyTotals) {
    const m = data.monthlyTotals;
    const isProfit = m.netProfit >= 0;

    autoTable(doc, {
      startY: currentY,
      theme: "grid",
      head: [
        [
          "Monthly Fuel Litres",
          "Monthly Revenue",
          "Monthly Expenses",
          "Net Profit / Loss",
        ],
      ],
      body: [
        [
          `${formatLitres(m.fuelLitres)}\nRs. ${m.fuelAmount?.toLocaleString()}`,
          `Rs. ${m.totalSales?.toLocaleString()}`,
          `Rs. ${m.expenseAmount?.toLocaleString()}`,
          `Rs. ${m.netProfit?.toLocaleString()}\n(${isProfit ? "PROFIT" : "LOSS"})`,
        ],
      ],
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        fontSize: 10,
        fontStyle: "bold",
        halign: "center",
        cellPadding: 4,
      },
      columnStyles: {
        3: {
          textColor: isProfit ? [16, 122, 65] : [220, 38, 38],
        },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("DAY-BY-DAY BREAKDOWN", 14, currentY);
  currentY += 4;

  const dayRows = (data?.dailyBreakdown || []).map((row: any) => [
    formatDate(row.date),
    formatLitres(row.fuelLitres),
    `Rs. ${row.fuelAmount?.toLocaleString()}`,
    `Rs. ${row.productAmount?.toLocaleString()}`,
    `Rs. ${row.totalSales?.toLocaleString()}`,
    `Rs. ${row.expenseAmount?.toLocaleString()}`,
    `Rs. ${row.netProfit?.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: "striped",
    head: [
      [
        "Date",
        "Fuel (L)",
        "Fuel Rs",
        "Shop Rs",
        "Total Sale",
        "Expense Rs",
        "Net Profit",
      ],
    ],
    body: dayRows,
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
      5: { halign: "right", textColor: [225, 29, 72] },
      6: { halign: "right", fontStyle: "bold", textColor: [16, 122, 65] },
    },
  });

  doc.save(`Nexeta-Monthly-Audit-${monthStr}.pdf`);
}

/**
 * Generates and downloads Tank Khata (Dip Report) PDF
 */
export function downloadTankKhataPDF(records: any[], dateStr: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const formattedDate = formatDate(dateStr);

  doc.setFillColor(15, 118, 110); // Teal 700
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("NEXETA PETROL", 14, 13);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("DAILY TANK KHATA & DIP AUDIT REPORT (روزانہ ٹینک کھاتہ)", 14, 20);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Date: ${formattedDate} (Asia/Karachi)`, 210 - 14, 14, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Dip Chart vs Book Stock Reconciliation", 210 - 14, 20, { align: "right" });

  let currentY = 34;

  const dieselList = records.filter((r) => r.fuel_type === "Diesel");
  const petrolList = records.filter((r) => r.fuel_type === "Petrol" || r.fuel_type === "HiOctane");

  // Diesel Table
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("1. HIGH SPEED DIESEL KHATA (ڈیزل ٹینک کھاتہ)", 14, currentY);
  currentY += 4;

  const dieselRows = dieselList.map((r) => [
    formatDate(r.date),
    r.tankName || "Diesel Tank",
    `${r.dip_value} ${r.dip_unit || "in"}`,
    `${(r.dip_litres || 0).toLocaleString()} L`,
    `${(r.tank_stock || 0).toLocaleString()} L`,
    `${(r.register_stock || 0).toLocaleString()} L`,
    `${r.gain_loss > 0 ? "+" : ""}${r.gain_loss} L`,
    r.remarks || "—",
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: "striped",
    head: [
      [
        "Date",
        "Tank",
        "Dip",
        "Dip Chart",
        "Tank Stock",
        "Register Stock",
        "Gain/Loss",
        "Remarks",
      ],
    ],
    body: dieselRows.length > 0 ? dieselRows : [["No diesel khata entries found", "", "", "", "", "", "", ""]],
    headStyles: {
      fillColor: [217, 119, 6], // Amber 600
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      2: { halign: "center", fontStyle: "bold" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
      5: { halign: "right" },
      6: { halign: "right", fontStyle: "bold" },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Petrol Table
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("2. SUPER PETROL KHATA (پیٹرول ٹینک کھاتہ)", 14, currentY);
  currentY += 4;

  const petrolRows = petrolList.map((r) => [
    formatDate(r.date),
    r.tankName || "Petrol Tank",
    `${r.dip_value} ${r.dip_unit || "in"}`,
    `${(r.dip_litres || 0).toLocaleString()} L`,
    `${(r.tank_stock || 0).toLocaleString()} L`,
    `${(r.register_stock || 0).toLocaleString()} L`,
    `${r.gain_loss > 0 ? "+" : ""}${r.gain_loss} L`,
    r.remarks || "—",
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: "striped",
    head: [
      [
        "Date",
        "Tank",
        "Dip",
        "Dip Chart",
        "Tank Stock",
        "Register Stock",
        "Gain/Loss",
        "Remarks",
      ],
    ],
    body: petrolRows.length > 0 ? petrolRows : [["No petrol khata entries found", "", "", "", "", "", "", ""]],
    headStyles: {
      fillColor: [13, 148, 136], // Teal 600
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      2: { halign: "center", fontStyle: "bold" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
      5: { halign: "right" },
      6: { halign: "right", fontStyle: "bold" },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Signatures
  if (currentY > 255) {
    doc.addPage();
    currentY = 30;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY + 10, 60, currentY + 10);
  doc.line(80, currentY + 10, 130, currentY + 10);
  doc.line(150, currentY + 10, 196, currentY + 10);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Dip Taken By (Shift Incharge)", 14, currentY + 15);
  doc.text("Verified By (Manager)", 80, currentY + 15);
  doc.text("Pump Owner", 150, currentY + 15);

  doc.save(`Nexeta-Tank-Khata-${formattedDate}.pdf`);
}

/**
 * Generates and downloads Daily Cash Closing / Shift Handover PDF
 */
export function downloadCashClosingPDF(closings: any[], targetDate: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const formattedDate = formatDate(targetDate);

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("NEXETA PETROL - CASH CLOSING AUDIT", 14, 13);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("DAILY CASH SHIFT HANDOVER & RECONCILIATION REPORT", 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Date: ${formattedDate} (Asia/Karachi)`, 210 - 14, 14, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Official Pump Audit Record", 210 - 14, 20, { align: "right" });

  let currentY = 34;

  const rows = closings.map((c, idx) => {
    const diff = c.difference_rs || 0;
    const diffText = diff >= 0 ? `+Rs. ${diff.toLocaleString()}` : `-Rs. ${Math.abs(diff).toLocaleString()}`;
    return [
      c.date,
      c.shift,
      `Rs. ${(c.total_sale_rs || 0).toLocaleString()}`,
      `Rs. ${(c.total_udhar_rs || 0).toLocaleString()}`,
      `Rs. ${(c.total_kharcha_rs || 0).toLocaleString()}`,
      `Rs. ${(c.expected_cash_in_hand || 0).toLocaleString()}`,
      `Rs. ${(c.actual_cash_submitted_rs || 0).toLocaleString()}`,
      diffText,
      `${c.submitted_by || "—"} -> ${c.receiver_name || "—"}`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    theme: "grid",
    head: [
      [
        "Date",
        "Shift",
        "Total Sale",
        "Udhar",
        "Kharcha",
        "Expected Cash",
        "Actual Cash",
        "Difference",
        "Handed Over By -> To",
      ],
    ],
    body: rows.length > 0 ? rows : [["No cash closings recorded", "", "", "", "", "", "", "", ""]],
    headStyles: {
      fillColor: [109, 40, 217], // Violet 700
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      2: { halign: "right", fontStyle: "bold" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
      6: { halign: "right", fontStyle: "bold" },
      7: { halign: "right", fontStyle: "bold" },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  if (currentY > 255) {
    doc.addPage();
    currentY = 30;
  }

  // Signatures
  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY + 10, 65, currentY + 10);
  doc.line(80, currentY + 10, 130, currentY + 10);
  doc.line(145, currentY + 10, 196, currentY + 10);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Shift Incharge / Cashier", 14, currentY + 15);
  doc.text("Audited By (Manager)", 80, currentY + 15);
  doc.text("Pump Owner Signature", 145, currentY + 15);

  doc.save(`Nexeta-Cash-Closing-${formattedDate}.pdf`);
}
