"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
  Fuel, 
  Droplets, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Save, 
  ArrowLeft, 
  Sliders, 
  Layers, 
  Sparkles, 
  Search,
  Eye,
  Check
} from "lucide-react";
import { formatLitres } from "@/lib/formatters";
import { getStockFromDip, parseDipChartCSV, generateLinearDipChart, DipChartEntry } from "@/lib/stock";

interface TankItem {
  id: number;
  pump_id: number;
  tank_no: number;
  name: string;
  tank_name: string;
  fuel_type: string;
  product: string;
  capacity_liters: number;
  height_mm: number;
  current_dip_mm: number;
  current_stock_liters: number;
  has_dip_chart: boolean;
  chart_rows_count?: number;
  dip_chart_image_url?: string | null;
}

export default function CentralDipChartPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pumpId = params?.pumpId as string;
  const initialTankId = searchParams.get("tank");

  const [tanks, setTanks] = useState<TankItem[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<number | null>(null);
  const [loadingTanks, setLoadingTanks] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [saving, setSaving] = useState(false);

  // Active Tab: "manual" | "csv" | "ocr"
  const [activeTab, setActiveTab] = useState<"manual" | "csv" | "ocr">("manual");

  // Chart Rows
  const [chartRows, setChartRows] = useState<DipChartEntry[]>([]);
  const [chartImageUrl, setChartImageUrl] = useState<string | null>(null);

  // Status & Feedback
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Test Calculator State
  const [testDipMm, setTestDipMm] = useState<string>("500");

  // CSV State
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // OCR State
  const [ocrImageSrc, setOcrImageSrc] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStatusText, setOcrStatusText] = useState<string>("");
  const [ocrProcessing, setOcrProcessing] = useState<boolean>(false);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Tanks List
  useEffect(() => {
    if (!pumpId) return;
    setLoadingTanks(true);
    fetch(`/api/pumps/${pumpId}/tanks/dip-charts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.tanks)) {
          setTanks(data.tanks);
          if (data.tanks.length > 0) {
            if (initialTankId) {
              const matched = data.tanks.find((t: TankItem) => String(t.id) === initialTankId);
              if (matched) {
                setSelectedTankId(matched.id);
                return;
              }
            }
            setSelectedTankId(data.tanks[0].id);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load tanks for dip charts:", err);
      })
      .finally(() => setLoadingTanks(false));
  }, [pumpId, initialTankId]);

  // 2. Fetch Chart for Selected Tank
  useEffect(() => {
    if (!pumpId || !selectedTankId) return;
    setLoadingChart(true);
    setStatusMessage(null);
    fetch(`/api/pumps/${pumpId}/tanks/dip-charts?tankId=${selectedTankId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (Array.isArray(data.chart) && data.chart.length > 0) {
            setChartRows(data.chart);
          } else {
            // Default blank starter template
            setChartRows([
              { dip_mm: 0, volume_liters: 0 },
              { dip_mm: 100, volume_liters: 1200 },
              { dip_mm: 500, volume_liters: 6500 },
              { dip_mm: 1000, volume_liters: 14000 },
              { dip_mm: 1500, volume_liters: 22500 },
              { dip_mm: 2000, volume_liters: 32000 },
              { dip_mm: 2500, volume_liters: 40000 },
            ]);
          }
          if (data.tank?.dip_chart_image_url) {
            setChartImageUrl(data.tank.dip_chart_image_url);
          } else {
            setChartImageUrl(null);
          }
        }
      })
      .catch((err) => console.error("Failed to load tank dip chart:", err))
      .finally(() => setLoadingChart(false));
  }, [pumpId, selectedTankId]);

  const currentTank = tanks.find((t) => t.id === selectedTankId);

  // Row Manipulation
  const handleAddRow = () => {
    const lastRow = chartRows[chartRows.length - 1];
    const nextDip = lastRow ? lastRow.dip_mm + 50 : 50;
    const nextVol = lastRow ? lastRow.volume_liters + 800 : 800;
    setChartRows([...chartRows, { dip_mm: nextDip, volume_liters: nextVol }]);
  };

  const handleUpdateRow = (index: number, field: "dip_mm" | "volume_liters", value: number) => {
    const updated = [...chartRows];
    updated[index] = { ...updated[index], [field]: isNaN(value) ? 0 : value };
    setChartRows(updated);
  };

  const handleDeleteRow = (index: number) => {
    if (chartRows.length <= 1) {
      alert("کم از کم ایک ڈِپ پوائنٹ برقرار رکھنا ضروری ہے");
      return;
    }
    setChartRows(chartRows.filter((_, i) => i !== index));
  };

  const handleGenerateLinearSteps = (stepMm: number) => {
    if (!currentTank) return;
    const height = currentTank.height_mm || 2500;
    const capacity = currentTank.capacity_liters || 40000;
    const generated = generateLinearDipChart(height, capacity, stepMm);
    setChartRows(generated);
    setStatusMessage({
      type: "success",
      text: `${generated.length} معیاری ریڈنگز (${stepMm}mm وقفہ) کامیابی سے تیار ہو گئیں!`,
    });
  };

  // CSV Upload Handler
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const { rows, errors } = parseDipChartCSV(text);
      setCsvErrors(errors);

      if (rows.length > 0) {
        setChartRows(rows);
        setStatusMessage({
          type: "success",
          text: `CSV سے ${rows.length} ڈِپ پوائنٹس کامیابی سے لوڈ ہو گئے! براہ کرم جائزہ لے کر نیچے محفوظ کریں۔`,
        });
        setActiveTab("manual");
      } else {
        setStatusMessage({
          type: "error",
          text: "CSV فائل میں درست ڈِپ ڈیٹا نہیں ملا۔ براہ کرم سیمپل فارمیٹ چیک کریں۔",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const header = "dip_mm,volume_liters\n";
    const sampleRows = [
      "0,0",
      "50,620",
      "100,1350",
      "200,2900",
      "500,7800",
      "1000,16500",
      "1500,25000",
      "2000,33500",
      "2500,40000",
    ].join("\n");

    const blob = new Blob([header + sampleRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sample_dip_chart_${currentTank?.tank_name || "tank"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // OCR Recognition with Tesseract.js
  const handleOcrImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setOcrImageSrc(src);
      setChartImageUrl(src);
    };
    reader.readAsDataURL(file);
  };

  const handleRunOcr = async () => {
    if (!ocrImageSrc) {
      alert("پہلے ڈِپ چارٹ کی تصویر اپلوڈ کریں");
      return;
    }

    setOcrProcessing(true);
    setOcrProgress(5);
    setOcrStatusText("Tesseract ماڈل لوڈ ہو رہا ہے...");

    try {
      const Tesseract = (await import("tesseract.js")).default;
      const result = await Tesseract.recognize(ocrImageSrc, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
            setOcrStatusText(`تصویر پڑھ رہا ہے... ${Math.round(m.progress * 100)}%`);
          } else {
            setOcrStatusText(m.status);
          }
        },
      });

      const extractedText = result.data.text || "";
      const lines = extractedText.split("\n");
      const extractedRows: DipChartEntry[] = [];

      lines.forEach((line) => {
        const cleaned = line.replace(/[^0-9.,\s-]/g, " ").trim();
        const parts = cleaned.split(/[\s,]+/).filter(Boolean);
        if (parts.length >= 2) {
          const d = parseFloat(parts[0]);
          const v = parseFloat(parts[1]);
          if (!isNaN(d) && !isNaN(v) && d >= 0 && v >= 0) {
            extractedRows.push({ dip_mm: Math.round(d), volume_liters: Math.round(v) });
          }
        }
      });

      if (extractedRows.length > 0) {
        // Sort & deduplicate
        extractedRows.sort((a, b) => a.dip_mm - b.dip_mm);
        setChartRows(extractedRows);
        setStatusMessage({
          type: "success",
          text: `تصویر (OCR) سے ${extractedRows.length} ڈِپ ریڈنگز کامیابی سے نکال لی گئیں!`,
        });
        setActiveTab("manual");
      } else {
        setStatusMessage({
          type: "error",
          text: "تصویر سے درست ٹیبل ڈیٹا نہیں ملا۔ براہ کرم تصویر واضح کھینچیں یا دستی / CSV درج کریں۔",
        });
      }
    } catch (err: any) {
      console.error("OCR Error:", err);
      setStatusMessage({
        type: "error",
        text: `OCR ایرر: ${err.message || "تصویر کو پڑھنے میں ناکامی"}`,
      });
    } finally {
      setOcrProcessing(false);
      setOcrProgress(0);
      setOcrStatusText("");
    }
  };

  // Save Dip Chart
  const handleSaveChart = async () => {
    if (!selectedTankId) {
      alert("پہلے ٹینک منتخب کریں");
      return;
    }

    if (chartRows.length === 0) {
      alert("کم از کم ایک ڈِپ پوائنٹ ہونا ضروری ہے");
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/pumps/${pumpId}/tanks/dip-charts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tank_id: selectedTankId,
          rows: chartRows,
          image_url: chartImageUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: data.message || "ڈِپ چارٹ کامیابی سے محفوظ ہو گیا!",
        });
        // Update local tanks list status
        setTanks((prev) =>
          prev.map((t) =>
            t.id === selectedTankId
              ? { ...t, has_dip_chart: true, chart_rows_count: data.count }
              : t
          )
        );
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "ڈِپ چارٹ محفوظ کرنے میں مسئلہ پیش آیا",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "نیٹ ورک خرابی",
      });
    } finally {
      setSaving(false);
    }
  };

  // Live Calculator test
  const testDipNum = parseFloat(testDipMm) || 0;
  const calculatedTestStock = getStockFromDip(
    testDipNum,
    chartRows,
    currentTank?.capacity_liters || 40000
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
            <Link
              href={`/dashboard/pump/${pumpId}/tanks`}
              className="hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ٹینکس لسٹ پر واپس جائیں</span>
            </Link>
            <span>•</span>
            <span>مرکزی ڈِپ چارٹ مینیجر</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>ہر ٹینک کا الگ ڈِپ چارٹ اسائنر (Dip Chart Assigner)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ہر انڈر گراؤنڈ ٹینک کے لیے مخصوص کیلیبریشن شیٹ فیڈ کریں۔ پیمائش صرف ملی میٹر (mm) میں ہے۔
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveChart}
            disabled={saving || loadingChart || !selectedTankId}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition-all hover:shadow-lg disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? "محفوظ ہو رہا ہے..." : "ڈِپ چارٹ محفوظ کریں"}</span>
          </button>
        </div>
      </div>

      {/* Tank Selector Dropdown */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <label className="block text-sm font-black text-slate-800 mb-2">
          کس ٹینک کے لیے ڈِپ چارٹ لگانا ہے؟ ٹینک منتخب کریں *
        </label>

        {loadingTanks ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            ٹینکوں کی لسٹ لوڈ ہو رہی ہے...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <select
                value={selectedTankId || ""}
                onChange={(e) => setSelectedTankId(Number(e.target.value))}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-indigo-200 bg-indigo-50/30 text-slate-900 font-bold text-base focus:outline-none focus:border-indigo-600"
              >
                {tanks.map((t) => (
                  <option key={t.id} value={t.id}>
                    ٹینک #{t.tank_no || t.id} - {t.tank_name || t.name} ({t.product || t.fuel_type}) - گنجائش: {formatLitres(t.capacity_liters)}L - اونچائی: {t.height_mm}mm {t.has_dip_chart ? "✅ [چارٹ موجود]" : "❌ [چارٹ نہیں لگا]"}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Tank Overview Card */}
            {currentTank && (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  currentTank.has_dip_chart
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-300 text-rose-900"
                }`}
              >
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">اسٹیٹس</div>
                  <div className="font-black text-sm flex items-center gap-1.5 mt-0.5">
                    {currentTank.has_dip_chart ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>✅ اپلوڈ شدہ ({chartRows.length} ریڈنگز)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>❌ ڈِپ چارٹ نہیں لگا</span>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] mt-1 text-slate-600 font-medium">
                    اونچائی: <strong>{currentTank.height_mm} mm</strong> | کیپیسٹی: <strong>{formatLitres(currentTank.capacity_liters)} L</strong>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
                    {currentTank.product || currentTank.fuel_type}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-bold ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 3 Tabs Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === "manual"
                ? "border-indigo-600 text-indigo-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>ٹیب 1: ٹیبل سے دستی انٹری ({chartRows.length} پوائنٹس)</span>
          </button>

          <button
            onClick={() => setActiveTab("csv")}
            className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === "csv"
                ? "border-indigo-600 text-indigo-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ٹیب 2: CSV فائل اپلوڈ (بلک ڈیٹا)</span>
          </button>

          <button
            onClick={() => setActiveTab("ocr")}
            className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === "ocr"
                ? "border-indigo-600 text-indigo-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>ٹیب 3: تصویر سے (OCR ریڈر)</span>
          </button>
        </div>

        {/* Tab 1: Manual Table */}
        {activeTab === "manual" && (
          <div className="p-6 space-y-6">
            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-indigo-50/40 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">خودکار معیاری وقفہ بنائیں:</span>
                <button
                  type="button"
                  onClick={() => handleGenerateLinearSteps(50)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-2xs"
                >
                  50mm وقفہ
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateLinearSteps(100)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-2xs"
                >
                  100mm وقفہ
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ نیا پوائنٹ شامل کریں</span>
                </button>
              </div>
            </div>

            {/* Live Dip Test Tool */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>لائیو ٹیسٹ کیلیبریٹر (چیک کریں کہ ڈِپ پر کتنے لیٹر بنتے ہیں):</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={testDipMm}
                    onChange={(e) => setTestDipMm(e.target.value)}
                    className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-sm text-center"
                    placeholder="mm"
                  />
                  <span className="text-xs font-bold text-slate-600">mm</span>
                </div>
                <div className="px-4 py-1.5 bg-indigo-600 text-white font-black text-sm rounded-lg shadow-2xs">
                  = {formatLitres(calculatedTestStock)} Litres
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-center w-16">نمبر</th>
                    <th className="py-3 px-4 text-right">ڈِپ پیمائش (ملی میٹر mm) *</th>
                    <th className="py-3 px-4 text-right">کیلیبریٹڈ حجم (لیٹرز Litres) *</th>
                    <th className="py-3 px-4 text-center w-24">ایکشن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chartRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-center font-bold text-slate-400 text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5 max-w-[200px]">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.dip_mm}
                            onChange={(e) =>
                              handleUpdateRow(idx, "dip_mm", parseFloat(e.target.value))
                            }
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold text-slate-400">mm</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5 max-w-[240px]">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={row.volume_liters}
                            onChange={(e) =>
                              handleUpdateRow(idx, "volume_liters", parseFloat(e.target.value))
                            }
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-700 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold text-slate-400">Litres</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف کریں"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-slate-500 font-semibold">
                ٹوٹل محفوظ ہونے والے پوائنٹس: <strong>{chartRows.length}</strong>
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ مزید لائن شامل کریں</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: CSV Upload */}
        {activeTab === "csv" && (
          <div className="p-8 space-y-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-4">
                <FileSpreadsheet className="w-12 h-12 text-indigo-500 mx-auto" />
                <div>
                  <h3 className="font-black text-slate-800 text-base">
                    ڈِپ چارٹ کی CSV فائل اپلوڈ کریں
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    فائل میں 2 کالم ہونے چاہئیں: <code>dip_mm,volume_liters</code>
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCsvFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>CSV فائل منتخب کریں</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-xl border border-slate-300 shadow-2xs transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>سیمپل CSV ڈاؤنلوڈ</span>
                  </button>
                </div>

                {csvFileName && (
                  <div className="p-3 bg-indigo-50 text-indigo-900 rounded-xl text-xs font-bold inline-block">
                    منتخب فائل: {csvFileName}
                  </div>
                )}
              </div>

              {csvErrors.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-800">
                  <div className="font-bold">فائل میں درج ذیل خامیاں پائی گئیں:</div>
                  <ul className="list-disc pr-4 space-y-0.5">
                    {csvErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>💡 رہنمائی:</strong> اگر آپ کے پاس ایکسل شیٹ ہے تو اسے CSV فارمیٹ میں سیو کر کے یہاں اپلوڈ کریں۔ تمام ریڈنگز خود بخود ٹیبل میں شفٹ ہو جائیں گی جہاں سے آپ انہیں محفوظ کر سکتے ہیں۔
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: OCR Reader */}
        {activeTab === "ocr" && (
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Image Upload & Preview */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-600" />
                  <span>کیلیبریشن شیٹ کی تصویر منتخب کریں</span>
                </h3>

                <input
                  ref={ocrFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleOcrImageSelect}
                  className="hidden"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => ocrFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>تصویر منتخب کریں</span>
                  </button>

                  {ocrImageSrc && (
                    <button
                      type="button"
                      onClick={handleRunOcr}
                      disabled={ocrProcessing}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{ocrProcessing ? "پڑھ رہا ہے..." : "Tesseract OCR سے ڈیٹا نکالیں"}</span>
                    </button>
                  )}
                </div>

                {ocrImageSrc ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-96 flex items-center justify-center p-2">
                    <img
                      src={ocrImageSrc}
                      alt="Calibration chart sheet"
                      className="max-h-80 object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <div className="p-12 border-2 border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-400">
                    کوئی تصویر منتخب نہیں ہوئی۔ اپنے کیلیبریشن پیپر کی واضح تصویر اپلوڈ کریں۔
                  </div>
                )}

                {ocrProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-indigo-700">
                      <span>{ocrStatusText}</span>
                      <span>{ocrProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full transition-all duration-200"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: OCR Results Info */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>ڈیٹا تصدیق و انٹری گائیڈ</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    جب آپ &quot;Tesseract OCR سے ڈیٹا نکالیں&quot; پر کلک کرتے ہیں تو سسٹم تصویر میں موجود ملی میٹر اور لیٹرز کے اعداد نکال کر خود بخود ٹیب 1 کے ٹیبل میں درج کر دیتا ہے۔
                  </p>
                  <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
                    <strong className="block font-bold">بہترین نتائج کے لیے:</strong>
                    <div>1. تصویر سیدھی، واضح اور مناسب روشنی میں ہو۔</div>
                    <div>2. کالم صاف نظر آ رہے ہوں۔</div>
                    <div>3. ڈیٹا نکلنے کے بعد ٹیب 1 میں جا کر ایک بار چیک کر لیں۔</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab("manual")}
                    className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl shadow-2xs"
                  >
                    ٹیبل میں ڈیٹا کا جائزہ لیں
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-between p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="text-xs text-slate-600">
          منتخب ٹینک: <strong className="text-slate-900">{currentTank?.tank_name || `Tank #${selectedTankId}`}</strong> | ٹوٹل ریڈنگز: <strong className="text-indigo-600 font-bold">{chartRows.length}</strong>
        </div>

        <button
          onClick={handleSaveChart}
          disabled={saving || loadingChart || !selectedTankId}
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition-all hover:shadow-lg disabled:opacity-50 transform active:scale-95"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? "محفوظ ہو رہا ہے..." : "ڈِپ چارٹ محفوظ کریں"}</span>
        </button>
      </div>
    </div>
  );
}
