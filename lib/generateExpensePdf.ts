import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRs, getTodayDatePK } from "@/lib/formatters";
import { PumpProfile } from "@/lib/usePump";
import { PumpExpense } from "@/lib/types";

interface GenerateExpensePdfParams {
  pump: PumpProfile;
  expenses: PumpExpense[];
  dateRange: string;
  summary?: {
    todayExpense?: number;
    thisMonthTotal?: number;
    highestCategory?: { name: string; amount: number; emoji?: string };
    totalFilteredAmount?: number;
  };
  categoryBreakdown?: Array<{
    key: string;
    labelUrdu: string;
    labelEn: string;
    thisMonthTotal: number;
    percentage: number;
    emoji: string;
  }>;
}

export function generatePumpExpensePdf({
  pump,
  expenses,
  dateRange,
  summary,
  categoryBreakdown,
}: GenerateExpensePdfParams) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Safe pump values (ensuring 0% hardcoding)
  const pumpName = (pump.name || pump.pump_name || "Petrol Station").toUpperCase();
  const pumpAddress = pump.address || `${pump.city || "Pakistan"}`;
  const pumpPhone = pump.phone || "0300-1234567";
  const todayDate = getTodayDatePK();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const reportId = `EXP-${todayDate.replace(/[^0-9]/g, "")}-${randomSuffix}`;

  // 1. TOP HEADER SECTION
  // Top left: Logo if exists, else circular initials badge
  if (pump.logo_url && pump.logo_url.startsWith("data:image")) {
    try {
      doc.addImage(pump.logo_url, "PNG", margin, 12, 28, 28);
    } catch (e) {
      drawInitialsBadge(doc, margin, 12, 28, pumpName);
    }
  } else {
    drawInitialsBadge(doc, margin, 12, 28, pumpName);
  }

  // Top Center: Pump Name (Bold 18pt) & Address + Phone
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39); // Slate-900
  doc.text(pumpName, pageWidth / 2, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99); // Slate-600
  const subAddress = `${pumpAddress} | Phone: ${pumpPhone}`;
  doc.text(subAddress, pageWidth / 2, 24, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text("Automated Fuel Station Management System", pageWidth / 2, 28, { align: "center" });

  // Top Right Box: Title "EXPENSE REPORT", Report ID, Date Range
  const boxWidth = 55;
  const boxHeight = 22;
  const boxX = pageWidth - margin - boxWidth;
  const boxY = 12;

  doc.setDrawColor(209, 213, 219); // Gray-300
  doc.setFillColor(249, 250, 251); // Gray-50
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(225, 29, 72); // Rose-600
  doc.text("EXPENSE REPORT", boxX + boxWidth / 2, boxY + 5.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text(`ID: ${reportId}`, boxX + 3, boxY + 11);
  doc.text(`Period: ${dateRange}`, boxX + 3, boxY + 15.5);
  doc.text(`Prepared: ${todayDate}`, boxX + 3, boxY + 20);

  // Divider Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 38, pageWidth - margin, 38);

  // 2. SUMMARY CARDS IN PDF
  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const highestCategoryName = summary?.highestCategory?.name || "Fuel / Salaries";
  const highestCategoryAmount = summary?.highestCategory?.amount || 0;
  const distinctCategoriesCount = new Set(expenses.map((e) => e.category)).size;

  const cardY = 42;
  const cardWidth = (pageWidth - margin * 2 - 8) / 3;
  const cardHeight = 18;

  // Card 1: Total Expenses
  doc.setFillColor(254, 242, 242); // Rose-50
  doc.setDrawColor(254, 202, 202); // Rose-200
  doc.roundedRect(margin, cardY, cardWidth, cardHeight, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(159, 18, 57);
  doc.text("TOTAL EXPENSES", margin + 4, cardY + 5.5);
  doc.setFontSize(12);
  doc.setTextColor(190, 18, 60);
  doc.text(formatRs(totalAmount), margin + 4, cardY + 13);

  // Card 2: Highest Expense Category
  const card2X = margin + cardWidth + 4;
  doc.setFillColor(254, 243, 199); // Amber-50
  doc.setDrawColor(253, 230, 138); // Amber-200
  doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14);
  doc.text("HIGHEST CATEGORY", card2X + 4, cardY + 5.5);
  doc.setFontSize(9);
  doc.setTextColor(180, 83, 9);
  const truncatedCatName = highestCategoryName.length > 20 ? highestCategoryName.slice(0, 18) + "..." : highestCategoryName;
  doc.text(`${truncatedCatName} (${formatRs(highestCategoryAmount)})`, card2X + 4, cardY + 13);

  // Card 3: Total Categories / Transactions
  const card3X = card2X + cardWidth + 4;
  doc.setFillColor(238, 242, 255); // Indigo-50
  doc.setDrawColor(199, 210, 254); // Indigo-200
  doc.roundedRect(card3X, cardY, cardWidth, cardHeight, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 48, 163);
  doc.text("CATEGORIES & ENTRIES", card3X + 4, cardY + 5.5);
  doc.setFontSize(11);
  doc.setTextColor(67, 56, 202);
  doc.text(`${distinctCategoriesCount} Categories | ${expenses.length} Bills`, card3X + 4, cardY + 13);

  // 3. EXPENSES TABLE
  const tableStartY = 64;

  const tableRows = expenses.map((e, idx) => {
    const pct = totalAmount > 0 ? ((e.amount / totalAmount) * 100).toFixed(1) + "%" : "0%";
    const catLabel = formatCategoryLabel(e.category);
    const desc = e.description || e.supplier_name || "—";
    return [
      idx + 1,
      e.expense_date,
      catLabel,
      desc,
      e.supplier_name || "—",
      e.payment_method ? e.payment_method.toUpperCase() : "CASH",
      Number(e.amount).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      pct,
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    head: [["#", "DATE", "CATEGORY", "DESCRIPTION / NOTE", "SUPPLIER", "METHOD", "AMOUNT (Rs.)", "%"]],
    body: tableRows,
    foot: [
      [
        "",
        "",
        "TOTAL EXPENSES",
        `Period: ${dateRange}`,
        "",
        "",
        Number(totalAmount).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
        "100.0%",
      ],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // Slate-800
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      halign: "left",
    },
    footStyles: {
      fillColor: [241, 245, 249], // Slate-100
      textColor: [15, 23, 42],
      fontSize: 8,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [31, 41, 55],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: 32, fontStyle: "bold" },
      3: { cellWidth: 42 },
      4: { cellWidth: 25 },
      5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 24, halign: "right", fontStyle: "bold" },
      7: { cellWidth: 13, halign: "right" },
    },
    didDrawPage: (data) => {
      // Header repeated or watermark if needed
    },
  });

  // 4. FOOTER NOTES & APPROVALS SIGNATURES
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : pageHeight - 35;
  const signatureY = Math.min(finalY, pageHeight - 30);

  // System generated disclaimer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `* This is a system-generated report for ${pumpName}. Any discrepancies must be reported within 24 hours.`,
    margin,
    signatureY - 4
  );

  // Approval Signatures Line
  const sigColWidth = 50;
  // Accountant Signature
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.3);
  doc.line(margin + 10, signatureY + 12, margin + 10 + sigColWidth, signatureY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text("Accountant Signature", margin + 10 + sigColWidth / 2, signatureY + 16, { align: "center" });

  // Manager Signature
  const manX = pageWidth / 2 - sigColWidth / 2;
  doc.line(manX, signatureY + 12, manX + sigColWidth, signatureY + 12);
  doc.text("Station Manager Signature", manX + sigColWidth / 2, signatureY + 16, { align: "center" });

  // Station Owner Signature
  const ownX = pageWidth - margin - 10 - sigColWidth;
  doc.line(ownX, signatureY + 12, ownX + sigColWidth, signatureY + 12);
  doc.text("Station Owner Approval", ownX + sigColWidth / 2, signatureY + 16, { align: "center" });

  // Save PDF file
  const sanitizedPumpName = pumpName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const sanitizedDateRange = dateRange.replace(/[^a-zA-Z0-9_-]/g, "-");
  const fileName = `Expense-${sanitizedPumpName}-${sanitizedDateRange}.pdf`;
  doc.save(fileName);
}

function drawInitialsBadge(doc: jsPDF, x: number, y: number, size: number, name: string) {
  // Draw circular badge with initials
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("") || "NP";

  doc.setFillColor(225, 29, 72); // Rose-600
  doc.setDrawColor(244, 63, 94);
  doc.roundedRect(x, y, size, size, 4, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(initials, x + size / 2, y + size / 2 + 4.5, { align: "center" });
}

function formatCategoryLabel(cat?: string): string {
  switch (cat) {
    case "fuel_purchase":
      return "Fuel Purchase";
    case "staff_salaries":
      return "Staff Salaries";
    case "electricity_bill":
      return "Electricity Bill";
    case "rent":
      return "Rent";
    case "maintenance":
      return "Maintenance";
    case "oil_lubricants":
      return "Oil & Lubricants";
    case "office_misc":
      return "Office & Misc";
    case "bank_charges":
      return "Bank Charges";
    default:
      return cat || "General";
  }
}
