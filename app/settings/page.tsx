"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Fuel, 
  Gauge, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Droplet,
  Pencil
} from "lucide-react";
import { formatRs, formatLitres } from "@/lib/formatters";
import { Tank, Nozzle } from "@/lib/types";

export default function SettingsPage() {
  const [tanksList, setTanksList] = useState<any[]>([]);
  const [nozzlesList, setNozzlesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Low Stock Alert Threshold State
  const [lowStockThreshold, setLowStockThreshold] = useState("20");
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Add Tank State
  const [tankName, setTankName] = useState("");
  const [fuelType, setFuelType] = useState<"Petrol" | "Diesel" | "HiOctane">("Petrol");
  const [capacity, setCapacity] = useState("25000");
  const [initialStock, setInitialStock] = useState("10000");
  const [addingTank, setAddingTank] = useState(false);

  // Edit Tank State
  const [showEditTankModal, setShowEditTankModal] = useState(false);
  const [editTankId, setEditTankId] = useState<number | null>(null);
  const [editTankName, setEditTankName] = useState("");
  const [editTankFuelType, setEditTankFuelType] = useState<"Petrol" | "Diesel" | "HiOctane">("Petrol");
  const [editTankCapacity, setEditTankCapacity] = useState("25000");

  // Add Nozzle State
  const [nozzleName, setNozzleName] = useState("");
  const [selectedTankId, setSelectedTankId] = useState("");
  const [addingNozzle, setAddingNozzle] = useState(false);

  // Edit Nozzle State
  const [showEditNozzleModal, setShowEditNozzleModal] = useState(false);
  const [editNozzleId, setEditNozzleId] = useState<number | null>(null);
  const [editNozzleName, setEditNozzleName] = useState("");
  const [editNozzleTankId, setEditNozzleTankId] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resTanks, resNozzles, resSettings] = await Promise.all([
        fetch("/api/tanks"),
        fetch("/api/nozzles"),
        fetch("/api/settings"),
      ]);

      const dataTanks = await resTanks.json();
      const dataNozzles = await resNozzles.json();
      const dataSettings = await resSettings.json();

      if (dataSettings.settings?.low_stock_threshold) {
        setLowStockThreshold(dataSettings.settings.low_stock_threshold.toString());
      }

      if (dataTanks.tanks) {
        setTanksList(dataTanks.tanks);
        if (dataTanks.tanks.length > 0 && !selectedTankId) {
          setSelectedTankId(dataTanks.tanks[0].id.toString());
        }
      }
      if (dataNozzles.nozzles) {
        setNozzlesList(dataNozzles.nozzles);
        setNozzleName(`Nozzle ${dataNozzles.nozzles.length + 1}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load tanks and nozzles");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(lowStockThreshold);
    if (isNaN(val) || val < 1 || val > 90) {
      alert("براہ کرم 1% سے 90% کے درمیان الرٹ ویلیو درج کریں");
      return;
    }
    try {
      setSavingThreshold(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "low_stock_threshold", value: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update setting");
      setSuccessMsg(`کم اسٹاک الرٹ کی حد کامیابی سے ${val}% پر مقرر کر دی گئی!`);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error saving setting");
    } finally {
      setSavingThreshold(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Add Tank
  const handleAddTank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tankName) return;

    try {
      setAddingTank(true);
      setErrorMsg("");

      const res = await fetch("/api/tanks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tankName,
          fuel_type: fuelType,
          capacity: parseFloat(capacity) || 25000,
          current_stock: parseFloat(initialStock) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create tank");

      setTankName("");
      fetchData();
      setSuccessMsg("نیا ٹینک کامیابی سے شامل ہو گیا!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error adding tank");
    } finally {
      setAddingTank(false);
    }
  };

  // Handle Delete Tank
  const handleDeleteTank = async (id: number) => {
    if (!confirm("کیا آپ واقعی اس ٹینک کو ڈیلیٹ کرنا چاہتے ہیں؟ اس سے منسلک نوزلز بھی ڈیلیٹ ہو جائیں گی۔")) return;

    try {
      const res = await fetch(`/api/tanks?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete tank");

      fetchData();
      setSuccessMsg("ٹینک ڈیلیٹ ہو گیا");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error deleting tank");
    }
  };

  // Handle Add Nozzle (4 to 20 dynamic support)
  const handleAddNozzle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nozzlesList.length >= 20) {
      setErrorMsg("زیادہ سے زیادہ 20 نوزلز کی اجازت ہے (Maximum 20 nozzles limit reached)");
      return;
    }

    try {
      setAddingNozzle(true);
      setErrorMsg("");

      const res = await fetch("/api/nozzles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nozzleName || `Nozzle ${nozzlesList.length + 1}`,
          tank_id: selectedTankId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add nozzle");

      fetchData();
      setSuccessMsg("نئی نوزل کامیابی سے شامل ہو گئی!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error adding nozzle");
    } finally {
      setAddingNozzle(false);
    }
  };

  // Handle Delete Nozzle
  const handleDeleteNozzle = async (id: number) => {
    if (nozzlesList.length <= 4) {
      setErrorMsg("کم از کم 4 نوزلز لازمی ہیں (Minimum 4 nozzles required)");
      return;
    }

    if (!confirm("کیا آپ واقعی اس نوزل کو حذف کرنا چاہتے ہیں؟")) return;

    try {
      const res = await fetch(`/api/nozzles?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete nozzle");

      fetchData();
      setSuccessMsg("نوزل ڈیلیٹ ہو گئی");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error deleting nozzle");
    }
  };

  // Open Edit Tank Modal
  const openEditTank = (tank: any) => {
    setEditTankId(tank.id);
    setEditTankName(tank.name);
    setEditTankFuelType(tank.fuel_type);
    setEditTankCapacity(tank.capacity?.toString() || "25000");
    setShowEditTankModal(true);
  };

  // Update Tank
  const handleUpdateTank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTankId || !editTankName) return;

    try {
      setErrorMsg("");
      const res = await fetch("/api/tanks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTankId,
          name: editTankName,
          fuel_type: editTankFuelType,
          capacity: parseFloat(editTankCapacity) || 25000,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update tank");

      setShowEditTankModal(false);
      setSuccessMsg("ٹینک کامیابی سے اپ ڈیٹ ہو گیا!");
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error updating tank");
    }
  };

  // Open Edit Nozzle Modal
  const openEditNozzle = (nozzle: any) => {
    setEditNozzleId(nozzle.id);
    setEditNozzleName(nozzle.name);
    setEditNozzleTankId(nozzle.tank_id?.toString() || (tanksList[0]?.id?.toString() || ""));
    setShowEditNozzleModal(true);
  };

  // Update Nozzle
  const handleUpdateNozzle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNozzleId || !editNozzleName || !editNozzleTankId) return;

    try {
      setErrorMsg("");
      const res = await fetch("/api/nozzles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editNozzleId,
          name: editNozzleName,
          tank_id: parseInt(editNozzleTankId),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update nozzle");

      setShowEditNozzleModal(false);
      setSuccessMsg("نوزل کامیابی سے اپ ڈیٹ ہو گئی!");
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error updating nozzle");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
          <span className="p-2 rounded-2xl bg-indigo-100 text-indigo-700">
            <Settings className="w-6 h-6" />
          </span>
          <span>ٹینک اور نوزل سیٹنگز</span>
          <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Dynamic Nozzles & Tanks</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          4 سے 20 نوزلز کی متحرک (Dynamic) کنفیگریشن اور انڈرگراؤنڈ اسٹوریج ٹینکس کا انتظام
        </p>
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

      {/* Dynamic Nozzles & Low Stock Threshold Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Dynamic Nozzles Counter Pill */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl">
              {nozzlesList.length}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm">
                  متحرک نوزلز (Dynamic Nozzles)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[10px] text-indigo-700 font-bold">
                  4 تا 20 نوزلز
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                فعال نوزلز کی کل تعداد
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">باقی گنجائش:</div>
            <div className="text-xs font-mono font-black text-emerald-700">
              {20 - nozzlesList.length} مزید نوزلز
            </div>
          </div>
        </div>

        {/* Low Stock Threshold Setting Card */}
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-2xl p-5 border-l-4 border-amber-500 border border-amber-200/70 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-200 text-amber-800 flex items-center justify-center font-black text-xl">
              ⚠️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm">
                  کم اسٹاک الرٹ کی حد (Low Stock Alert)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 text-[10px] font-bold">
                  Editable
                </span>
              </div>
              <p className="text-xs text-amber-900 font-medium mt-0.5">
                ٹینک گنجائش کا کتنا فیصد باقی رہنے پر الرٹ آئے
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveThreshold} className="flex items-center gap-2">
            <div className="relative w-20">
              <input
                type="number"
                min="5"
                max="50"
                step="1"
                required
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full pr-6 pl-2 py-1.5 rounded-xl border border-amber-300 font-mono font-black text-center text-sm text-slate-900 bg-white"
              />
              <span className="absolute right-2 top-2 text-xs font-bold text-slate-500">%</span>
            </div>
            <button
              type="submit"
              disabled={savingThreshold}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-102 disabled:opacity-50"
            >
              {savingThreshold ? "..." : "محفوظ"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: TANKS MANAGEMENT */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-cyan-600" />
              <span>نیا انڈرگراؤنڈ ٹینک بنائیں (Add Tank)</span>
            </h2>

            <form onSubmit={handleAddTank} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  ٹینک کا نام (Tank Name)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tank 4 (Super Petrol)"
                  value={tankName}
                  onChange={(e) => setTankName(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  ایندھن کی قسم (Fuel Type)
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:border-indigo-500"
                >
                  <option value="Petrol">Super Petrol (پٹرول)</option>
                  <option value="Diesel">High Speed Diesel (ڈیزل)</option>
                  <option value="HiOctane">Hi-Octane HOBC (اوکٹین)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    کل گنجائش لیٹرز (Capacity)
                  </label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-mono font-black text-slate-900 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    موجودہ اسٹاک (Initial Stock)
                  </label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-mono font-black text-slate-900 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={addingTank}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
                >
                  {addingTank ? "شامل ہو رہا ہے..." : "ٹینک شامل کریں (Create Tank)"}
                </button>
              </div>
            </form>
          </div>

          {/* Tanks List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                فعال ٹینکس (Active Fuel Tanks)
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">({tanksList.length} tanks)</span>
            </div>

            <div className="p-4 space-y-3">
              {tanksList.map((tank) => {
                const pct = Math.min(100, Math.round((tank.current_stock / tank.capacity) * 100));

                return (
                  <div key={tank.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{tank.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {tank.fuel_type} • منسلک نوزلز: {tank.nozzles?.length || 0}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {formatLitres(tank.current_stock)} / {formatLitres(tank.capacity)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditTank(tank)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Tank (ٹینک میں ترمیم)"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {tanksList.length > 1 && (
                            <button
                              onClick={() => handleDeleteTank(tank.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete Tank"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          tank.fuel_type === "Diesel"
                            ? "bg-amber-500"
                            : tank.fuel_type === "HiOctane"
                            ? "bg-pink-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 2: NOZZLES MANAGEMENT (4 to 20 Dynamic) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-600" />
              <span>نئی نوزل شامل کریں (Add Dynamic Nozzle)</span>
            </h2>

            <form onSubmit={handleAddNozzle} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  نوزل کا نام (Nozzle Name)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nozzle 7"
                  value={nozzleName}
                  onChange={(e) => setNozzleName(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  کون سے ٹینک سے منسلک ہو؟ (Linked Tank)
                </label>
                <select
                  value={selectedTankId}
                  onChange={(e) => setSelectedTankId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:border-indigo-500"
                >
                  {tanksList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} [{t.fuel_type}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={addingNozzle || nozzlesList.length >= 20}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
                >
                  {addingNozzle ? "شامل ہو رہی ہے..." : "نوزل شامل کریں (Add Nozzle)"}
                </button>
              </div>
            </form>
          </div>

          {/* Nozzles Grid / List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                فعال نوزلز لسٹ ({nozzlesList.length} Active Nozzles)
              </span>
              <span className="text-[10px] text-slate-500 font-bold">
                Minimum 4 Required
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto">
              {nozzlesList.map((nz) => {
                let badge = "bg-emerald-50 border-emerald-200 text-emerald-800";
                if (nz.fuelType === "Diesel") badge = "bg-amber-50 border-amber-200 text-amber-800";
                if (nz.fuelType === "HiOctane") badge = "bg-pink-50 border-pink-200 text-pink-800";

                return (
                  <div
                    key={nz.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between group hover:border-indigo-300 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                        <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{nz.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-1">
                        {nz.tankName || "Tank"}
                      </div>
                      <div className="mt-1">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${badge}`}>
                          {nz.fuelType}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditNozzle(nz)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit Nozzle (نوزل میں ترمیم)"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNozzle(nz.id)}
                        disabled={nozzlesList.length <= 4}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                        title={nozzlesList.length <= 4 ? "Cannot delete: Minimum 4 nozzles required" : "Delete Nozzle"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: EDIT TANK */}
      {showEditTankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-cyan-100 text-cyan-700">
                  <Pencil className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  ٹینک کی تفصیلات میں ترمیم (Edit Tank)
                </h3>
              </div>
              <button
                onClick={() => setShowEditTankModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTank} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ٹینک کا نام (Tank Name)
                </label>
                <input
                  type="text"
                  required
                  value={editTankName}
                  onChange={(e) => setEditTankName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ایندھن کی قسم (Fuel Type)
                </label>
                <select
                  value={editTankFuelType}
                  onChange={(e) => setEditTankFuelType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                >
                  <option value="Petrol">Super Petrol (پیٹرول)</option>
                  <option value="Diesel">High Speed Diesel (ڈیزل)</option>
                  <option value="HiOctane">Hi-Octane HOBC (ہائی اوکٹین)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ٹینک گنجائش لیٹرز (Capacity Litres)
                </label>
                <input
                  type="number"
                  required
                  value={editTankCapacity}
                  onChange={(e) => setEditTankCapacity(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditTankModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102"
                >
                  تبدیلی محفوظ کریں (Save Changes)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT NOZZLE */}
      {showEditNozzleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Pencil className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  نوزل کی سیٹنگز میں ترمیم (Edit Nozzle)
                </h3>
              </div>
              <button
                onClick={() => setShowEditNozzleModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateNozzle} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  نوزل کا نام (Nozzle Name)
                </label>
                <input
                  type="text"
                  required
                  value={editNozzleName}
                  onChange={(e) => setEditNozzleName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  منسلک ٹینک و ایندھن (Linked Tank & Fuel)
                </label>
                <select
                  value={editNozzleTankId}
                  onChange={(e) => setEditNozzleTankId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                >
                  {tanksList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} [{t.fuel_type}]
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  ٹینک تبدیل کرنے سے نوزل کا ایندھن (Fuel Type) خودکار طور پر تبدیل ہو جائے گا۔
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditNozzleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102"
                >
                  تبدیلی محفوظ کریں (Save Changes)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
