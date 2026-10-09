"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Sliders,
  Plus,
  Trash2,
  Upload,
  Download,
  Printer,
  Save,
  Wand2,
  Table,
  LineChart as LineChartIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  FileSpreadsheet,
  Gauge,
  Droplets
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { formatLitres } from "@/lib/formatters";
import { generateLinearDipChart, parseDipChartCSV, DipChartEntry } from "@/lib/stock";

export default function TankDipChartPage() {
  const params = useParams();
  const router = useRouter();
  const pumpId = params?.pumpId as string;
  const tankId = params?.tankId as string;

  const [tank, setTank] = useState<any>(null);
  const [rows, setRows] = useState<DipChartEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"manual" | "csv" | "auto">("manual");

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchChart = async () => {
    if (!pumpId || !tankId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pumps/${pumpId}/tanks/${tankId}/dip-chart`);
      const data = await res.json();
      if (data.success) {
        setTank(data.tank);
        setRows(data.chart || []);
      }
    } catch (err) {
      console.error("Failed to load chart:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChart();
  }, [pumpId, tankId]);

  // Option A: Manual Row Operations
  const handleAddRow = () => {
    const lastRow = rows.length > 0 ? rows[rows.length - 1] : { dip_mm: 0, volume_liters: 0 };
    const newDip = lastRow.dip_mm + 100;
    const estVol = tank ? Math.min(tank.capacity_liters, lastRow.volume_liters + 1600) : 0;
    setRows([...rows, { dip_mm: newDip, volume_liters: estVol }]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
  };

  const handleRowChange = (index: number, field: "dip_mm" | "volume_liters", val: string) => {
    const num = parseFloat(val);
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      [field]: isNaN(num) ? 0 : num,
    };
    setRows(updated);
  };

  // Option B: CSV Upload & Download Sample
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { rows: parsed, errors } = parseDipChartCSV(text);

      if (errors.length > 0 && parsed.length === 0) {
        setFeedback({ type: "error", msg: `CSV Error: ${errors[0]}` });
        return;
      }

      setRows(parsed);
      setFeedback({
        type: "success",
        msg: `${parsed.length} ریڈنگز کامیابی سے امپورٹ ہو گئیں! برائے مہربانی 'محفوظ کریں' دبائیں۔`,
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadSampleCSV = () => {
    const sample = `dip_mm,volume_liters\n0,0\n100,1250\n200,2600\n300,4100\n400,5750\n500,7500\n600,9400\n700,11400\n800,13500\n900,15700\n1000,18000\n1200,22800\n1400,27700\n1600,32600\n1800,37300\n2000,40000`;
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dip_chart_sample_${tank?.tank_name || "tank"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Option C: Auto Generate Linear Chart
  const handleAutoGenerate = () => {
    if (!tank) return;
    const height = tank.tank_height_mm || 2500;
    const capacity = tank.capacity_liters || 40000;
    const generated = generateLinearDipChart(height, capacity, 100);
    setRows(generated);
    setFeedback({
      type: "success",
      msg: `عارضی لینیئر چارٹ (${generated.length} پوائنٹس) جنریٹ کر دیا گیا ہے۔`,
    });
  };

  // Save Dip Chart
  const handleSaveChart = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/pumps/${pumpId}/tanks/${tankId}/dip-chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "چارٹ محفوظ نہ ہو سکا");
      }

      setFeedback({
        type: "success",
        msg: `ڈِپ کیلیبریشن چارٹ کامیابی سے محفوظ ہو گیا (${rows.length} پوائنٹس)!`,
      });
      await fetchChart();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Failed to save dip chart" });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:p-0">
      {/* Header (Hidden on print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">
            <Link href={`/dashboard/pump/${pumpId}/tanks`} className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Tanks</span>
            </Link>
            <span>/</span>
            <span>Dip Calibration Chart</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {tank?.tank_name || "Tank"} - ڈِپ چارٹ مینیجمنٹ
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            پروڈکٹ: <strong className="text-slate-800">{tank?.product}</strong> • گنجائش:{" "}
            <strong className="text-slate-800">{formatLitres(tank?.capacity_liters)}</strong> • اونچائی:{" "}
            <strong className="text-slate-800">{tank?.tank_height_mm} mm</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>پرنٹ چارٹ (Print)</span>
          </button>

          <button
            onClick={handleSaveChart}
            disabled={saving || rows.length === 0}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "محفوظ ہو رہا ہے..." : "چارٹ محفوظ کریں (Save Chart)"}</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4 text-center">
        <h1 className="text-2xl font-black">NEXETA PETROL - TANK DIP CALIBRATION CHART</h1>
        <h2 className="text-base font-bold text-slate-700 mt-1">
          {tank?.tank_name} ({tank?.product}) | Capacity: {tank?.capacity_liters} Litres | Height: {tank?.tank_height_mm} mm
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">PSO / Oil Marketing Company Calibration Sheet</p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`print:hidden p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Recharts Visual Curve (Hidden on print) */}
      <div className="print:hidden bg-white rounded-3xl border border-slate-200 shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-base text-slate-900">
              ٹینک ڈِپ بمقابلہ لیٹرز گراف (Calibration Curve: Dip mm ➔ Volume Liters)
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-mono font-bold bg-indigo-50 text-indigo-700">
            {rows.length} Calibration Points
          </span>
        </div>

        <div className="h-64 w-full">
          {rows.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
              کوئی ڈیٹا موجود نہیں۔ چارٹ درج کریں یا CSV اپلوڈ کریں۔
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="dipGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="dip_mm"
                  unit="mm"
                  tickLine={false}
                  stroke="#94a3b8"
                  fontSize={11}
                />
                <YAxis
                  unit="L"
                  tickLine={false}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [`${Number(value).toLocaleString()} L`, "Volume"]}
                  labelFormatter={(label) => `Dip Measurement: ${label} mm`}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="volume_liters"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#dipGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Options Toolbar (Hidden on print) */}
      <div className="print:hidden bg-slate-100 p-1.5 rounded-2xl flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "manual" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Option A: مینول ٹیبل انٹری (Manual Entry)</span>
        </button>

        <button
          onClick={() => setActiveTab("csv")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "csv" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Option B: بلک CSV اپلوڈ (Bulk CSV)</span>
        </button>

        <button
          onClick={() => setActiveTab("auto")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "auto" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Option C: لینیئر آٹو جنریٹ (Auto Generate)</span>
        </button>
      </div>

      {/* Tab B: Bulk CSV Action Area */}
      {activeTab === "csv" && (
        <div className="print:hidden bg-white rounded-3xl border border-slate-200 p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                CSV فائل سے مکمل کیلیبریشن چارٹ اپلوڈ کریں
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                فائل میں دو کالمز ہونے چاہئیں: <code className="font-mono font-bold text-indigo-600">dip_mm,volume_liters</code>
              </p>
            </div>

            <button
              onClick={downloadSampleCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>نمونہ CSV ڈاؤنلوڈ کریں (Sample CSV)</span>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-2xl p-8 bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors">
            <FileSpreadsheet className="w-10 h-10 text-indigo-500 mb-2" />
            <p className="text-xs font-bold text-slate-700 mb-1">اپنی CSV فائل یہاں منتخب کریں</p>
            <p className="text-[11px] text-slate-400 mb-3">ہزاروں ریڈنگز چند سیکنڈ میں امپورٹ ہو جائیں گی</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleCSVUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all"
            >
              فائل منتخب کریں (Choose CSV File)
            </button>
          </div>
        </div>
      )}

      {/* Tab C: Auto Generate Linear Chart Action Area */}
      {activeTab === "auto" && (
        <div className="print:hidden bg-white rounded-3xl border border-slate-200 p-6 shadow-md space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                عارضی لینیئر چارٹ خودکار بنائیں (Linear Chart Generator)
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                اگر آپ کے پاس اس وقت پی ایس او کا تصدیق شدہ کیلیبریشن سرٹیفکیٹ موجود نہیں ہے، تو آپ ٹینک کی اونچائی ({tank?.tank_height_mm}mm) اور کل گنجائش ({tank?.capacity_liters}L) کی بنیاد پر 100mm کے وقفے سے عارضی چارٹ تیار کر سکتے ہیں۔
              </p>
            </div>

            <button
              onClick={handleAutoGenerate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md transition-all shrink-0"
            >
              <Wand2 className="w-4 h-4" />
              <span>فوری جنریٹ کریں (Auto Generate)</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Section: Displays Rows for Manual Entry and Print Output */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 print:hidden">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              ڈِپ بمقابلہ لیٹرز چارٹ ٹیبل (Calibration Table)
            </h3>
            <p className="text-xs text-slate-500">
              ہر 10mm یا 100mm پر صحیح لیٹرز درج کریں۔
            </p>
          </div>

          <button
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors border border-indigo-200"
          >
            <Plus className="w-4 h-4" />
            <span>نئی لائن شامل کریں (+ Add Row)</span>
          </button>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4 w-16 text-center">#</th>
                <th className="py-2.5 px-4">ڈِپ پیمائش (Dip mm)</th>
                <th className="py-2.5 px-4">حجم / لیٹرز (Volume Liters)</th>
                <th className="py-2.5 px-4 print:hidden text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    کوئی کیلیبریشن پوائنٹس موجود نہیں۔ "+ Add Row" دبائیں یا CSV اپلوڈ کریں۔
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="py-2 px-4 text-center font-mono text-slate-400 font-bold">
                      {index + 1}
                    </td>

                    {/* Dip Input */}
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={row.dip_mm}
                          onChange={(e) => handleRowChange(index, "dip_mm", e.target.value)}
                          className="w-36 px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 print:border-none print:p-0"
                        />
                        <span className="text-slate-400 font-mono font-bold text-xs">mm</span>
                      </div>
                    </td>

                    {/* Volume Input */}
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={row.volume_liters}
                          onChange={(e) => handleRowChange(index, "volume_liters", e.target.value)}
                          className="w-44 px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 print:border-none print:p-0"
                        />
                        <span className="text-slate-400 font-mono font-bold text-xs">Litres</span>
                      </div>
                    </td>

                    {/* Delete Action */}
                    <td className="py-2 px-4 text-right print:hidden">
                      <button
                        onClick={() => handleRemoveRow(index)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        title="Delete Row"
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

        {/* Footer Actions (Hidden on print) */}
        {rows.length > 0 && (
          <div className="print:hidden mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              کل ریڈنگز: <strong className="text-slate-900">{rows.length}</strong> پوائنٹس
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddRow}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                + لائن شامل کریں
              </button>

              <button
                onClick={handleSaveChart}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
              >
                {saving ? "محفوظ ہو رہا ہے..." : "تبدیلیاں محفوظ کریں (Save)"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
