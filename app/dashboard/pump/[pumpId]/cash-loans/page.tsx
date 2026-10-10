"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Calendar,
  Phone,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  CreditCard,
  Building,
  User,
  RefreshCw,
  Clock,
  Check
} from "lucide-react";
import { formatRs, getTodayDatePK, formatDate } from "@/lib/formatters";
import { CashLoan, CashLoanTransaction } from "@/lib/types";

export default function CashLoansPage() {
  const params = useParams();
  const router = useRouter();
  const pumpId = (params?.pumpId as string) || "1";

  const [activeTab, setActiveTab] = useState<"lena" | "dena">("lena");
  const [loans, setLoans] = useState<CashLoan[]>([]);
  const [summary, setSummary] = useState<{
    totalLena: number;
    totalDena: number;
    netBalance: number;
    totalLoansCount: number;
  }>({
    totalLena: 0,
    totalDena: 0,
    netBalance: 0,
    totalLoansCount: 0,
  });
  const [pumpName, setPumpName] = useState<string>("Nexeta Petrol");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // New Loan Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addForm, setAddForm] = useState({
    person_type: "person",
    person_name: "",
    phone: "",
    loan_type: "lena",
    amount: "",
    loan_date: getTodayDatePK(),
    due_date: "",
    reason: "",
  });
  const [savingLoan, setSavingLoan] = useState<boolean>(false);

  // Transaction (Repay / Collect) Modal State
  const [showTxModal, setShowTxModal] = useState<boolean>(false);
  const [selectedLoanForTx, setSelectedLoanForTx] = useState<CashLoan | null>(null);
  const [txForm, setTxForm] = useState({
    amount: "",
    date: getTodayDatePK(),
    note: "",
  });
  const [savingTx, setSavingTx] = useState<boolean>(false);

  // History Timeline Modal State
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyLoan, setHistoryLoan] = useState<CashLoan | null>(null);
  const [historyTransactions, setHistoryTransactions] = useState<CashLoanTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch(`/api/pumps/${pumpId}/cash-loans`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "ادھار ڈیٹا لوڈ نہیں ہو سکا");
      }
      setLoans(data.loans || []);
      setSummary(data.summary || { totalLena: 0, totalDena: 0, netBalance: 0, totalLoansCount: 0 });
      setPumpName(data.pump_name || "Nexeta Petrol");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [pumpId]);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.person_name.trim()) {
      setErrorMsg("نام درج کرنا ضروری ہے");
      return;
    }
    const amt = parseFloat(addForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("درست رقم درج کریں");
      return;
    }

    try {
      setSavingLoan(true);
      setErrorMsg("");
      const res = await fetch(`/api/pumps/${pumpId}/cash-loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "محفوظ کرنے میں ناکامی");
      }
      setSuccessMsg("نیا ادھار ریکارڈ کامیابی سے درج ہو گیا!");
      setShowAddModal(false);
      setAddForm({
        person_type: "person",
        person_name: "",
        phone: "",
        loan_type: activeTab,
        amount: "",
        loan_date: getTodayDatePK(),
        due_date: "",
        reason: "",
      });
      fetchLoans();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSavingLoan(false);
    }
  };

  const handleOpenTxModal = (loan: CashLoan) => {
    setSelectedLoanForTx(loan);
    setTxForm({
      amount: loan.remaining_amount.toString(),
      date: getTodayDatePK(),
      note: loan.loan_type === "lena" ? "واپس ادائیگی" : "وصولی",
    });
    setShowTxModal(true);
  };

  const handleSubmitTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForTx) return;

    const amt = parseFloat(txForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("درست رقم درج کریں");
      return;
    }

    try {
      setSavingTx(true);
      setErrorMsg("");
      const res = await fetch(`/api/pumps/${pumpId}/cash-loans/${selectedLoanForTx.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "ادائیگی درج نہیں ہو سکی");
      }
      setSuccessMsg(data.message || "ٹرانزیکشن کامیابی سے درج ہو گئی!");
      setShowTxModal(false);
      fetchLoans();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSavingTx(false);
    }
  };

  const handleOpenHistory = async (loan: CashLoan) => {
    setHistoryLoan(loan);
    setShowHistoryModal(true);
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/pumps/${pumpId}/cash-loans/${loan.id}/transactions`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to load tx history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Check if due_date is passed
  const isOverdue = (dueDateStr?: string | null, status?: string) => {
    if (!dueDateStr || status === "paid") return false;
    // parse DD-MM-YYYY
    const parts = dueDateStr.split("-");
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const dueDate = new Date(y, m, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    }
    return false;
  };

  const filteredLoans = loans.filter((l) => l.loan_type === activeTab);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 shadow-xs">
              <Wallet className="w-6 h-6" />
            </span>
            <span>کیش لون و ادھار کھاتہ (لینا دینا لیجر)</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Cash Loans Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {pumpName} — کیش ادھار کا مکمل حساب، قسط وار واپسی اور وصو لیجر
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLoans}
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm transition-all"
            title="ریفریش کریں"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => {
              setAddForm((prev) => ({ ...prev, loan_type: activeTab }));
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ نیا ادھار اندراج (Add Loan)</span>
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

      {/* TOP 3 KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Lena (Payable) */}
        <div className="bg-gradient-to-br from-rose-50 via-red-50 to-pink-100 rounded-2xl p-6 border-l-4 border-l-rose-500 border border-rose-200/70 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-800">
              ادھار لیا (Lena - واجب الادا)
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-950 mt-2 font-mono">
            {formatRs(summary.totalLena)}
          </div>
          <div className="text-xs text-rose-700 font-bold mt-1">
            میں نے واپس دینا ہے (Payable by Pump)
          </div>
        </div>

        {/* Card 2: Total Dena (Receivable) */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 rounded-2xl p-6 border-l-4 border-l-emerald-500 border border-emerald-200/70 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
              ادھار دیا (Dena - واجب الوصول)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950 mt-2 font-mono">
            {formatRs(summary.totalDena)}
          </div>
          <div className="text-xs text-emerald-700 font-bold mt-1">
            میں نے واپس لینا ہے (Receivable by Pump)
          </div>
        </div>

        {/* Card 3: Net Balance */}
        <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100 rounded-2xl p-6 border-l-4 border-l-indigo-500 border border-indigo-200/70 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-800">
              نیٹ بیلنس (Net Loan Balance)
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-200 text-indigo-800 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black mt-2 font-mono ${
              summary.netBalance >= 0 ? "text-emerald-900" : "text-rose-900"
            }`}
          >
            {formatRs(summary.netBalance)}
          </div>
          <div className="text-xs text-indigo-700 font-bold mt-1">
            {summary.netBalance >= 0 ? "مثبت (پمپ کے حق میں ہے)" : "منفی (پمپ پر قرضہ زیادہ ہے)"}
          </div>
        </div>
      </div>

      {/* TABS & TABLE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        {/* Tab Headers */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex rounded-xl bg-slate-200/80 p-1">
            <button
              onClick={() => setActiveTab("lena")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black transition-all ${
                activeTab === "lena"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>ادھار لیا (Lena - Payable)</span>
            </button>
            <button
              onClick={() => setActiveTab("dena")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black transition-all ${
                activeTab === "dena"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>ادھار دیا (Dena - Receivable)</span>
            </button>
          </div>

          <span className="text-xs font-mono font-bold text-slate-500">
            {filteredLoans.length} ریکارڈز
          </span>
        </div>

        {/* Loans Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">نام و ادارہ (Person / Entity)</th>
                <th className="py-3 px-3">رابطہ فون</th>
                <th className="py-3 px-3 text-right">کل ادھار رقم (Total)</th>
                <th className="py-3 px-3 text-right">بقیہ رقم (Remaining)</th>
                <th className="py-3 px-3 text-center">تاریخ اندراج</th>
                <th className="py-3 px-3 text-center">آخری تاریخ (Due Date)</th>
                <th className="py-3 px-3 text-center">سٹیٹس (Status)</th>
                <th className="py-3 px-4 text-center">ایکشن (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    لوڈ ہو رہا ہے...
                  </td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    {activeTab === "lena" ? "کوئی ادھار لیا گیا ریکارڈ نہیں ہے" : "کوئی ادھار دیا گیا ریکارڈ نہیں ہے"}
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const overdue = isOverdue(loan.due_date, loan.status);
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {loan.person_type === "bank" ? (
                            <Building className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-slate-600" />
                          )}
                          <span>{loan.person_name}</span>
                        </div>
                        {loan.reason && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs">{loan.reason}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {loan.phone || "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {formatRs(loan.amount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black">
                        <span className={activeTab === "lena" ? "text-rose-700" : "text-emerald-700"}>
                          {formatRs(loan.remaining_amount)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600">
                        {formatDate(loan.loan_date)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {loan.due_date ? (
                          <div className="flex flex-col items-center">
                            <span className="font-mono text-slate-700">{formatDate(loan.due_date)}</span>
                            {overdue && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-100 text-red-700 mt-0.5 animate-pulse">
                                Overdue (میعاد ختم)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            loan.status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : loan.status === "partial"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {loan.status === "paid"
                            ? "مکمل ادا شدہ"
                            : loan.status === "partial"
                            ? "جزوی ادا شدہ"
                            : "زیر التواء"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {loan.remaining_amount > 0 && (
                            <button
                              onClick={() => handleOpenTxModal(loan)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-xs transition-all ${
                                activeTab === "lena"
                                  ? "bg-rose-600 hover:bg-rose-700"
                                  : "bg-emerald-600 hover:bg-emerald-700"
                              }`}
                            >
                              {activeTab === "lena" ? "واپس ادائیگی کریں" : "وصولی کریں"}
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenHistory(loan)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors flex items-center gap-1"
                            title="ہسٹری دیکھیں"
                          >
                            <History className="w-3 h-3 text-slate-500" />
                            <span>ہسٹری</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD NEW LOAN */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>نیا ادھار اندراج (Add Loan Entry)</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-4">
              {/* Loan Type Selector */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  ادھار کی نوعیت (Loan Type) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, loan_type: "lena" })}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      addForm.loan_type === "lena"
                        ? "bg-rose-50 border-rose-500 text-rose-800 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-rose-600" />
                    <span>ادھار لیا (Lena - Maine Liya)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, loan_type: "dena" })}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      addForm.loan_type === "dena"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    <span>ادھار دیا (Dena - Maine Diya)</span>
                  </button>
                </div>
              </div>

              {/* Person Type & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    قسم (Entity Type)
                  </label>
                  <select
                    value={addForm.person_type}
                    onChange={(e) => setAddForm({ ...addForm, person_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:outline-none focus:border-indigo-600"
                  >
                    <option value="person">شخص (Person)</option>
                    <option value="bank">بینک (Bank)</option>
                    <option value="company">کمپنی (Company)</option>
                    <option value="other">دیگر (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نام (Name / Bank Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً چوہدری اصغر یا حبیب بینک"
                    value={addForm.person_name}
                    onChange={(e) => setAddForm({ ...addForm, person_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Phone & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رابطہ فون (Phone)
                  </label>
                  <input
                    type="text"
                    placeholder="03001234567"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم روپے (Amount Rs.) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="50000"
                    value={addForm.amount}
                    onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-black focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Loan Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ادھار تاریخ (Loan Date)
                  </label>
                  <input
                    type="text"
                    value={addForm.loan_date}
                    onChange={(e) => setAddForm({ ...addForm, loan_date: e.target.value })}
                    placeholder="DD-MM-YYYY"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-center focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    واپسی کی متوقع تاریخ (Due Date اختیاری)
                  </label>
                  <input
                    type="text"
                    value={addForm.due_date}
                    onChange={(e) => setAddForm({ ...addForm, due_date: e.target.value })}
                    placeholder="DD-MM-YYYY"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-center focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Reason / Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  وجہ یا تفصیل (Reason / Note)
                </label>
                <textarea
                  rows={2}
                  placeholder="ٹینکر ادائیگی یا ذاتی ضرورت..."
                  value={addForm.reason}
                  onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

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
                  disabled={savingLoan}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {savingLoan ? "محفوظ ہو رہا ہے..." : "محفوظ کریں (Save Loan)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REPAYMENT OR COLLECTION */}
      {showTxModal && selectedLoanForTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {selectedLoanForTx.loan_type === "lena" ? "واپس ادائیگی کریں" : "وصولی درج کریں"}
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  {selectedLoanForTx.person_name} — بقیہ: {formatRs(selectedLoanForTx.remaining_amount)}
                </p>
              </div>
              <button
                onClick={() => setShowTxModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTx} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم (Amount Rs.) *
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder={selectedLoanForTx.remaining_amount.toString()}
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-mono font-black focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاریخ (Transaction Date)
                </label>
                <input
                  type="text"
                  value={txForm.date}
                  onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                  placeholder="DD-MM-YYYY"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-center focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تفصیل یا نوٹ (Note)
                </label>
                <input
                  type="text"
                  placeholder="کیش دیا / بینک ٹرانسفر وغیرہ"
                  value={txForm.note}
                  onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={savingTx}
                  className={`px-6 py-2 rounded-xl text-white font-bold text-xs shadow-md disabled:opacity-50 ${
                    selectedLoanForTx.loan_type === "lena"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {savingTx ? "محفوظ ہو رہا ہے..." : "محفوظ کریں (Confirm)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HISTORY TIMELINE */}
      {showHistoryModal && historyLoan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <History className="w-5 h-5 text-indigo-600" />
                  <span>ادائیگی و وصولی ہسٹری</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  {historyLoan.person_name} — کل: {formatRs(historyLoan.amount)} | بقیہ: {formatRs(historyLoan.remaining_amount)}
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-10 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                ہسٹری لوڈ ہو رہی ہے...
              </div>
            ) : historyTransactions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                ابھی تک کوئی ادائیگی یا وصولی کی ٹرانزیکشن نہیں ہوئی
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto divide-y divide-slate-100">
                {historyTransactions.map((tx) => (
                  <div key={tx.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            tx.type === "pay" ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                        />
                        <span>{tx.note || (tx.type === "pay" ? "ادائیگی" : "وصولی")}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        تاریخ: {formatDate(tx.date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-black text-sm ${
                          tx.type === "pay" ? "text-rose-700" : "text-emerald-700"
                        }`}
                      >
                        {formatRs(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t mt-4">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                بند کریں
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
