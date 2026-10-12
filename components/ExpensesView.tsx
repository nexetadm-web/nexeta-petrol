"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Plus,
  Calendar,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  Camera,
  Image as ImageIcon,
  X,
  TrendingDown,
  Wallet,
  Printer,
  Sparkles,
  Phone,
  MapPin,
  Edit3,
  Building2
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { formatRs, getTodayDatePK, formatDate } from "@/lib/formatters";
import { usePump, PumpProfile } from "@/lib/usePump";
import { PumpExpense, ExpenseCategory, PaymentMethod } from "@/lib/types";
import { generatePumpExpensePdf } from "@/lib/generateExpensePdf";

const CATEGORY_META: Record<ExpenseCategory, { labelUrdu: string; labelEn: string; emoji: string; color: string; bg: string }> = {
  fuel_purchase: { labelUrdu: "تیل خریداری", labelEn: "Fuel Purchase", emoji: "⛽", color: "#f59e0b", bg: "bg-amber-50 text-amber-800 border-amber-200" },
  staff_salaries: { labelUrdu: "سٹاف تنخواہیں", labelEn: "Staff Salaries", emoji: "👨‍🔧", color: "#8b5cf6", bg: "bg-purple-50 text-purple-800 border-purple-200" },
  electricity_bill: { labelUrdu: "بجلی کا بل", labelEn: "Electricity Bill", emoji: "💡", color: "#3b82f6", bg: "bg-blue-50 text-blue-800 border-blue-200" },
  rent: { labelUrdu: "کرایہ پمپ", labelEn: "Rent", emoji: "🏠", color: "#6366f1", bg: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  maintenance: { labelUrdu: "مرمت و مینٹیننس", labelEn: "Maintenance", emoji: "🔧", color: "#ec4899", bg: "bg-pink-50 text-pink-800 border-pink-200" },
  oil_lubricants: { labelUrdu: "موبل آئل و سامان", labelEn: "Oil & Lubricants", emoji: "🛢️", color: "#14b8a6", bg: "bg-teal-50 text-teal-800 border-teal-200" },
  office_misc: { labelUrdu: "دفتر و متفرق", labelEn: "Office & Misc", emoji: "☕", color: "#f97316", bg: "bg-orange-50 text-orange-800 border-orange-200" },
  bank_charges: { labelUrdu: "بینک چارجز", labelEn: "Bank Charges", emoji: "🏦", color: "#64748b", bg: "bg-slate-50 text-slate-800 border-slate-200" },
};

const ALL_CATEGORY_KEYS: ExpenseCategory[] = [
  "fuel_purchase",
  "staff_salaries",
  "electricity_bill",
  "rent",
  "maintenance",
  "oil_lubricants",
  "office_misc",
  "bank_charges",
];

export default function ExpensesView({ forcedPumpId }: { forcedPumpId?: string }) {
  const router = useRouter();
  const { pump, loading: pumpLoading, refreshPump } = usePump();
  const currentPumpId = forcedPumpId || pump?.id || 1;

  // Data states
  const [expenses, setExpenses] = useState<PumpExpense[]>([]);
  const [summary, setSummary] = useState({
    todayExpense: 0,
    thisMonthTotal: 0,
    highestCategory: { name: "کوئی نہیں", category: "none", amount: 0, emoji: "📊" },
    todaySale: 0,
    cashInHand: 0,
    totalEntries: 0,
    filteredCount: 0,
    totalFilteredAmount: 0,
  });
  const [categoryCards, setCategoryCards] = useState<any[]>([]);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  const [pieChartData, setPieChartData] = useState<any[]>([]);
  const [dailyTrend, setDailyTrend] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Filter states
  const [period, setPeriod] = useState<"today" | "week" | "month" | "last_month" | "custom" | "all">("month");
  const [customStart, setCustomStart] = useState<string>(getTodayDatePK());
  const [customEnd, setCustomEnd] = useState<string>(getTodayDatePK());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Chart view toggle
  const [chartView, setChartView] = useState<"bar" | "pie" | "trend">("bar");

  // Modal: Add Expense
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("electricity_bill");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(getTodayDatePK());
  const [formSupplier, setFormSupplier] = useState<string>("");
  const [formBillNo, setFormBillNo] = useState<string>("");
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>("cash");
  const [formDesc, setFormDesc] = useState<string>("");
  const [billImage, setBillImage] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Modal: Bill Image Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Modal: Edit Pump Profile (for testing dynamic pump header)
  const [showPumpModal, setShowPumpModal] = useState<boolean>(false);
  const [editPumpName, setEditPumpName] = useState<string>("");
  const [editPumpPhone, setEditPumpPhone] = useState<string>("");
  const [editPumpAddress, setEditPumpAddress] = useState<string>("");
  const [editPumpLogo, setEditPumpLogo] = useState<string>("");
  const [savingPump, setSavingPump] = useState<boolean>(false);

  // Fetch expense data
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      let url = `/api/pumps/${currentPumpId}/pump-expenses?period=${period}`;
      if (period === "custom") {
        url += `&start_date=${customStart}&end_date=${customEnd}`;
      }
      if (selectedCategory && selectedCategory !== "all") {
        url += `&category=${selectedCategory}`;
      }
      if (supplierFilter && supplierFilter.trim() !== "") {
        url += `&supplier=${encodeURIComponent(supplierFilter.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "اخراجات لوڈ نہیں ہو سکے");
      }

      setExpenses(data.expenses || []);
      setSummary(data.summary || {
        todayExpense: 0,
        thisMonthTotal: 0,
        highestCategory: { name: "کوئی نہیں", category: "none", amount: 0, emoji: "📊" },
        todaySale: 0,
        cashInHand: 0,
        totalEntries: 0,
        filteredCount: 0,
        totalFilteredAmount: 0,
      });
      setCategoryCards(data.categoryCards || []);
      setBarChartData(data.barChartData || []);
      setPieChartData(data.pieChartData || []);
      setDailyTrend(data.dailyTrend || []);
    } catch (err: any) {
      console.error("fetchExpenses error:", err);
      setErrorMsg(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPumpId, period, customStart, customEnd, selectedCategory, supplierFilter]);

  // Handle Image Upload for Bill
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("تصویر کا سائز 2MB سے کم ہونا چاہیے");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Optimistic Add Expense (<200ms)
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("درست رقم درج کریں");
      return;
    }

    const todayStr = getTodayDatePK();
    const tempId = Date.now();

    const newExpenseObj: PumpExpense = {
      id: tempId,
      pump_id: Number(currentPumpId),
      category: formCategory,
      amount: amt,
      description: formDesc || "خرچہ",
      expense_date: formDate || todayStr,
      supplier_name: formSupplier || null,
      bill_no: formBillNo || null,
      payment_method: formPaymentMethod,
      bill_image_url: billImage || null,
      created_at: new Date().toISOString(),
    };

    // 1. Optimistic instant state update (<200ms)
    setExpenses((prev) => [newExpenseObj, ...prev]);
    setSummary((prev) => ({
      ...prev,
      todayExpense: formDate === todayStr ? prev.todayExpense + amt : prev.todayExpense,
      thisMonthTotal: prev.thisMonthTotal + amt,
      totalEntries: prev.totalEntries + 1,
      filteredCount: prev.filteredCount + 1,
      totalFilteredAmount: prev.totalFilteredAmount + amt,
      cashInHand: Math.max(0, prev.cashInHand - (formDate === todayStr ? amt : 0)),
    }));

    // Optimistically update categoryCards
    setCategoryCards((prev) =>
      prev.map((c) => {
        if (c.key === formCategory) {
          const newTotal = c.thisMonthTotal + amt;
          return {
            ...c,
            thisMonthTotal: newTotal,
            transactionCount: c.transactionCount + 1,
            recentTransactions: [newExpenseObj, ...(c.recentTransactions || []).slice(0, 2)],
          };
        }
        return c;
      })
    );

    setShowAddModal(false);
    setSuccessMsg("خرچہ فوری درج کر دیا گیا! (Optimistic Save <200ms)");
    setTimeout(() => setSuccessMsg(""), 3500);

    // 2. Background server request
    try {
      setSaving(true);
      const res = await fetch(`/api/pumps/${currentPumpId}/pump-expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formCategory,
          amount: amt,
          expense_date: formDate,
          supplier_name: formSupplier,
          bill_no: formBillNo,
          payment_method: formPaymentMethod,
          description: formDesc,
          bill_image_url: billImage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "سرور پر محفوظ کرنے میں خرابی");
      }

      // Reset form
      setFormAmount("");
      setFormDesc("");
      setFormSupplier("");
      setFormBillNo("");
      setBillImage("");
      fetchData(); // Sync with actual database ID
    } catch (err: any) {
      console.error("Save expense error:", err);
      setErrorMsg(err.message || "سرور کی خرابی");
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  // Delete Expense
  const handleDelete = async (id: number) => {
    if (!confirm("کیا آپ واقعی اس خرچے کو حذف کرنا چاہتے ہیں؟")) return;

    const deletedExp = expenses.find((e) => e.id === id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (deletedExp) {
      setSummary((prev) => ({
        ...prev,
        thisMonthTotal: Math.max(0, prev.thisMonthTotal - deletedExp.amount),
        totalFilteredAmount: Math.max(0, prev.totalFilteredAmount - deletedExp.amount),
      }));
    }

    try {
      const res = await fetch(`/api/pumps/${currentPumpId}/pump-expenses?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "حذف نہیں ہو سکا");
      }
      setSuccessMsg("خرچہ کامیابی سے حذف کر دیا گیا");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "حذف کرنے میں خرابی");
      fetchData();
    }
  };

  // Filtered expenses for client search
  const displayedExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (e.description || "").toLowerCase().includes(term) ||
        (e.supplier_name || "").toLowerCase().includes(term) ||
        (e.bill_no || "").toLowerCase().includes(term) ||
        (e.category || "").toLowerCase().includes(term)
      );
    });
  }, [expenses, searchTerm]);

  // Export PDF Handler (Uses dynamic usePump values)
  const handleExportPdf = () => {
    const dateRangeLabel =
      period === "today"
        ? `آج (${getTodayDatePK()})`
        : period === "month"
        ? `رواں ماہ (${getTodayDatePK().split("-").slice(1).join("-")})`
        : period === "last_month"
        ? "پچھلا مہینہ"
        : period === "week"
        ? "یہ ہفتہ"
        : period === "custom"
        ? `${customStart} تا ${customEnd}`
        : "تمام ریکارڈز";

    generatePumpExpensePdf({
      pump,
      expenses: displayedExpenses,
      dateRange: dateRangeLabel,
      summary: {
        todayExpense: summary.todayExpense,
        thisMonthTotal: summary.thisMonthTotal,
        highestCategory: summary.highestCategory,
        totalFilteredAmount: summary.totalFilteredAmount,
      },
      categoryBreakdown: categoryCards,
    });
  };

  // Export Excel / CSV Handler (Uses dynamic usePump values)
  const handleExportCsv = () => {
    const dateRangeLabel =
      period === "today"
        ? `Today (${getTodayDatePK()})`
        : period === "month"
        ? "Current Month"
        : period === "last_month"
        ? "Last Month"
        : period === "custom"
        ? `${customStart} to ${customEnd}`
        : "All Period";

    const pumpTitle = (pump.name || pump.pump_name || "Petrol Station").replace(/,/g, " ");
    const pumpAddr = (pump.address || `${pump.city}, Pakistan`).replace(/,/g, " ");
    const pumpPh = (pump.phone || "").replace(/,/g, " ");

    const csvRows: string[] = [];
    csvRows.push(`"STATION: ${pumpTitle}"`);
    csvRows.push(`"ADDRESS: ${pumpAddr} | PHONE: ${pumpPh}"`);
    csvRows.push(`"EXPENSE REPORT - PERIOD: ${dateRangeLabel} | GENERATED: ${getTodayDatePK()}"`);
    csvRows.push(`""`);

    csvRows.push([
      `"#"`,
      `"Date"`,
      `"Category"`,
      `"Description"`,
      `"Supplier / Vendor"`,
      `"Bill No"`,
      `"Payment Method"`,
      `"Amount (Rs.)"`,
    ].join(","));

    displayedExpenses.forEach((e, idx) => {
      const catMeta = CATEGORY_META[e.category as ExpenseCategory] || { labelEn: e.category };
      const safeDesc = (e.description || "").replace(/"/g, '""');
      const safeSupplier = (e.supplier_name || "—").replace(/"/g, '""');
      const safeBill = (e.bill_no || "—").replace(/"/g, '""');
      const safeMethod = (e.payment_method || "cash").toUpperCase();

      csvRows.push([
        idx + 1,
        `"${e.expense_date}"`,
        `"${catMeta.labelEn}"`,
        `"${safeDesc}"`,
        `"${safeSupplier}"`,
        `"${safeBill}"`,
        `"${safeMethod}"`,
        Number(e.amount).toFixed(2),
      ].join(","));
    });

    const totalAmt = displayedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    csvRows.push(`""`);
    csvRows.push([
      `""`,
      `"TOTAL"`,
      `""`,
      `"Total Filtered Expenses"`,
      `""`,
      `""`,
      `""`,
      Number(totalAmt).toFixed(2),
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    const safeFilename = `${pumpTitle.replace(/\s+/g, "_")}_Expenses_${getTodayDatePK()}.csv`;
    link.setAttribute("href", csvContent);
    link.setAttribute("download", safeFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Edit Pump Profile modal
  const handleOpenPumpModal = () => {
    setEditPumpName(pump.name || pump.pump_name || "");
    setEditPumpPhone(pump.phone || "");
    setEditPumpAddress(pump.address || "");
    setEditPumpLogo(pump.logo_url || "");
    setShowPumpModal(true);
  };

  // Save updated pump profile (immediate reflection in UI & PDF)
  const handleSavePumpProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPump(true);
      const res = await fetch(`/api/pumps/${currentPumpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pump_name: editPumpName,
          phone: editPumpPhone,
          address: editPumpAddress,
          logo_url: editPumpLogo,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "پمپ سیو نہیں ہو سکا");
      }

      await refreshPump();
      setShowPumpModal(false);
      setSuccessMsg(`پمپ کا نام "${editPumpName}" کامیابی سے محفوظ ہو گیا! اب PDF اور رپورٹس میں یہی ظاہر ہو گا۔`);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "خرابی");
    } finally {
      setSavingPump(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-2 sm:px-4">
      {/* 1. DYNAMIC TOP STATION HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {pump.logo_url ? (
              <img
                src={pump.logo_url}
                alt={pump.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md bg-white/10 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 text-white font-black text-2xl flex items-center justify-center border-2 border-white/20 shadow-md shrink-0">
                {(pump.name || "NP").slice(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>{pump.name || pump.pump_name}</span>
                </h1>
                <span className="px-3 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-bold">
                  اخراجات مینیجر (Expense Tracker)
                </span>
                <button
                  onClick={handleOpenPumpModal}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-medium border border-white/10 transition-colors"
                  title="پمپ کا نام یا پتہ تبدیل کریں"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>پروفائل میں ترمیم</span>
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{pump.address || `${pump.city}, Pakistan`}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{pump.phone}</span>
                </span>
                <span className="text-slate-400 font-mono">
                  آج: {getTodayDatePK()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 shadow-sm transition-all"
              title="ریفریش کریں"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 shadow-sm transition-all"
              title="ڈائنامک پمپ ہیڈر کے ساتھ PDF رپورٹ ڈاؤن لوڈ کریں"
            >
              <Printer className="w-4 h-4 text-rose-300" />
              <span>PDF پرنٹ رپورٹ</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 shadow-sm transition-all"
              title="Excel / CSV رپورٹ برآمد کریں"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Excel ایکسپورٹ</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-black shadow-lg hover:shadow-rose-600/30 transition-all hover:scale-102"
            >
              <Plus className="w-4 h-4" />
              <span>+ نیا خرچہ درج کریں</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. TOP 4 METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today Expense */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-2 h-full bg-rose-500 rounded-r-3xl" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              آج کا کل خرچہ (Today Expense)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-2 font-mono">
            {formatRs(summary.todayExpense)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            آج کے 24 گھنٹوں کے اخراجات
          </div>
        </div>

        {/* Card 2: This Month Total */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-2 h-full bg-amber-500 rounded-r-3xl" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              اس مہینے کا کل خرچہ (Month Total)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">
            {formatRs(summary.thisMonthTotal)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            رواں ماہ کے تمام کٹیگریز
          </div>
        </div>

        {/* Card 3: Highest Category */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500 rounded-r-3xl" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              سب سے بڑا خرچہ (Highest Category)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
              <span>{summary.highestCategory?.emoji || "📊"}</span>
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-indigo-950 mt-2 truncate">
            {summary.highestCategory?.name || "کوئی نہیں"}
          </div>
          <div className="text-[11px] text-indigo-600 font-mono font-bold mt-1">
            رقم: {formatRs(summary.highestCategory?.amount || 0)}
          </div>
        </div>

        {/* Card 4: Cash in Hand (sale - expenses) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 rounded-r-3xl" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              کیش ان ہینڈ (Cash In Hand)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2 font-mono">
            {formatRs(summary.cashInHand)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            سیلز منہا اخراجات (باقی کیش)
          </div>
        </div>
      </div>

      {/* 3. REAL-TIME 8 CATEGORY CARDS GRID */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>کیٹیگری وائز ریئل ٹائم تجزیہ (8 Categories Live)</span>
            </h2>
            <p className="text-xs text-slate-500">
              رواں ماہ ہر شعبے میں ہونے والے کل اخراجات، فیصد اور آخری 3 انٹریز
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categoryCards.map((cat) => {
            const meta = CATEGORY_META[cat.key as ExpenseCategory] || {
              labelUrdu: cat.labelUrdu,
              labelEn: cat.labelEn,
              emoji: cat.emoji || "📁",
              color: cat.color || "#64748b",
              bg: "bg-slate-50 text-slate-800 border-slate-200",
            };
            return (
              <div
                key={cat.key}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{meta.emoji}</span>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 leading-tight">
                            {cat.labelUrdu}
                          </h3>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {cat.labelEn}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-xs font-mono font-black px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                    >
                      {cat.percentage}%
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="text-xl font-black text-slate-900 font-mono">
                      {formatRs(cat.thisMonthTotal)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      رواں ماہ {cat.transactionCount || 0} رسیدیں
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, cat.percentage)}%`,
                        backgroundColor: meta.color,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    آخری رسیدیں (Recent Bills)
                  </div>
                  {cat.recentTransactions && cat.recentTransactions.length > 0 ? (
                    <div className="space-y-1">
                      {cat.recentTransactions.slice(0, 3).map((t: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50/80 px-2 py-1 rounded-lg"
                        >
                          <span className="truncate max-w-[120px] font-medium">
                            {t.description || t.supplier_name || "خرچہ"}
                          </span>
                          <span className="font-mono font-bold text-slate-900 shrink-0">
                            {formatRs(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic py-1">
                      کوئی ریکارڈ نہیں
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CHARTS SECTION */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-indigo-600" />
              <span>اخراجات کے چارٹس و گراف (Expense Analytics)</span>
            </h3>
            <p className="text-xs text-slate-500">
              فلٹر شدہ دورانیے کے مطابق تقابلی جائزہ
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setChartView("bar")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                chartView === "bar"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              کیٹیگری بار چارٹ
            </button>
            <button
              onClick={() => setChartView("pie")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                chartView === "pie"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              تقسیم (Pie Chart)
            </button>
            <button
              onClick={() => setChartView("trend")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                chartView === "trend"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              روزانہ ٹرینڈ لائن
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          {chartView === "bar" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(val) => `Rs ${val}`} />
                <Tooltip
                  formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`, "رقم"]}
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartView === "pie" && (
            <div className="h-full flex items-center justify-center">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={45}
                      paddingAngle={3}
                      label={({ name, percent }: any) => `${name}: ${(((percent ?? 0) as number) * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, "کل خرچہ"]}
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-400 text-xs">
                  اس مدت میں کوئی خرچہ ریکارڈ نہیں ہے
                </div>
              )}
            </div>
          )}

          {chartView === "trend" && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(val) => `Rs ${val}`} />
                <Tooltip
                  formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, "خرچہ"]}
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }}
                />
                <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: "#f43f5e" }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 5. FILTER BAR & EXPENSE TRANSACTIONS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 ml-1">مدت:</span>
              <button
                onClick={() => setPeriod("today")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === "today"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                آج (Today)
              </button>
              <button
                onClick={() => setPeriod("week")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === "week"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                یہ ہفتہ (Week)
              </button>
              <button
                onClick={() => setPeriod("month")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === "month"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                یہ مہینہ (This Month)
              </button>
              <button
                onClick={() => setPeriod("last_month")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === "last_month"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                پچھلا مہینہ (Last Month)
              </button>
              <button
                onClick={() => setPeriod("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === "all"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                تمام (All)
              </button>
              <button
                onClick={() => setPeriod("custom")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === "custom"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                کسٹم رینج
              </button>
            </div>

            <div className="flex items-center gap-2 bg-rose-50 text-rose-900 border border-rose-200 px-3.5 py-1.5 rounded-2xl text-xs font-bold">
              <span>منتخب اخراجات کا ٹوٹل:</span>
              <span className="font-mono font-black text-sm text-rose-600">
                {formatRs(summary.totalFilteredAmount)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
            <div className="flex items-center gap-2 flex-wrap">
              {period === "custom" && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 text-xs">
                  <span className="text-slate-400">از:</span>
                  <input
                    type="text"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-24 text-center font-mono font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="text-slate-400">تا:</span>
                  <input
                    type="text"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-24 text-center font-mono font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              )}

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="all">تمام 8 کیٹیگریز (All Categories)</option>
                {ALL_CATEGORY_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {CATEGORY_META[k].emoji} {CATEGORY_META[k].labelUrdu} ({CATEGORY_META[k].labelEn})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="سپلائر کا نام فلٹر کریں..."
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-44"
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="تفصیل، بل نمبر، یا نام..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-slate-900 focus:outline-none w-full"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 uppercase text-[10px] font-black border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">#</th>
                <th className="py-3 px-3">تاریخ (Date)</th>
                <th className="py-3 px-3">کیٹیگری (Category)</th>
                <th className="py-3 px-4">تفصیل (Description / Reason)</th>
                <th className="py-3 px-3">سپلائر / وینڈر</th>
                <th className="py-3 px-2 text-center">بل نمبر</th>
                <th className="py-3 px-3 text-center">ادائیگی طریقہ</th>
                <th className="py-3 px-2 text-center">رسید عکس</th>
                <th className="py-3 px-4 text-right">رقم روپے (Amount Rs.)</th>
                <th className="py-3 px-3 text-center">ایکشن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {loading && expenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-600 mb-2" />
                    اخراجات کا ریکارڈ لوڈ ہو رہا ہے...
                  </td>
                </tr>
              ) : displayedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    اس فلٹر میں کوئی خرچہ ریکارڈ نہیں ملا
                  </td>
                </tr>
              ) : (
                displayedExpenses.map((e, idx) => {
                  const meta = CATEGORY_META[e.category as ExpenseCategory] || {
                    labelUrdu: e.category,
                    labelEn: e.category,
                    emoji: "📁",
                    color: "#64748b",
                    bg: "bg-slate-100 text-slate-800 border-slate-300",
                  };
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatDate(e.expense_date)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.bg}`}>
                          <span>{meta.emoji}</span>
                          <span>{meta.labelUrdu}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium max-w-xs truncate">
                        {e.description || "—"}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-medium">
                        {e.supplier_name || "—"}
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-slate-600">
                        {e.bill_no || "—"}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                          {e.payment_method ? e.payment_method.replace("_", " ") : "CASH"}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {e.bill_image_url ? (
                          <button
                            onClick={() => setPreviewImage(e.bill_image_url || null)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>دیکھیں</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-600 text-sm whitespace-nowrap">
                        {formatRs(e.amount)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="حذف کریں"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {displayedExpenses.length > 0 && (
              <tfoot className="bg-slate-100/90 text-slate-900 font-black border-t-2 border-slate-300">
                <tr>
                  <td colSpan={8} className="py-3.5 px-4 text-left uppercase text-xs tracking-wider">
                    ٹوٹل اخراجات (Total Filtered Expenses - {displayedExpenses.length} Records)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-base text-rose-700">
                    {formatRs(
                      displayedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
                    )}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 6. MODAL: ADD EXPENSE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <Receipt className="w-5 h-5" />
                </span>
                <h3 className="text-base font-black text-slate-900">
                  نیا خرچہ درج کریں (Add New Expense)
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    کیٹیگری (Category) *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-600"
                  >
                    {ALL_CATEGORY_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {CATEGORY_META[k].emoji} {CATEGORY_META[k].labelUrdu} ({CATEGORY_META[k].labelEn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    رقم روپے (Amount Rs.) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="مثلاً 5000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاریخ (Expense Date) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-center focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ادائیگی کا طریقہ (Payment Method)
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-600"
                  >
                    <option value="cash">کیش (Cash)</option>
                    <option value="bank_transfer">بینک ٹرانسفر (Bank Transfer)</option>
                    <option value="cheque">چیک (Cheque)</option>
                    <option value="credit">ادھار (Credit)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سپلائر / دکاندار (Supplier)
                  </label>
                  <input
                    type="text"
                    placeholder="مثلاً لیسکو، پی ایس او، لوکل مستری..."
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    بل / انوائس نمبر (Bill No)
                  </label>
                  <input
                    type="text"
                    placeholder="مثلاً INV-9821"
                    value={formBillNo}
                    onChange={(e) => setFormBillNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تفصیل (Description / Note)
                </label>
                <textarea
                  rows={2}
                  placeholder="خرچے کی مکمل تفصیل..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  بل / رسید کی تصویر (Bill Receipt Photo)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors">
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>تصویر منتخب کریں (Max 2MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {billImage && (
                    <div className="relative">
                      <img
                        src={billImage}
                        alt="Bill preview"
                        className="w-12 h-12 object-cover rounded-xl border border-slate-300 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setBillImage("")}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {saving ? "محفوظ ہو رہا ہے..." : "خرچہ درج کریں (Save Expense)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: IMAGE PREVIEW */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-rose-600" />
                <span>رسید / بل کا مکمل عکس (Bill Receipt)</span>
              </h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center max-h-[75vh] overflow-auto rounded-2xl bg-slate-50 p-2">
              <img src={previewImage} alt="Receipt Full View" className="max-w-full rounded-xl object-contain shadow-sm" />
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: QUICK EDIT PUMP PROFILE */}
      {showPumpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">
                  پمپ پروفائل و نام تبدیل کریں
                </h3>
              </div>
              <button
                onClick={() => setShowPumpModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePumpProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  پمپ کا نام (Station Name) *
                </label>
                <input
                  type="text"
                  required
                  value={editPumpName}
                  onChange={(e) => setEditPumpName(e.target.value)}
                  placeholder="مثلاً Test Pump Sillanwali یا Rex Petroleum"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  یہ نام فوراً تمام PDF رپورٹس اور ڈیش بورڈ پر ظاہر ہو جائے گا۔
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  فون نمبر (Phone)
                </label>
                <input
                  type="text"
                  value={editPumpPhone}
                  onChange={(e) => setEditPumpPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مکمل پتہ (Address)
                </label>
                <input
                  type="text"
                  value={editPumpAddress}
                  onChange={(e) => setEditPumpAddress(e.target.value)}
                  placeholder="مثلاً Sillanwali Road, Sargodha"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowPumpModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={savingPump}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {savingPump ? "محفوظ ہو رہا ہے..." : "تبدیلی محفوظ کریں"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
