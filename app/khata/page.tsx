"use client";

import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Share2, 
  Calendar, 
  Coins,
  MessageSquare,
  ArrowDownCircle,
  Clock,
  Filter,
  Users,
  Wallet,
  Sparkles,
  CheckCircle
} from "lucide-react";
import { formatRs, getTodayDatePK, formatDate, generateWhatsAppBill } from "@/lib/formatters";
import { CreditCustomer, CreditSale } from "@/lib/types";

export default function UdharKhataPage() {
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [todayRecovery, setTodayRecovery] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "cleared">("all");
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Customer Ledger Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<CreditCustomer | null>(null);
  const [ledgerRecords, setLedgerRecords] = useState<CreditSale[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Quick Payment Modal State
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<CreditCustomer | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDatePK());
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // New Transaction State (inside ledger modal)
  const [txType, setTxType] = useState<string>("Fuel");
  const [txDate, setTxDate] = useState<string>(getTodayDatePK());
  const [txDetails, setTxDetails] = useState<string>("");
  const [txQty, setTxQty] = useState<string>("");
  const [txAmount, setTxAmount] = useState<string>("");
  const [submittingTx, setSubmittingTx] = useState(false);

  // Add Customer Form State
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [phone, setPhone] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/credit/customers");
      const data = await res.json();
      if (data.customers) setCustomers(data.customers);
      if (data.todayRecovery != null) setTodayRecovery(data.todayRecovery);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Open customer ledger
  const openCustomerLedger = async (cust: CreditCustomer) => {
    setSelectedCustomer(cust);
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/credit/sales?customer_id=${cust.id}`);
      const data = await res.json();
      if (data.ledger) setLedgerRecords(data.ledger);
    } catch (err) {
      console.error("Ledger fetch error:", err);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Add Customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAddingCustomer(true);
      setErrorMsg("");

      const res = await fetch("/api/credit/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, vehicle_no: vehicleNo, phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add customer");

      setShowAddCustomerModal(false);
      setName("");
      setCompany("");
      setVehicleNo("");
      setPhone("");
      fetchCustomers();
      setSuccessMsg("نیا کھاتہ دار شامل ہو گیا!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error adding customer");
    } finally {
      setAddingCustomer(false);
    }
  };

  // Record Transaction (Udhar or Wasooli)
  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("رقم درست درج کریں");
      return;
    }

    try {
      setSubmittingTx(true);
      const isPayment = txType === "Payment" ? 1 : 0;

      const res = await fetch("/api/credit/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          date: formatDate(txDate),
          type: txType,
          details: txDetails,
          qty: parseFloat(txQty) || 0,
          total: amt,
          is_payment: isPayment,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record transaction");

      setTxDetails("");
      setTxQty("");
      setTxAmount("");
      openCustomerLedger(selectedCustomer);
      fetchCustomers();
      setSuccessMsg(data.message || "انٹری محفوظ ہو گئی!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Error recording transaction");
    } finally {
      setSubmittingTx(false);
    }
  };

  // WhatsApp Reminder Generator (As specified in requirement)
  const handleSendWhatsAppReminder = (cust: CreditCustomer) => {
    const balanceStr = (cust.balance || 0).toLocaleString();
    const pumpName = "Nexeta Petrol";
    const msg = `السلام علیکم ${cust.name} صاحب، آپ کا ${pumpName} پر بقایا Rs. ${balanceStr} ہے، برائے مہربانی جلد ادا کر دیں۔ تاریخ ${getTodayDatePK()}۔ شکریہ!`;
    const cleanPhone = cust.phone.replace(/[^0-9]/g, "");
    const waPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // WhatsApp Detailed Bill Generator
  const handleSendWhatsAppBill = (cust: CreditCustomer, lastTx?: CreditSale) => {
    const url = generateWhatsAppBill({
      customerName: cust.name,
      company: cust.company,
      vehicleNo: cust.vehicle_no,
      phone: cust.phone,
      date: getTodayDatePK(),
      totalCredit: cust.total_credit || 0,
      totalPaid: cust.total_paid || 0,
      balance: cust.balance || 0,
      lastTransaction: lastTx
        ? {
            type: lastTx.type,
            details: lastTx.details,
            qty: lastTx.qty,
            amount: lastTx.total,
          }
        : undefined,
    });

    window.open(url, "_blank");
  };

  // Open Quick Payment Modal for a customer
  const handleOpenQuickPayment = (cust: CreditCustomer) => {
    setPaymentCustomer(cust);
    setPaymentDate(getTodayDatePK());
    setPaymentAmount("");
    setPaymentMethod("Cash");
    setPaymentNotes("");
    setShowQuickPaymentModal(true);
  };

  // Save Quick Payment
  const handleSaveQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("براہ کرم درست وصول شدہ رقم درج کریں");
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await fetch("/api/credit/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: paymentCustomer.id,
          date: formatDate(paymentDate),
          type: "Payment",
          details: `وصولی بذریعہ ${paymentMethod}${paymentNotes ? ` (${paymentNotes})` : ""}`,
          qty: 0,
          total: amt,
          is_payment: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      const remaining = Math.max(0, (paymentCustomer.balance || 0) - amt);
      setSuccessMsg(`کامیابی! ${paymentCustomer.name} سے Rs. ${amt.toLocaleString()} وصول ہو گئے ہیں۔ بقایا رقم: Rs. ${remaining.toLocaleString()}`);
      setShowQuickPaymentModal(false);
      fetchCustomers();
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err: any) {
      alert(err.message || "Error saving payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const totalOutstandingAll = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const totalCreditAll = customers.reduce((sum, c) => sum + (c.total_credit || 0), 0);
  const totalReceivedAll = customers.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  const pendingCustomersList = customers.filter((c) => (c.balance || 0) > 0);
  const clearedCustomersList = customers.filter((c) => (c.balance || 0) <= 0);

  const filteredCustomers = customers
    .filter((c) => {
      if (statusFilter === "pending") return (c.balance || 0) > 0;
      if (statusFilter === "cleared") return (c.balance || 0) <= 0;
      return true;
    })
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.vehicle_no && c.vehicle_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.phone.includes(searchTerm)
    );

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-amber-100 text-amber-700">
              <BookOpen className="w-6 h-6" />
            </span>
            <span>ادھار کھاتہ و واٹس ایپ ریکوری</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Udhar Khata & Recovery</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            کسٹمرز و ٹرانسپورٹ کمپنیوں کا ادھار ریکارڈ، فوری کیش وصولی اور ایک کلک واٹس ایپ یاد دہانی
          </p>
        </div>

        <button
          onClick={() => setShowAddCustomerModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md transition-all hover:scale-102"
        >
          <UserPlus className="w-4 h-4" />
          <span>نیا کسٹمر بنائیں (Add Customer)</span>
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TOP 4 BEAUTIFUL VIBRANT GRADIENT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Udhar (Amber/Orange) */}
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-amber-100 rounded-2xl p-6 border-l-4 border-amber-500 border border-amber-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-200 text-amber-800 flex items-center justify-center shadow-xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 block">
                  کل ادھار بقایا
                </span>
                <span className="text-xs text-amber-900/70 font-semibold">Total Outstanding</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-amber-300 text-amber-800 shadow-2xs">
              واجب الادا
            </span>
          </div>
          <div className="text-3xl font-black text-amber-950 mt-4 font-mono tracking-tight">
            {formatRs(totalOutstandingAll)}
          </div>
          <p className="text-xs text-amber-900 font-bold mt-2">مارکیٹ سے کسٹمرز سے وصول طلب رقم</p>
        </div>

        {/* Card 2: Total Recovery Today (Emerald) */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100 rounded-2xl p-6 border-l-4 border-emerald-500 border border-emerald-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
                <ArrowDownCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                  آج کی وصولی (Today Recovery)
                </span>
                <span className="text-xs text-emerald-900/70 font-semibold">Recovered Today</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-emerald-300 text-emerald-800 shadow-2xs">
              آج کا کیش
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-950 mt-4 font-mono tracking-tight">
            {formatRs(todayRecovery)}
          </div>
          <p className="text-xs text-emerald-900 font-bold mt-2">آج کے دن موصول ہونے والی نقد رقوم</p>
        </div>

        {/* Card 3: Pending Customers Count (Red/Rose) */}
        <div className="bg-gradient-to-br from-rose-50 via-red-50 to-pink-100 rounded-2xl p-6 border-l-4 border-rose-500 border border-rose-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-200 text-rose-800 flex items-center justify-center shadow-xs">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-800 block">
                  بقایا دار کسٹمرز
                </span>
                <span className="text-xs text-rose-900/70 font-semibold">Pending Customers</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-rose-300 text-rose-800 shadow-2xs">
              باقی دار
            </span>
          </div>
          <div className="text-3xl font-black text-rose-950 mt-4 font-mono tracking-tight">
            {pendingCustomersList.length} <span className="text-sm font-bold text-rose-800">کھاتے</span>
          </div>
          <p className="text-xs text-rose-900 font-bold mt-2">جن کے ذمے ادھار واجب الادا ہے</p>
        </div>

        {/* Card 4: Cleared Customers Count (Blue/Indigo) */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 rounded-2xl p-6 border-l-4 border-blue-500 border border-blue-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-200 text-blue-800 flex items-center justify-center shadow-xs">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 block">
                  صاف / بے باق کھاتے
                </span>
                <span className="text-xs text-blue-900/70 font-semibold">Cleared Accounts</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-blue-300 text-blue-800 shadow-2xs">
              0 بقایا
            </span>
          </div>
          <div className="text-3xl font-black text-blue-950 mt-4 font-mono tracking-tight">
            {clearedCustomersList.length} <span className="text-sm font-bold text-blue-800">کھاتے</span>
          </div>
          <p className="text-xs text-blue-900 font-bold mt-2">مکمل ادائیگی کر چکے ہیں</p>
        </div>
      </div>

      {/* Customers List & Filters */}
      <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-lg">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              }`}
            >
              تمام کھاتے ({customers.length})
            </button>

            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === "pending"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>بقایا دار ({pendingCustomersList.length})</span>
            </button>

            <button
              onClick={() => setStatusFilter("cleared")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === "cleared"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <span>صاف / بے باق ({clearedCustomersList.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="نام، گاڑی نمبر یا فون سے تلاش کریں..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:border-amber-500 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">کسٹمر کا نام (Customer)</th>
                <th className="py-3 px-3">گاڑی نمبر (Vehicle)</th>
                <th className="py-3 px-3">فون نمبر (Phone)</th>
                <th className="py-3 px-3 text-right">کل ادھار</th>
                <th className="py-3 px-3 text-right">کل وصولی</th>
                <th className="py-3 px-3 text-right">بقایا واجب الادا (Balance)</th>
                <th className="py-3 px-4 text-center">ایکشن بٹن (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    کوئی کسٹمر نہیں ملا
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const hasPending = (c.balance || 0) > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{c.name}</span>
                          {hasPending ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">
                              بقایا
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                              بے باق
                            </span>
                          )}
                        </div>
                        {c.company && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">{c.company}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-slate-700">
                        {c.vehicle_no || "—"}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-600">
                        {c.phone}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-slate-700 font-semibold">
                        {formatRs(c.total_credit)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-emerald-700 font-bold">
                        {formatRs(c.total_paid)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-black text-sm">
                        <span className={hasPending ? "text-amber-600" : "text-emerald-700"}>
                          {formatRs(c.balance)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {/* BUTTON 1: Add Payment (وصولی جمع کریں) */}
                          <button
                            onClick={() => handleOpenQuickPayment(c)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all hover:scale-102"
                            title="Add Payment (وصولی درج کریں)"
                          >
                            <ArrowDownCircle className="w-3.5 h-3.5" />
                            <span>وصولی جمع کریں</span>
                          </button>

                          {/* BUTTON 2: WhatsApp Reminder (WhatsApp یاد دہانی) */}
                          <button
                            onClick={() => handleSendWhatsAppReminder(c)}
                            disabled={!hasPending}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                              hasPending
                                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 hover:scale-102"
                                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            }`}
                            title={hasPending ? "Send WhatsApp Payment Reminder" : "No pending balance"}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp یاد دہانی</span>
                          </button>

                          {/* BUTTON 3: Ledger statement */}
                          <button
                            onClick={() => openCustomerLedger(c)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold border border-slate-300 transition-colors"
                            title="View Customer Ledger"
                          >
                            کھاتہ
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

      {/* MODAL: CUSTOMER LEDGER & NEW TRANSACTION */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 border border-slate-200 shadow-2xl relative max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">
                    {selectedCustomer.name} کا لیجر کھاتہ
                  </h2>
                  {selectedCustomer.vehicle_no && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-xs font-mono font-bold text-slate-800">
                      {selectedCustomer.vehicle_no}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-medium flex items-center gap-3 mt-1">
                  <span>{selectedCustomer.company || "Personal Account"}</span>
                  <span>•</span>
                  <span>فون: {selectedCustomer.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleSendWhatsAppBill(
                      selectedCustomer,
                      ledgerRecords.length > 0 ? ledgerRecords[0] : undefined
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp بل بھیجیں</span>
                </button>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 bg-slate-100"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Customer Financial Balance Banner */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] uppercase text-slate-500 font-bold">کل ادھار سیل</div>
                <div className="text-sm font-black font-mono text-slate-900 mt-0.5">
                  {formatRs(selectedCustomer.total_credit)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] uppercase text-slate-500 font-bold">کل کیش وصولی</div>
                <div className="text-sm font-black font-mono text-emerald-700 mt-0.5">
                  {formatRs(selectedCustomer.total_paid)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-center">
                <div className="text-[10px] uppercase text-amber-800 font-bold">🔴 بقایا واجب الادا</div>
                <div className="text-base font-black font-mono text-amber-700 mt-0.5">
                  {formatRs(selectedCustomer.balance)}
                </div>
              </div>
            </div>

            {/* Quick Record New Entry Form */}
            <form onSubmit={handleRecordTransaction} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-4 space-y-2.5">
              <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                <span>نئی انٹری درج کریں (Record Entry)</span>
                <span className="text-[10px] text-slate-500 font-medium">ادھار سیل یا کیش وصولی</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                    className="w-full py-2 px-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                  >
                    <option value="Fuel">Fuel (تیل ادھار)</option>
                    <option value="Product">Product (سامان ادھار)</option>
                    <option value="Payment">Payment (کیش وصولی)</option>
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-full py-2 px-2 rounded-xl border border-slate-300 text-xs font-bold font-mono text-slate-900"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="تفصیل (e.g. Diesel 100L)"
                    value={txDetails}
                    onChange={(e) => setTxDetails(e.target.value)}
                    className="w-full py-2 px-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="لیٹر (Qty)"
                    value={txQty}
                    onChange={(e) => setTxQty(e.target.value)}
                    className="w-full py-2 px-2 rounded-xl border border-slate-300 text-xs font-black font-mono text-slate-900"
                  />
                </div>

                <div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="رقم (Rs.)"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full py-2 px-2 rounded-xl border border-slate-300 text-xs font-black font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submittingTx}
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all ${
                    txType === "Payment"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {submittingTx
                    ? "محفوظ ہو رہا ہے..."
                    : txType === "Payment"
                    ? "وصولی درج کریں (Record Wasooli)"
                    : "ادھار درج کریں (Record Udhar)"}
                </button>
              </div>
            </form>

            {/* Ledger Transactions Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">تاریخ (Date)</th>
                    <th className="py-2.5 px-3">قسم (Type)</th>
                    <th className="py-2.5 px-3">تفصیل (Details)</th>
                    <th className="py-2.5 px-3 text-right">مقدار (Qty)</th>
                    <th className="py-2.5 px-3 text-right">ادھار (Debit)</th>
                    <th className="py-2.5 px-3 text-right">وصولی (Credit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {ledgerRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        کوئی کھاتہ انٹری موجود نہیں
                      </td>
                    </tr>
                  ) : (
                    ledgerRecords.map((r) => {
                      const isPay = r.is_payment === 1;

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                            {formatDate(r.date)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isPay
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : "bg-amber-100 text-amber-800 border-amber-300"
                              }`}
                            >
                              {isPay ? "وصولی / Payment" : r.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-900 font-bold">
                            {r.details || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-600">
                            {r.qty > 0 ? `${r.qty} L` : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-amber-700">
                            {!isPay ? formatRs(r.total) : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                            {isPay ? formatRs(r.total) : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOMER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-black text-slate-900 mb-1">
              نیا کھاتہ دار / ادھار کسٹمر بنائیں
            </h2>
            <p className="text-xs text-slate-500 font-medium mb-4">
              گاہک کا نام، گاڑی نمبر اور موبائل نمبر درج کریں تاکہ واٹس ایپ بل بھیجا جا سکے
            </p>

            <form onSubmit={handleAddCustomer} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  کسٹمر یا ڈرائیور کا نام *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Malik Shahzad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  کمپنی / ٹرانسپورٹ فرم (اختیاری)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Al-Madina Goods Transport"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  گاڑی نمبر (Vehicle No)
                </label>
                <input
                  type="text"
                  placeholder="e.g. LES-4412 / TKL-900"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  واٹس ایپ / موبائل نمبر * (WhatsApp Phone)
                </label>
                <input
                  type="text"
                  required
                  placeholder="03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={addingCustomer}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
                >
                  {addingCustomer ? "شامل ہو رہا ہے..." : "کھاتہ کھولیں (Create Account)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK ADD PAYMENT (وصولی جمع کریں) */}
      {showQuickPaymentModal && paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800">
                  <ArrowDownCircle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    وصولی جمع کریں (Record Payment)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{paymentCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickPaymentModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Current Balance Display */}
            <div className="my-4 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-900 font-bold block">موجودہ بقایا واجبات (Balance):</span>
                <span className="text-xl font-black font-mono text-amber-950">{formatRs(paymentCustomer.balance)}</span>
              </div>
              {paymentAmount && (
                <div className="text-right">
                  <span className="text-[10px] text-emerald-800 font-bold block">وصولی کے بعد نیا بقایا:</span>
                  <span className="text-sm font-black font-mono text-emerald-900">
                    {formatRs(Math.max(0, (paymentCustomer.balance || 0) - (parseFloat(paymentAmount) || 0)))}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveQuickPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  تاریخ وصولی (Payment Date)
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-white">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <input
                    type="text"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-full text-xs font-bold font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 uppercase mb-1">
                  وصول شدہ رقم روپے (Amount Received PKR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rs.</span>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="مثلاً 5000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-lg font-black font-mono text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  طریقہ ادائیگی (Payment Method)
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:border-emerald-500"
                >
                  <option value="Cash">کیش نقد (Cash)</option>
                  <option value="Bank Transfer">بینک ٹرانسفر / آن لائن (Bank)</option>
                  <option value="JazzCash">جاز کیش (JazzCash)</option>
                  <option value="EasyPaisa">ایزی پیسہ (EasyPaisa)</option>
                  <option value="Cheque">چیک (Cheque)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  تفصیل / رسید نمبر (Notes / Ref)
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: رسید نمبر 104 یا ڈرائیور کے ہاتھ بھیجا"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickPaymentModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
                >
                  {submittingPayment ? "محفوظ ہو رہا ہے..." : "وصولی محفوظ کریں (Save Payment)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
