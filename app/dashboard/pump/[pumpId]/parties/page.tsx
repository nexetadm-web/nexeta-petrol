"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BookOpen,
  Users,
  Plus,
  Search,
  ArrowLeft,
  Share2,
  Printer,
  Calendar,
  History,
  X,
  CreditCard,
  Droplets,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Phone
} from "lucide-react";
import { formatPKDate } from "@/lib/formatters";

interface PartyItem {
  id: number;
  name: string;
  phone: string;
  vehicle_no?: string | null;
  balance: number;
  credit_limit: number;
  status: string;
}

interface TransactionItem {
  id: number;
  party_id: number;
  type: "credit" | "debit";
  liters: number;
  rate: number;
  amount: number;
  date: string;
  description: string;
  created_at?: string;
}

export default function PartiesPage() {
  const params = useParams();
  const pumpId = params?.pumpId as string;

  const [parties, setParties] = useState<PartyItem[]>([]);
  const [pumpName, setPumpName] = useState<string>("Nexeta Petrol");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [showIssueFuelModal, setShowIssueFuelModal] = useState(false);
  const [showReceivePayModal, setShowReceivePayModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  // Selected party for transaction / ledger
  const [selectedParty, setSelectedParty] = useState<PartyItem | null>(null);
  const [ledgerTx, setLedgerTx] = useState<TransactionItem[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Form states
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyPhone, setNewPartyPhone] = useState("");
  const [newPartyVehicle, setNewPartyVehicle] = useState("");
  const [newPartyBalance, setNewPartyBalance] = useState("0");
  const [newPartyLimit, setNewPartyLimit] = useState("50000");

  // Fuel issue form
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelRate, setFuelRate] = useState("320");
  const [fuelAmount, setFuelAmount] = useState("");
  const [fuelDate, setFuelDate] = useState("");

  // Payment receive form
  const [payAmount, setPayAmount] = useState("");
  const [payDesc, setPayDesc] = useState("کیش وصولی");
  const [payDate, setPayDate] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const fetchParties = async () => {
    if (!pumpId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pumps/${pumpId}/parties`);
      const data = await res.json();
      if (data.success) {
        setParties(data.parties || []);
        if (data.pump_name) setPumpName(data.pump_name);
      }
    } catch (e) {
      console.error("Parties load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [pumpId]);

  // Sub-millisecond instant search filter
  const filteredParties = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return parties;
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.vehicle_no && p.vehicle_no.toLowerCase().includes(q))
    );
  }, [parties, searchQuery]);

  // Overall Totals
  const totalReceivable = useMemo(() => {
    return parties.reduce((acc, p) => acc + (p.balance > 0 ? p.balance : 0), 0);
  }, [parties]);

  // Auto calculate fuel amount
  useEffect(() => {
    const l = parseFloat(fuelLiters) || 0;
    const r = parseFloat(fuelRate) || 0;
    if (l > 0 && r > 0) {
      setFuelAmount(String(Math.round(l * r)));
    }
  }, [fuelLiters, fuelRate]);

  // Add Party Submit (Optimistic UI <50ms)
  const handleAddParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const initBal = parseFloat(newPartyBalance) || 0;
    const optimisticParty: PartyItem = {
      id: Date.now(),
      name: newPartyName,
      phone: newPartyPhone,
      vehicle_no: newPartyVehicle || null,
      balance: initBal,
      credit_limit: parseFloat(newPartyLimit) || 50000,
      status: "active",
    };

    setParties((prev) => [optimisticParty, ...prev]);
    setShowAddPartyModal(false);

    try {
      await fetch(`/api/pumps/${pumpId}/parties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPartyName,
          phone: newPartyPhone,
          vehicle_no: newPartyVehicle,
          opening_balance: initBal,
          credit_limit: parseFloat(newPartyLimit) || 50000,
        }),
      });
      // reset
      setNewPartyName("");
      setNewPartyPhone("");
      setNewPartyVehicle("");
      setNewPartyBalance("0");
      await fetchParties();
    } catch (err) {
      console.error("Add party error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Issue Fuel Submit (Optimistic UI <50ms)
  const handleIssueFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;
    setSubmitting(true);

    const amt = parseFloat(fuelAmount) || 0;
    const partyId = selectedParty.id;

    // Instant balance update in UI
    setParties((prev) =>
      prev.map((p) => (p.id === partyId ? { ...p, balance: p.balance + amt } : p))
    );
    setShowIssueFuelModal(false);

    try {
      await fetch(`/api/pumps/${pumpId}/parties/${partyId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "credit",
          liters: parseFloat(fuelLiters) || 0,
          rate: parseFloat(fuelRate) || 0,
          amount: amt,
          date: fuelDate,
          description: `ادھار تیل ${fuelLiters}L @ Rs. ${fuelRate}`,
        }),
      });
      setFuelLiters("");
      setFuelAmount("");
    } catch (err) {
      console.error("Issue fuel error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Receive Payment Submit (Optimistic UI <50ms)
  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;
    setSubmitting(true);

    const amt = parseFloat(payAmount) || 0;
    const partyId = selectedParty.id;

    // Instant balance reduction in UI
    setParties((prev) =>
      prev.map((p) => (p.id === partyId ? { ...p, balance: p.balance - amt } : p))
    );
    setShowReceivePayModal(false);

    try {
      await fetch(`/api/pumps/${pumpId}/parties/${partyId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "debit",
          amount: amt,
          date: payDate,
          description: payDesc || "کیش وصولی",
        }),
      });
      setPayAmount("");
      setPayDesc("کیش وصولی");
    } catch (err) {
      console.error("Payment receive error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Ledger
  const handleOpenLedger = async (party: PartyItem) => {
    setSelectedParty(party);
    setShowLedgerModal(true);
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/pumps/${pumpId}/parties/${party.id}/transactions`);
      const data = await res.json();
      if (data.success) {
        setLedgerTx(data.transactions || []);
      }
    } catch (e) {
      console.error("Ledger load error:", e);
    } finally {
      setLoadingLedger(false);
    }
  };

  // WhatsApp Bill Sender
  const handleSendWhatsAppBill = (party: PartyItem) => {
    const cleanPhone = party.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;

    const message =
      `محترم *${party.name}* صاحب،\n\n` +
      `پٹرول پمپ: *${pumpName}*\n` +
      `گاڑی نمبر: ${party.vehicle_no || "ریکارڈ شدہ"}\n` +
      `آپ کے کھاتے کا کل بقایا واجب الادا بیلنس: *Rs. ${Math.round(party.balance).toLocaleString()}* ہے.\n\n` +
      `برائے مہربانی جلد از جلد ادائیگی فرمائیں۔\n` +
      `شکریہ!\n` +
      `_Nexeta Petrol Automated Station_`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 space-y-6 print:p-0 print:bg-white">
      {/* Top Header */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
            <Link href={`/dashboard/pump/${pumpId}/tanks`} className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ٹینکس لسٹ</span>
            </Link>
            <span>•</span>
            <span>پارٹی و ادھار لیجر سسٹم</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <span>پارٹی کھاتہ و آٹومیٹک واٹس ایپ بل (Parties & Fleet Ledger)</span>
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            کمرشل کسٹمرز اور گاڑیوں کا ادھار ایندھن، ادائیگیوں کا لیجر اور ایک کلک پر فوری واٹس ایپ بل بھیجیں۔
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddPartyModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ نئی پارٹی شامل کریں</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase block mb-1">
            کل واجب الادا ادھار (Total Receivable)
          </span>
          <div className="text-2xl lg:text-3xl font-black text-rose-600 font-mono">
            Rs. {Math.round(totalReceivable).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            مارکیٹ میں ریکوری بیلنس
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase block mb-1">
            کل رجسٹرڈ پارٹیز
          </span>
          <div className="text-2xl lg:text-3xl font-black text-indigo-600 font-mono">
            {parties.length}
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            فلِیٹ و ادھار کسٹمرز
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase block mb-1">
            واٹس ایپ بلنگ سسٹم
          </span>
          <div className="text-2xl lg:text-3xl font-black text-emerald-600 flex items-center gap-2">
            <span>فعال (Active)</span>
            <Share2 className="w-6 h-6" />
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            1-Click WhatsApp Reminders
          </span>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="print:hidden bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="پارٹی کا نام، فون یا گاڑی نمبر تلاش کریں... (<20ms)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500">
          ظاہر کردہ پارٹیز: <strong>{filteredParties.length}</strong>
        </div>
      </div>

      {/* Parties Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 text-center">#</th>
                <th className="py-3.5 px-4 text-right">پارٹی کا نام</th>
                <th className="py-3.5 px-4 text-right">موبائل نمبر</th>
                <th className="py-3.5 px-4 text-right">گاڑی نمبر</th>
                <th className="py-3.5 px-4 text-right">موجودہ بقایا (Balance)</th>
                <th className="py-3.5 px-4 text-center">ایکشنز</th>
                <th className="py-3.5 px-4 text-center">واٹس ایپ بل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>پارٹیز لوڈ ہو رہی ہیں...</span>
                  </td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    کوئی پارٹی ریکارڈ نہیں ملا
                  </td>
                </tr>
              ) : (
                filteredParties.map((party, idx) => (
                  <tr key={party.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                      {party.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {party.phone}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-600">
                      {party.vehicle_no || "—"}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-black text-sm">
                      <span className={party.balance > 0 ? "text-rose-600" : "text-emerald-600"}>
                        Rs. {Math.round(party.balance).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedParty(party);
                            setShowIssueFuelModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors"
                          title="ادھار تیل جاری کریں"
                        >
                          + تیل جاری
                        </button>
                        <button
                          onClick={() => {
                            setSelectedParty(party);
                            setShowReceivePayModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] transition-colors"
                          title="ادائیگی وصول کریں"
                        >
                          وصولی
                        </button>
                        <button
                          onClick={() => handleOpenLedger(party)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                          title="لیجر اسٹیٹمنٹ"
                        >
                          لیجر
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleSendWhatsAppBill(party)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp Bill</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add New Party */}
      {showAddPartyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900">+ نئی پارٹی شامل کریں</h3>
              <button onClick={() => setShowAddPartyModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddParty} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">پارٹی / کسٹمر کا نام *</label>
                <input
                  type="text"
                  required
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="مثال: حاجی افضل یا شاہین ٹرانسپورٹ"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">موبائل نمبر (واٹس ایپ) *</label>
                <input
                  type="text"
                  required
                  value={newPartyPhone}
                  onChange={(e) => setNewPartyPhone(e.target.value)}
                  placeholder="03001234567"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">گاڑی نمبر (اختیاری)</label>
                <input
                  type="text"
                  value={newPartyVehicle}
                  onChange={(e) => setNewPartyVehicle(e.target.value)}
                  placeholder="LES-1234"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ابتدائی بقایا (Rs.)</label>
                  <input
                    type="number"
                    value={newPartyBalance}
                    onChange={(e) => setNewPartyBalance(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ادھار لمٹ (Rs.)</label>
                  <input
                    type="number"
                    value={newPartyLimit}
                    onChange={(e) => setNewPartyLimit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPartyModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                >
                  پارٹی محفوظ کریں
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Issue Fuel On Credit */}
      {showIssueFuelModal && selectedParty && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-lg text-slate-900">ادھار ایندھن جاری کریں</h3>
                <span className="text-xs font-bold text-indigo-600">{selectedParty.name}</span>
              </div>
              <button onClick={() => setShowIssueFuelModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleIssueFuel} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">لیٹرز (Liters) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    placeholder="مثال: 50"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ریٹ فی لیٹر (Rs.) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={fuelRate}
                    onChange={(e) => setFuelRate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">کل رقم (Total Amount Rs.) *</label>
                <input
                  type="number"
                  required
                  value={fuelAmount}
                  onChange={(e) => setFuelAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-indigo-300 bg-indigo-50/50 text-base font-black font-mono text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between">
                <span className="text-slate-500 font-bold">موجودہ بقایا:</span>
                <span className="font-black text-slate-900">Rs. {Math.round(selectedParty.balance).toLocaleString()}</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIssueFuelModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                >
                  تیل جاری کریں
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Receive Payment */}
      {showReceivePayModal && selectedParty && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-lg text-slate-900">ادائیگی / وصولی جمع کریں</h3>
                <span className="text-xs font-bold text-emerald-600">{selectedParty.name}</span>
              </div>
              <button onClick={() => setShowReceivePayModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleReceivePayment} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصول شدہ رقم (Amount Rs.) *</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="مثال: 25000"
                  className="w-full px-3 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50 text-base font-black font-mono text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تفصیل / ذریعہ ادائیگی</label>
                <input
                  type="text"
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  placeholder="کیش / آن لائن بینک ٹرانسفر"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between">
                <span className="text-slate-500 font-bold">کل واجب الادا:</span>
                <span className="font-black text-rose-600">Rs. {Math.round(selectedParty.balance).toLocaleString()}</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReceivePayModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  وصولی جمع کریں
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Full Ledger Statement */}
      {showLedgerModal && selectedParty && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-lg text-slate-900">
                  کھاتہ لیجر: {selectedParty.name} ({selectedParty.phone})
                </h3>
                <span className="text-xs font-bold text-rose-600">
                  بقایا واجب الادا: Rs. {Math.round(selectedParty.balance).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600"
                  title="پرنٹ کریں"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setShowLedgerModal(false)} className="p-2 rounded-xl hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto my-4">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">تاریخ</th>
                    <th className="py-2.5 px-3">تفصیل</th>
                    <th className="py-2.5 px-3 text-center">لیٹرز</th>
                    <th className="py-2.5 px-3 text-center">نوعیت</th>
                    <th className="py-2.5 px-3 text-left">رقم (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingLedger ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">لوڈ ہو رہا ہے...</td>
                    </tr>
                  ) : ledgerTx.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">کوئی ٹرانزیکشن موجود نہیں ہے</td>
                    </tr>
                  ) : (
                    ledgerTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{formatPKDate(tx.date)}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-600">{tx.description}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                          {tx.liters > 0 ? `${tx.liters} L` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.type === "credit"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {tx.type === "credit" ? "ادھار تیل" : "وصولی"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-black text-slate-900">
                          Rs. {Math.round(tx.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={() => handleSendWhatsAppBill(selectedParty)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>واٹس ایپ بل بھیجیں</span>
              </button>
              <button
                onClick={() => setShowLedgerModal(false)}
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
