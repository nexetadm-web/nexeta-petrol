"use client";

import React, { useState, useEffect } from "react";
import { Truck, PlusCircle, CheckCircle2, AlertTriangle, RefreshCw, Calendar, Droplet, Coins } from "lucide-react";
import { formatRs, formatLitres, getTodayDatePK, formatDate } from "@/lib/formatters";
import { FuelPurchase, Tank } from "@/lib/types";

export default function FuelPurchasesPage() {
  const [purchases, setPurchases] = useState<FuelPurchase[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Form state
  const [date, setDate] = useState<string>(getTodayDatePK());
  const [fuelType, setFuelType] = useState<string>("Petrol");
  const [qty, setQty] = useState<string>("");
  const [rate, setRate] = useState<string>("");
  const [supplier, setSupplier] = useState<string>("Pakistan State Oil (PSO)");
  const [tankId, setTankId] = useState<string>("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPurchases, resTanks] = await Promise.all([
        fetch("/api/purchases"),
        fetch("/api/tanks"),
      ]);

      const dataPurchases = await resPurchases.json();
      const dataTanks = await resTanks.json();

      if (dataPurchases.purchases) setPurchases(dataPurchases.purchases);
      if (dataTanks.tanks) {
        setTanks(dataTanks.tanks);
        if (dataTanks.tanks.length > 0 && !tankId) {
          setTankId(dataTanks.tanks[0].id.toString());
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalCost = (parseFloat(qty) || 0) * (parseFloat(rate) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const nQty = parseFloat(qty);
    const nRate = parseFloat(rate);

    if (isNaN(nQty) || isNaN(nRate) || nQty <= 0 || nRate <= 0) {
      setErrorMsg("مقدار اور ریٹ درست درج کریں (Please enter valid quantity and rate)");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formatDate(date),
          fuel_type: fuelType,
          qty: nQty,
          rate: nRate,
          supplier,
          tank_id: tankId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record purchase");

      setSuccessMsg(data.message || "فیول خریداری کا اندراج ہو گیا اور ٹینک کا اسٹاک بڑھا دیا گیا!");
      setShowModal(false);
      setQty("");
      setRate("");
      fetchData();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error submitting purchase");
    } finally {
      setSubmitting(false);
    }
  };

  const totalLitresBought = purchases.reduce((sum, p) => sum + (p.qty || 0), 0);
  const totalAmountSpent = purchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-emerald-100 text-emerald-700">
              <Truck className="w-6 h-6" />
            </span>
            <span>تیل خریداری (انورڈ)</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Fuel Tanker Purchases</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            آئل مارکیٹنگ کمپنی (PSO, Shell, Total, Attock) سے ٹینکر خریداری اور خودکار ٹینک اسٹاک ان
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all hover:scale-102"
          >
            <PlusCircle className="w-4 h-4" />
            <span>نئی خریداری درج کریں (Add Tanker)</span>
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

      {/* Top 2 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100 rounded-2xl p-6 border-l-4 border-emerald-500 border border-emerald-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-200 text-emerald-800 flex items-center justify-center shadow-sm">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                کل خریدا گیا فیول (Purchased)
              </span>
              <span className="text-xs text-emerald-900/70 font-semibold">Total Fuel Volume</span>
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-950 mt-4 font-mono tracking-tight">
            {formatLitres(totalLitresBought)}
          </div>
          <p className="text-xs text-emerald-900 font-bold mt-2">تمام ٹینکرز کی مجموعی مقدار (Litres)</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 rounded-2xl p-6 border-l-4 border-indigo-500 border border-indigo-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-200 text-indigo-800 flex items-center justify-center shadow-sm">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800 block">
                کل ادائیگی بل (Purchase Cost)
              </span>
              <span className="text-xs text-indigo-900/70 font-semibold">Total Invoiced Amount</span>
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-950 mt-4 font-mono tracking-tight">
            {formatRs(totalAmountSpent)}
          </div>
          <p className="text-xs text-indigo-900 font-bold mt-2">کمپنیوں کو ادا کردہ رقم (PKR)</p>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="text-xs font-black uppercase tracking-wider text-slate-800">
            خریداری انوائس لاگ (Purchase Invoices Log)
          </div>
          <button onClick={fetchData} className="p-1 rounded-lg text-slate-500 hover:text-slate-800">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">تاریخ (Date)</th>
                <th className="py-3 px-3">کمپنی / سپلائر (Supplier)</th>
                <th className="py-3 px-3">Fuel Type</th>
                <th className="py-3 px-3 text-right">مقدار (Quantity)</th>
                <th className="py-3 px-3 text-right">خرید ریٹ (Rate)</th>
                <th className="py-3 px-4 text-right">ٹوٹل بل (Total Cost)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    کوئی خریداری ریکارڈ موجود نہیں ہے
                  </td>
                </tr>
              ) : (
                purchases.map((p) => {
                  let badge = "bg-emerald-50 border-emerald-200 text-emerald-800";
                  if (p.fuel_type === "Diesel") badge = "bg-amber-50 border-amber-200 text-amber-800";
                  if (p.fuel_type === "HiOctane") badge = "bg-pink-50 border-pink-200 text-pink-800";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {formatDate(p.date)}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {p.supplier}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${badge}`}>
                          {p.fuel_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                        {formatLitres(p.qty)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 font-bold">
                        {formatRs(p.rate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                        {formatRs(p.total_cost)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD PURCHASE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-black text-slate-900 mb-1">
              نئی ٹینکر فیول خریداری درج کریں
            </h2>
            <p className="text-xs text-slate-500 font-medium mb-5">
              اندراج کرنے پر متعلقہ ٹینک کے اسٹاک میں خودکار اضافہ ہو جائے گا
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    تاریخ (DD-MM-YYYY)
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Fuel Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    ایندھن کی قسم (Fuel Type)
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                  >
                    <option value="Petrol">Super Petrol (پٹرول)</option>
                    <option value="Diesel">High Speed Diesel (ڈیزل)</option>
                    <option value="HiOctane">Hi-Octane HOBC (اوکٹین)</option>
                  </select>
                </div>
              </div>

              {/* Tank Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  ڈیکینٹیشن ٹینک (Destination Tank)
                </label>
                <select
                  value={tankId}
                  onChange={(e) => setTankId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                >
                  {tanks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (موجودہ اسٹاک: {t.current_stock.toLocaleString()} L)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity and Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    مقدار لیٹرز (Litres Quantity)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 15000"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-black font-mono text-slate-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    خرید ریٹ فی لیٹر (Purchase Rate)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 275.50"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-black font-mono text-slate-900 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Total Cost Display */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">کل خریداری لاگت:</span>
                <span className="font-mono font-black text-emerald-700 text-base">
                  {formatRs(totalCost)}
                </span>
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  آئل مارکیٹنگ کمپنی / سپلائر (Supplier)
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="PSO, Shell, Total Parco, Attock Petroleum..."
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:border-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
                >
                  {submitting ? "محفوظ ہو رہا ہے..." : "خریداری محفوظ کریں (Save)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
