"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Receipt,
  Plus,
  Calendar,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Coffee,
  Wrench,
  Users,
  Sparkles,
  Building,
  FolderOpen,
  Camera,
  Image as ImageIcon,
  X,
  Search,
  ArrowLeft
} from "lucide-react";
import { formatRs, getTodayDatePK, formatDate } from "@/lib/formatters";
import { Expense } from "@/lib/types";

export default function PumpExpensesPage() {
  const params = useParams();
  const router = useRouter();
  const pumpId = (params?.pumpId as string) || "1";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState({
    todayExpense: 0,
    thisMonthExpense: 0,
    totalEntries: 0,
    filteredCount: 0,
  });
  const [pumpName, setPumpName] = useState<string>("Nexeta Petrol");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDatePK());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal & Form
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [formCategory, setFormCategory] = useState<string>("electricity");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(getTodayDatePK());
  const [formDesc, setFormDesc] = useState<string>("");
  const [billImage, setBillImage] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Bill preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      let url = `/api/pumps/${pumpId}/expenses?`;
      if (selectedDate) url += `date=${selectedDate}&`;
      if (selectedCategory && selectedCategory !== "all") url += `category=${selectedCategory}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "اخراجات لوڈ نہیں ہو سکے");
      }

      setExpenses(data.expenses || []);
      setSummary(data.summary || { todayExpense: 0, thisMonthExpense: 0, totalEntries: 0, filteredCount: 0 });
      setPumpName(data.pump_name || "Nexeta Petrol");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [pumpId, selectedDate, selectedCategory]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

    const tempExpense: Expense = {
      id: Date.now(),
      pump_id: Number(pumpId),
      category: formCategory,
      type: formCategory,
      amount: amt,
      description: formDesc || "خرچہ",
      note: formDesc || "خرچہ",
      date: formDate,
      bill_image_url: billImage || null,
      created_at: new Date().toISOString(),
    };

    // Optimistic UI instant update
    setExpenses((prev) => [tempExpense, ...prev]);
    setSummary((prev) => ({
      ...prev,
      todayExpense: formDate === getTodayDatePK() ? prev.todayExpense + amt : prev.todayExpense,
      thisMonthExpense: prev.thisMonthExpense + amt,
      totalEntries: prev.totalEntries + 1,
      filteredCount: prev.filteredCount + 1,
    }));
    setShowAddModal(false);
    setSuccessMsg("خرچہ کامیابی سے درج ہو گیا!");
    setTimeout(() => setSuccessMsg(""), 3500);

    // Background server save
    try {
      setSaving(true);
      const res = await fetch(`/api/pumps/${pumpId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formCategory,
          amount: amt,
          date: formDate,
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
      setBillImage("");
      fetchExpenses(); // sync with database id
    } catch (err: any) {
      setErrorMsg(err.message);
      fetchExpenses();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("کیا آپ واقعی اس خرچے کو حذف کرنا چاہتے ہیں؟")) return;

    // Optimistic remove
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/pumps/${pumpId}/expenses?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "حذف نہیں ہو سکا");
      }
      setSuccessMsg("خرچہ حذف کر دیا گیا");
      fetchExpenses();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
      fetchExpenses();
    }
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case "electricity":
      case "bijli":
        return { label: "بجلی کا بل (Electricity)", color: "bg-amber-100 text-amber-900 border-amber-300", icon: Zap };
      case "tea":
      case "tea/khaba":
        return { label: "چائے و کھانا (Tea)", color: "bg-orange-100 text-orange-900 border-orange-300", icon: Coffee };
      case "repair":
      case "maintenance":
        return { label: "مرمت و مینٹیننس (Repair)", color: "bg-blue-100 text-blue-900 border-blue-300", icon: Wrench };
      case "staff_advance":
      case "salary":
        return { label: "سٹاف ایڈوانس (Staff)", color: "bg-purple-100 text-purple-900 border-purple-300", icon: Users };
      case "cleaning":
        return { label: "صفائی (Cleaning)", color: "bg-teal-100 text-teal-900 border-teal-300", icon: Sparkles };
      case "rent":
        return { label: "کرایہ (Rent)", color: "bg-indigo-100 text-indigo-900 border-indigo-300", icon: Building };
      default:
        return { label: "دیگر خرچہ (Other)", color: "bg-slate-100 text-slate-800 border-slate-300", icon: FolderOpen };
    }
  };

  const displayedExpenses = expenses.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (e.description || "").toLowerCase().includes(term) ||
      (e.note || "").toLowerCase().includes(term) ||
      (e.category || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-rose-100 text-rose-700 shadow-xs">
              <Receipt className="w-6 h-6" />
            </span>
            <span>روزانہ خرچہ جات (پمپ اخراجات)</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Pump Expenses</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {pumpName} — بجلی بل، چائے، ملازمین ایڈوانس، نوزل مرمت و رسیدوں کا مکمل حساب
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchExpenses}
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm transition-all"
            title="ریفریش کریں"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ نیا خرچہ شامل کریں (Add Expense)</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Today Expense */}
        <div className="bg-gradient-to-br from-rose-50 via-red-50 to-pink-100 rounded-2xl p-6 border-l-4 border-l-rose-500 border border-rose-200/70 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-800">
              آج کا کل خرچہ (Today Expense)
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-950 mt-2 font-mono">
            {formatRs(summary.todayExpense)}
          </div>
          <div className="text-xs text-rose-700 font-bold mt-1">
            آج کے دن کے تمام اخراجات
          </div>
        </div>

        {/* Card 2: This Month Expense */}
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-2xl p-6 border-l-4 border-l-amber-500 border border-amber-200/70 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">
              اس مہینے کا کل خرچہ (Month Total)
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-950 mt-2 font-mono">
            {formatRs(summary.thisMonthExpense)}
          </div>
          <div className="text-xs text-amber-700 font-bold mt-1">
            رواں ماہ کے تمام اخراجات
          </div>
        </div>

        {/* Card 3: Total Log Entries */}
        <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100 rounded-2xl p-6 border-l-4 border-l-indigo-500 border border-indigo-200/70 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-800">
              ٹوٹل ریکارڈز (Total Entries)
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-200 text-indigo-800 flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-950 mt-2 font-mono">
            {summary.totalEntries}
          </div>
          <div className="text-xs text-indigo-700 font-bold mt-1">
            محفوظ شدہ اخراجات کی رسیدیں
          </div>
        </div>
      </div>

      {/* FILTER BAR & TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        {/* Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date filter */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs">
              <Calendar className="w-4 h-4 text-rose-600" />
              <input
                type="text"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                className="bg-transparent text-slate-900 font-mono font-bold focus:outline-none w-28 text-center"
              />
            </div>

            <button
              onClick={() => setSelectedDate(getTodayDatePK())}
              className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors"
            >
              آج (Today)
            </button>
            <button
              onClick={() => setSelectedDate("")}
              className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors"
            >
              تمام (All)
            </button>

            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="all">تمام کیٹیگریز (All Categories)</option>
              <option value="electricity">بجلی کا بل (Electricity)</option>
              <option value="tea">چائے و کھانا (Tea)</option>
              <option value="repair">مرمت و مینٹیننس (Repair)</option>
              <option value="staff_advance">سٹاف ایڈوانس (Staff Advance)</option>
              <option value="cleaning">صفائی (Cleaning)</option>
              <option value="rent">کرایہ (Rent)</option>
              <option value="other">دیگر (Other)</option>
            </select>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="تفصیل تلاش کریں..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-slate-900 focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Expenses List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">تاریخ (Date)</th>
                <th className="py-3 px-3">کیٹیگری (Category)</th>
                <th className="py-3 px-4">تفصیل (Description)</th>
                <th className="py-3 px-3 text-center">رسید / فوٹو (Bill)</th>
                <th className="py-3 px-4 text-right">رقم روپے (Amount Rs.)</th>
                <th className="py-3 px-3 text-center">ایکشن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {loading && expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-600 mb-2" />
                    اخراجات لوڈ ہو رہے ہیں...
                  </td>
                </tr>
              ) : displayedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    کوئی خرچہ ریکارڈ نہیں ملا
                  </td>
                </tr>
              ) : (
                displayedExpenses.map((e) => {
                  const badge = getCategoryBadge(e.category || e.type);
                  const Icon = badge.icon;
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {formatDate(e.date)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        <div className="font-semibold">{e.description || e.note || "—"}</div>
                        {e.created_by && (
                          <div className="text-[10px] text-slate-400">درج کنندہ: {e.created_by}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {e.bill_image_url ? (
                          <button
                            onClick={() => setPreviewImage(e.bill_image_url || null)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-indigo-600 text-[10px] font-bold transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>دیکھیں</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-600 text-sm">
                        {formatRs(e.amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
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
          </table>
        </div>
      </div>

      {/* MODAL: ADD EXPENSE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                <span>نیا خرچہ درج کریں (Add Expense)</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    کیٹیگری (Category) *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:outline-none focus:border-rose-600"
                  >
                    <option value="electricity">⚡ بجلی کا بل (Electricity)</option>
                    <option value="tea">☕ چائے و کھانا (Tea/Food)</option>
                    <option value="repair">🔧 مرمت و مینٹیننس (Repair)</option>
                    <option value="staff_advance">👥 سٹاف ایڈوانس / تنخواہ (Staff)</option>
                    <option value="cleaning">✨ صفائی و واشنگ (Cleaning)</option>
                    <option value="rent">🏢 کرایہ پمپ (Rent)</option>
                    <option value="other">📁 دیگر اخراجات (Other)</option>
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
                    placeholder="مثلاً 2500"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاریخ (Expense Date)
                </label>
                <input
                  type="text"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  placeholder="DD-MM-YYYY"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-center focus:outline-none focus:border-rose-600"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تفصیل (Description / Reason)
                </label>
                <textarea
                  rows={2}
                  placeholder="مثلاً: لیسکو کمرشل بل، جنریٹر موبل آئل، سٹاف لنچ وغیرہ..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:border-rose-600"
                />
              </div>

              {/* Bill Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  بل / رسید کی تصویر (Bill Photo Upload)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors">
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>تصویر منتخب کریں</span>
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
                        className="w-12 h-12 object-cover rounded-lg border border-slate-300"
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

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t">
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
                  className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {saving ? "محفوظ ہو رہا ہے..." : "خرچہ درج کریں (Save Expense)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMAGE PREVIEW */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 shadow-2xl relative animate-in fade-in zoom-in">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-slate-800 mb-3">بل / رسید کا عکس</h4>
            <div className="flex justify-center max-h-[70vh] overflow-auto">
              <img src={previewImage} alt="Bill receipt" className="max-w-full rounded-xl object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
