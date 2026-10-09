"use client";

import React, { useState, useEffect } from "react";
import { 
  Receipt, 
  PlusCircle, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Users, 
  Coffee, 
  Wrench, 
  Layers 
} from "lucide-react";
import { formatRs, getTodayDatePK, formatDate } from "@/lib/formatters";
import { Expense } from "@/lib/types";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDatePK());
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form
  const [category, setCategory] = useState("Bijli");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/expenses?date=${selectedDate}`);
      const data = await res.json();
      if (data.expenses) setExpenses(data.expenses);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedDate]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("رقم درست درج کریں");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formatDate(selectedDate),
          type: category,
          amount: amt,
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add expense");

      setAmount("");
      setNote("");
      fetchExpenses();
      setSuccessMsg("خرچہ کامیابی سے درج ہو گیا!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error adding expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("کیا آپ واقعی اس خرچے کو حذف کرنا چاہتے ہیں؟")) return;

    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      fetchExpenses();
      setSuccessMsg("خرچہ حذف کر دیا گیا");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error deleting expense");
    }
  };

  const totalExpenseToday = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-rose-100 text-rose-700">
              <Receipt className="w-6 h-6" />
            </span>
            <span>روزانہ خرچہ جات</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Daily Pump Expenses</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            بجلی کا بل، عملہ تنخواہ و چائے، جنریٹر آئل و مرمت کا روزمرہ حساب
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 shadow-sm">
          <Calendar className="w-4 h-4 text-rose-600" />
          <input
            type="text"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            placeholder="DD-MM-YYYY"
            className="bg-transparent text-slate-900 text-xs font-bold font-mono focus:outline-none w-28 text-center"
          />
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

      {/* Quick Summary Card & Add Expense Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Add Expense Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-md">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-rose-600" />
            <span>نیا خرچہ شامل کریں ({selectedDate})</span>
          </h2>

          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  خرچے کی مد / کیٹیگری (Category)
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:border-rose-500"
                >
                  <option value="Bijli">Bijli (بجلی واپڈا بل)</option>
                  <option value="Salary">Staff Salary (سٹاف تنخواہ / دیہاڑی)</option>
                  <option value="Generator">Generator Fuel & Service (جنریٹر خرچہ)</option>
                  <option value="Tea/Khaba">Tea / Khaba (سٹاف چائے و کھانا)</option>
                  <option value="Maintenance">Maintenance (پمپ نوزل مرمت)</option>
                  <option value="Other">Other Expenses (متفرق خرچہ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  رقم روپے (Amount Rs.)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="e.g. 2500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-black font-mono text-slate-900 focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                تفصیل / ریمارکس (Optional Note)
              </label>
              <input
                type="text"
                placeholder="مثلاً: لیسکو کمرشل بل قسط، شام کی چائے، وغیرہ"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
              >
                {submitting ? "محفوظ ہو رہا ہے..." : "خرچہ درج کریں (Save Expense)"}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Today's Expense Total Card */}
        <div className="bg-gradient-to-br from-rose-50 via-red-50 to-pink-100 rounded-2xl p-6 border-l-4 border-rose-500 border border-rose-200/70 shadow-lg hover:shadow-xl flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-200 text-rose-800 flex items-center justify-center shadow-sm">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-800 block">
                  آج کا کل خرچہ
                </span>
                <span className="text-xs text-rose-900/70 font-semibold">Total Expenses Today</span>
              </div>
            </div>

            <div className="text-3xl font-black text-rose-950 font-mono mt-4 tracking-tight">
              {formatRs(totalExpenseToday)}
            </div>
            <p className="text-xs text-rose-900 font-bold mt-2">
              تاریخ {selectedDate} کے تمام اخراجات
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-rose-200/70 text-xs text-rose-900 font-medium">
            یہ رقم خودکار طور پر ڈیش بورڈ اور رپورٹ کے خالص منافع (Net Profit) سے منہا ہوتی ہے۔
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            اخراجات لاگ ({selectedDate})
          </span>
          <span className="text-xs text-slate-500 font-mono font-bold">
            {expenses.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">تاریخ (Date)</th>
                <th className="py-3 px-3">کیٹیگری (Category)</th>
                <th className="py-3 px-4">تفصیل (Note)</th>
                <th className="py-3 px-4 text-right">رقم (Amount Rs.)</th>
                <th className="py-3 px-3 text-center">ایکشن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    اس تاریخ کا کوئی خرچہ درج نہیں ہے
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatDate(e.date)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-800">
                        {e.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {e.note || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-rose-600 text-sm">
                      {formatRs(e.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="حذف کریں"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
