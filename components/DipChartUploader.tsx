"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Camera,
  Upload,
  FileSpreadsheet,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  Sparkles,
  Sliders,
  Check,
  Eye,
  X,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Fuel,
  Maximize2
} from "lucide-react";
import { formatLitres } from "@/lib/formatters";
import { DipVerificationRow } from "@/lib/types";

interface DipChartUploaderProps {
  pumpId: string | number;
  tankId?: string | number;
  tankName?: string;
  product?: string;
  capacityLiters?: number;
  tanksList?: Array<any>;
  onSaved?: (count: number) => void;
}

export default function DipChartUploader({
  pumpId,
  tankId: initialTankId,
  tankName = "Tank 1",
  product = "Petrol",
  capacityLiters = 40000,
  tanksList = [],
  onSaved,
}: DipChartUploaderProps) {
  const [selectedTankId, setSelectedTankId] = useState<string | number>(
    initialTankId || (tanksList.length > 0 ? tanksList[0].id : 1)
  );

  // Tabs: 1 = Image ("تصویر اپلوڈ کریں"), 2 = CSV ("CSV اپلوڈ کریں"), 3 = Manual ("ہاتھ سے لکھیں")
  const [activeTab, setActiveTab] = useState<"image" | "csv" | "manual">("image");

  // Image states
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isEnhancedView, setIsEnhancedView] = useState<boolean>(true);
  const [preprocessing, setPreprocessing] = useState<boolean>(false);

  // OCR Processing
  const [ocrRunning, setOcrRunning] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStatusText, setOcrStatusText] = useState<string>("");

  // Verification Table Rows
  const [verificationRows, setVerificationRows] = useState<DipVerificationRow[]>([]);
  const [isVerifiedScreen, setIsVerifiedScreen] = useState<boolean>(false);

  // Status feedback
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Hidden File & Camera input refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync tank if initialTankId changes
  useEffect(() => {
    if (initialTankId) setSelectedTankId(initialTankId);
  }, [initialTankId]);

  // 1. IMAGE PREPROCESSING VIA CANVAS (Grayscale + 1.5x Contrast + Sharpness Binarization)
  const preprocessImage = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // Maintain resolution for OCR clarity (scale up if small, cap at 2400 max dimension)
        let { width, height } = img;
        const maxDim = 2400;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Grayscale + 1.5x Contrast + Adaptive Threshold Filter
        const contrast = 1.5;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // 1. Grayscale luminance formula
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;

          // 2. Contrast formula
          let contrasted = factor * (gray - 128) + 128;
          contrasted = Math.max(0, Math.min(255, contrasted));

          // 3. High-pass ink binarization (makes faint pencil/print dark black and paper pure white)
          let finalVal = contrasted;
          if (contrasted > 165) {
            finalVal = 255; // White background
          } else if (contrasted < 110) {
            finalVal = 0; // Crisp black ink
          }

          data[i] = finalVal;
          data[i + 1] = finalVal;
          data[i + 2] = finalVal;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  };

  // Image file selection handler
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const src = ev.target?.result as string;
      setOriginalImage(src);
      setPreprocessing(true);
      setOcrStatusText("تصویر صاف اور ایڈجسٹ ہو رہی ہے (Enhancing)...");

      try {
        const enhanced = await preprocessImage(src);
        setEnhancedImage(enhanced);
        setIsEnhancedView(true);
      } catch (err) {
        setEnhancedImage(src);
      } finally {
        setPreprocessing(false);
        setOcrStatusText("");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // SMART NUMERIC SANITIZER (Dual OCR Helper)
  // Fixes common OCR misreads: e.g. "15OL" -> 150, "l50" -> 150, "S0" -> 50, etc.
  const sanitizeOcrNumber = (str: string): { value: number; confidence: number } => {
    let s = str.trim();
    let subCount = 0;

    // Remove unit suffixes (cm, cm., mm, L, Ltr, Litres)
    s = s.replace(/(cm|mm|ltr|litres|litre|l\b)/gi, "");

    // Common character substitutions
    const origLength = s.length;
    s = s
      .replace(/[Oo]/g, () => {
        subCount++;
        return "0";
      })
      .replace(/[lI|!]/g, () => {
        subCount++;
        return "1";
      })
      .replace(/[$Ss]/g, () => {
        subCount++;
        return "5";
      })
      .replace(/[B]/g, () => {
        subCount++;
        return "8";
      })
      .replace(/[Zz]/g, () => {
        subCount++;
        return "2";
      });

    // Extract first valid numeric decimal sequence
    const match = s.match(/[0-9]+(?:\.[0-9]+)?/);
    if (!match) return { value: NaN, confidence: 20 };

    const num = parseFloat(match[0]);
    // Confidence penalty for substitutions
    const confidence = Math.max(40, 95 - subCount * 18);
    return { value: num, confidence };
  };

  // 2. DUAL OCR EXTRACTION (Method B: Vision API + Method A: Tesseract with OEM 1, PSM 6)
  const handleStartOCR = async () => {
    const targetImage = isEnhancedView && enhancedImage ? enhancedImage : originalImage;
    if (!targetImage) {
      alert("پہلے ڈِپ چارٹ کی تصویر لیں یا اپلوڈ کریں");
      return;
    }

    setOcrRunning(true);
    setOcrProgress(10);
    setOcrStatusText("Dual OCR Engine شروع ہو رہا ہے...");
    setStatusMsg(null);

    let extractedList: DipVerificationRow[] = [];

    // Method B: Try Vision API endpoint first
    try {
      setOcrStatusText("AI Vision ماڈل سے ٹیبل کا تجزیہ کیا جا رہا ہے...");
      setOcrProgress(30);

      const visionRes = await fetch("/api/ocr/dip-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: targetImage }),
      });

      if (visionRes.ok) {
        const vData = await visionRes.json();
        if (vData.success && Array.isArray(vData.rows) && vData.rows.length > 0) {
          extractedList = vData.rows.map((r: any, idx: number) => ({
            id: `v-${idx + 1}`,
            dip_cm: Number(r.dip_cm),
            volume_litres: Number(r.volume_litres),
            confidence: Number(r.confidence || 95),
            flagged: r.flagged ?? (r.confidence < 70),
            source: "vision",
          }));
        }
      }
    } catch (vErr) {
      console.warn("Vision API skipped, switching to Tesseract table engine:", vErr);
    }

    // Method A: Tesseract.js fallback or table mode
    if (extractedList.length === 0) {
      try {
        setOcrProgress(45);
        setOcrStatusText("Tesseract OCR (OEM 1, PSM 6 ٹیبل موڈ) لوڈ ہو رہا ہے...");

        const Tesseract = (await import("tesseract.js")).default;
        const result = await Tesseract.recognize(targetImage, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              const p = Math.round(m.progress * 50) + 45;
              setOcrProgress(Math.min(95, p));
              setOcrStatusText(`نمبرز اور ٹیبل پڑھ رہا ہے... ${Math.round(m.progress * 100)}%`);
            }
          },
        });

        const fullText = result.data.text || "";
        const lines = fullText.split("\n");
        const tesseractRows: DipVerificationRow[] = [];

        lines.forEach((line, idx) => {
          const raw = line.trim();
          if (!raw || raw.length < 2) return;

          // Split line by whitespace or column delimiter
          const tokens = raw.split(/[\s|\t;,]+/).filter(Boolean);
          if (tokens.length >= 2) {
            const firstToken = tokens[0];
            const secondToken = tokens[1];

            const dipSanitized = sanitizeOcrNumber(firstToken);
            const volSanitized = sanitizeOcrNumber(secondToken);

            if (!isNaN(dipSanitized.value) && !isNaN(volSanitized.value) && dipSanitized.value >= 0) {
              const avgConf = Math.round((dipSanitized.confidence + volSanitized.confidence) / 2);
              const flagged = avgConf < 70 || volSanitized.value < dipSanitized.value;

              tesseractRows.push({
                id: `ocr-${idx}`,
                dip_cm: Math.round(dipSanitized.value),
                volume_litres: Math.round(volSanitized.value),
                confidence: avgConf,
                flagged,
                raw_text: `${firstToken} -> ${secondToken}`,
                source: "ocr",
              });
            }
          }
        });

        extractedList = tesseractRows;
      } catch (ocrErr: any) {
        console.error("Tesseract Engine error:", ocrErr);
      }
    }

    // Monotonicity Check: If volume drops while dip increases, flag as low confidence
    if (extractedList.length > 0) {
      extractedList.sort((a, b) => a.dip_cm - b.dip_cm);
      for (let i = 1; i < extractedList.length; i++) {
        if (extractedList[i].volume_litres <= extractedList[i - 1].volume_litres) {
          extractedList[i].flagged = true;
          extractedList[i].confidence = Math.min(50, extractedList[i].confidence);
        }
      }

      setVerificationRows(extractedList);
      setIsVerifiedScreen(true);
      setStatusMsg({
        type: "success",
        text: `کامیابی! ${extractedList.length} ڈِپ ریڈنگز حاصل ہو گئیں۔ برائے مہربانی ریڈنگ چیک کر کے محفوظ کریں۔`,
      });
    } else {
      setStatusMsg({
        type: "error",
        text: "تصویر سے درست ٹیبل ریڈنگز نہیں مل سکیں۔ برائے مہربانی صاف تصویر لیں یا 'ہاتھ سے لکھیں' ٹیب استعمال کریں۔",
      });
    }

    setOcrRunning(false);
    setOcrProgress(100);
    setOcrStatusText("");
  };

  // 3. TAB 2: CSV UPLOAD HANDLER
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const rows: DipVerificationRow[] = [];

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.toLowerCase().includes("dip") || trimmed.toLowerCase().includes("volume")) return;
        const parts = trimmed.split(/[,;\t]+/).filter(Boolean);
        if (parts.length >= 2) {
          let d = parseFloat(parts[0]);
          const v = parseFloat(parts[1]);
          if (!isNaN(d) && !isNaN(v)) {
            // If values look like mm (> 100 on start), convert to cm
            if (d > 100 && d % 10 === 0 && d > 200) {
              d = d / 10;
            }
            rows.push({
              id: `csv-${idx}`,
              dip_cm: Math.round(d),
              volume_litres: Math.round(v),
              confidence: 99,
              flagged: false,
              source: "csv",
            });
          }
        }
      });

      if (rows.length > 0) {
        rows.sort((a, b) => a.dip_cm - b.dip_cm);
        setVerificationRows(rows);
        setIsVerifiedScreen(true);
        setStatusMsg({
          type: "success",
          text: `CSV فائل سے ${rows.length} ریڈنگز امپورٹ ہو گئیں!`,
        });
      } else {
        setStatusMsg({
          type: "error",
          text: "CSV فائل میں درست فارمیٹ (dip_cm, volume_litres) نہیں ملا۔",
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // 4. TAB 3: MANUAL STARTER TABLE
  const handleStartManual = () => {
    const starter: DipVerificationRow[] = [
      { id: "m-1", dip_cm: 10, volume_litres: 1500, confidence: 100, flagged: false, source: "manual" },
      { id: "m-2", dip_cm: 20, volume_litres: 3400, confidence: 100, flagged: false, source: "manual" },
      { id: "m-3", dip_cm: 30, volume_litres: 5800, confidence: 100, flagged: false, source: "manual" },
      { id: "m-4", dip_cm: 40, volume_litres: 8600, confidence: 100, flagged: false, source: "manual" },
      { id: "m-5", dip_cm: 50, volume_litres: 12000, confidence: 100, flagged: false, source: "manual" },
      { id: "m-6", dip_cm: 60, volume_litres: 16000, confidence: 100, flagged: false, source: "manual" },
      { id: "m-7", dip_cm: 70, volume_litres: 20500, confidence: 100, flagged: false, source: "manual" },
      { id: "m-8", dip_cm: 80, volume_litres: 25500, confidence: 100, flagged: false, source: "manual" },
      { id: "m-9", dip_cm: 90, volume_litres: 31000, confidence: 100, flagged: false, source: "manual" },
      { id: "m-10", dip_cm: 100, volume_litres: 36500, confidence: 100, flagged: false, source: "manual" },
    ];
    setVerificationRows(starter);
    setIsVerifiedScreen(true);
  };

  // VERIFICATION ROW ACTIONS
  const handleRowChange = (index: number, field: "dip_cm" | "volume_litres", value: string) => {
    const num = parseFloat(value);
    const updated = [...verificationRows];
    updated[index] = {
      ...updated[index],
      [field]: isNaN(num) ? 0 : num,
      confidence: 100, // Manually edited/confirmed by user
      flagged: false,
    };
    setVerificationRows(updated);
  };

  const handleAddRow = () => {
    const lastRow = verificationRows.length > 0 ? verificationRows[verificationRows.length - 1] : { dip_cm: 0, volume_litres: 0 };
    const newRow: DipVerificationRow = {
      id: `new-${Date.now()}`,
      dip_cm: lastRow.dip_cm + 10,
      volume_litres: Math.round(lastRow.volume_litres + 1800),
      confidence: 100,
      flagged: false,
      source: "manual",
    };
    setVerificationRows([...verificationRows, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    const updated = verificationRows.filter((_, i) => i !== index);
    setVerificationRows(updated);
  };

  // BONUS: IMAGE TO CSV / EXCEL DOWNLOADER
  const handleDownloadCsv = (isExcel = false) => {
    const headers = "dip_cm,volume_litres\n";
    const content = verificationRows
      .map((r) => `${r.dip_cm},${r.volume_litres}`)
      .join("\n");

    const blob = new Blob([headers + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dip_chart_tank_${selectedTankId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 5. FINAL CALIBRATION SAVE
  const handleSaveCalibration = async () => {
    if (verificationRows.length === 0) {
      alert("کم از کم ایک ڈِپ ریڈنگ شامل کریں");
      return;
    }

    try {
      setSaving(true);
      setStatusMsg(null);

      // Clean, validate and sort rows
      const cleaned = verificationRows
        .map((r) => ({
          dip_cm: Math.round(Number(r.dip_cm)),
          dip_mm: Math.round(Number(r.dip_cm) * 10),
          volume_litres: Math.round(Number(r.volume_litres)),
          volume_liters: Math.round(Number(r.volume_litres)),
        }))
        .filter((r) => !isNaN(r.dip_cm) && !isNaN(r.volume_litres) && r.dip_cm >= 0 && r.volume_litres >= 0)
        .sort((a, b) => a.dip_cm - b.dip_cm);

      const payload = {
        rows: cleaned,
        chart_data: cleaned.map((r) => ({ dip_cm: r.dip_cm, volume_litres: r.volume_litres })),
        source_type: activeTab === "image" ? "image_ocr" : activeTab === "csv" ? "csv" : "manual",
        original_image_url: originalImage || null,
        is_verified: true,
      };

      const res = await fetch(`/api/pumps/${pumpId}/tanks/${selectedTankId}/dip-chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "محفوظ کرنے میں خرابی");
      }

      setStatusMsg({
        type: "success",
        text: `ڈپ چارٹ محفوظ ہو گیا - اب روزانہ ڈپ سے لیٹر خودکار (آٹو) نکلے گا! (${cleaned.length} ریڈنگز)`,
      });

      if (onSaved) {
        onSaved(cleaned.length);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setStatusMsg({
        type: "error",
        text: err.message || "ڈپ چارٹ محفوظ نہیں ہو سکا",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in shadow-xs ${
            statusMsg.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-red-50 border-red-300 text-red-900"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleImageFile}
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleImageFile}
        className="hidden"
      />
      <input
        type="file"
        ref={csvInputRef}
        accept=".csv,text/csv"
        onChange={handleCsvUpload}
        className="hidden"
      />

      {/* 4. THREE TOP TABS */}
      {!isVerifiedScreen && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md">
          {/* Header & Tank Selector */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-indigo-100 text-indigo-700">
                  <Sliders className="w-6 h-6" />
                </span>
                <span>سمارٹ ڈِپ چارٹ ریڈر (Smart Dip Reader)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                ڈِپ چارٹ کے کاغذ کی تصویر لیں — سسٹم خود پڑھ کر ٹیبل تیار کرے گا
              </p>
            </div>

            {/* Tank selector if tanksList passed */}
            {tanksList.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">ٹینک منتخب کریں:</span>
                <select
                  value={selectedTankId}
                  onChange={(e) => setSelectedTankId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-600"
                >
                  {tanksList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tank_name || t.name} [{t.product || t.fuel_type}] ({Number(t.capacity_liters || t.capacity).toLocaleString()}L)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 3 Tabs Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6">
            <button
              onClick={() => setActiveTab("image")}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === "image"
                  ? "bg-white text-indigo-950 shadow-md scale-101"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Camera className="w-4 h-4 text-rose-600" />
              <span>تصویر اپلوڈ کریں (Photo OCR)</span>
            </button>

            <button
              onClick={() => setActiveTab("csv")}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === "csv"
                  ? "bg-white text-indigo-950 shadow-md scale-101"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>CSV اپلوڈ کریں (Excel/CSV)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("manual");
                handleStartManual();
              }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === "manual"
                  ? "bg-white text-indigo-950 shadow-md scale-101"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit3 className="w-4 h-4 text-amber-600" />
              <span>ہاتھ سے لکھیں (Manual Input)</span>
            </button>
          </div>

          {/* TAB 1: IMAGE UPLOAD & CANVAS PREPROCESSING */}
          {activeTab === "image" && (
            <div className="space-y-6">
              {!originalImage ? (
                /* Empty state: Camera & Gallery buttons */
                <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-3xl p-8 sm:p-12 text-center transition-colors">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        ڈِپ چارٹ کے کاغذ کی تصویر لیں
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        کسی بھی پرانے یا نئے ڈِپ چارٹ کے پیپر کی واضح تصویر کھینچیں، AI خود تمام ریڈنگز پڑھ لے گا
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      {/* Direct Back Camera Button */}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black text-sm shadow-lg hover:shadow-rose-600/30 transition-all hover:scale-102"
                      >
                        <Camera className="w-5 h-5" />
                        <span>📸 کیمرے سے تصویر لیں (Take Photo)</span>
                      </button>

                      {/* Gallery Upload */}
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm shadow-sm transition-all"
                      >
                        <Upload className="w-4 h-4 text-indigo-600" />
                        <span>📁 گیلری سے منتخب کریں (Gallery)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Image Preprocessor & Side-by-Side Preview */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                        <Sparkles className="w-5 h-5" />
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">
                          تصویر پری پروسیسنگ (Image Preprocessing Filter)
                        </h4>
                        <p className="text-xs text-slate-500">
                          کنٹراسٹ 1.5x اور ڈیجیٹل کلین اپ مکمل — تحریر واضح ہو گئی ہے
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Toggle Enhanced / Original */}
                      <button
                        type="button"
                        onClick={() => setIsEnhancedView(!isEnhancedView)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                          isEnhancedView
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-700 border-slate-300"
                        }`}
                      >
                        {isEnhancedView ? "✨ صاف شدہ تصویر (Enhanced)" : "اصل تصویر (Original)"}
                      </button>

                      {/* Retake Photo */}
                      <button
                        type="button"
                        onClick={() => {
                          setOriginalImage(null);
                          setEnhancedImage(null);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        دوبارہ تصویر لیں
                      </button>
                    </div>
                  </div>

                  {/* Side by Side Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original */}
                    <div className="bg-slate-900 text-white rounded-2xl p-3">
                      <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between">
                        <span>اصل تصویر (Original Photo)</span>
                      </div>
                      <div className="h-64 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center">
                        <img
                          src={originalImage}
                          alt="Original Dip Sheet"
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Enhanced */}
                    <div className="bg-indigo-950 text-white rounded-2xl p-3 border-2 border-indigo-500/40 shadow-md">
                      <div className="text-[11px] font-bold text-indigo-300 mb-2 flex items-center justify-between">
                        <span>صاف شدہ تصویر (Enhanced High-Contrast for OCR)</span>
                        <span className="text-[10px] bg-indigo-500/30 px-2 py-0.5 rounded-full text-indigo-200">
                          فلٹر آن ہے
                        </span>
                      </div>
                      <div className="h-64 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center">
                        <img
                          src={enhancedImage || originalImage}
                          alt="Enhanced Dip Sheet"
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Start OCR Button */}
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      disabled={ocrRunning || preprocessing}
                      onClick={handleStartOCR}
                      className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white font-black text-sm shadow-xl hover:shadow-indigo-600/30 transition-all hover:scale-102 disabled:opacity-50"
                    >
                      <Sparkles className={`w-5 h-5 ${ocrRunning ? "animate-spin" : ""}`} />
                      <span>
                        {ocrRunning ? (ocrStatusText || "پڑھ رہا ہے...") : "ٹیبل پڑھیں اور ریڈنگز نکالیں (Start Dual OCR)"}
                      </span>
                    </button>
                  </div>

                  {/* OCR Progress Bar */}
                  {ocrRunning && (
                    <div className="max-w-md mx-auto space-y-1.5 pt-2">
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-center text-slate-500 font-medium">
                        {ocrStatusText} ({ocrProgress}%)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CSV UPLOAD */}
          {activeTab === "csv" && (
            <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/30 rounded-3xl p-8 sm:p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    CSV یا ایکسل فائل اپلوڈ کریں
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    فائل میں 2 کالمز ہونے چاہییں: <b>dip_cm</b> اور <b>volume_litres</b>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => csvInputRef.current?.click()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>CSV فائل منتخب کریں</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sample = `dip_cm,volume_litres\n10,1450\n20,3350\n30,5700\n40,8450\n50,11700\n60,15400\n70,19600\n80,24200\n90,29300\n100,34800`;
                      const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "sample_dip_chart.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs transition-all"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>سیمپل فائل ڈاؤن لوڈ کریں</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. MANUAL VERIFICATION TABLE - THIS IS THE REAL FIX (100% ACCURACY) */}
      {isVerifiedScreen && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xl space-y-6 animate-in fade-in zoom-in-95">
          {/* Header & Title */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <ShieldCheck className="w-6 h-6" />
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  🔍 ریڈنگ چیک کریں - غلط ہو تو ٹھیک کریں
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                سسٹم نے تصویر سے نیچے دی گئی ریڈنگز نکالی ہیں۔ کسی بھی خانے پر ٹیپ کر کے غلط رقم فوراً درست کریں
              </p>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Badge: Count */}
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-mono font-black border border-slate-200">
                {verificationRows.length} ریڈنگز ملی
              </span>

              {/* Bonus: Convert to CSV */}
              <button
                type="button"
                onClick={() => handleDownloadCsv(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                title="تصویر سے بنی ریڈنگز کو CSV فائل میں ڈاؤن لوڈ کریں"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>CSV میں کنورٹ کریں</span>
              </button>

              {/* Retake Photo */}
              <button
                type="button"
                onClick={() => {
                  setIsVerifiedScreen(false);
                  setOriginalImage(null);
                  setEnhancedImage(null);
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-rose-600" />
                <span>دوبارہ تصویر لیں</span>
              </button>

              {/* Primary: Confirm All & Save */}
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveCalibration}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-emerald-600/30 transition-all hover:scale-102 disabled:opacity-50"
              >
                <Check className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
                <span>
                  {saving ? "محفوظ ہو رہا ہے..." : "تمام تصدیق کریں اور سیو کریں"}
                </span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-700 uppercase text-[11px] font-black border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4 w-40">ڈِپ سینٹی میٹر (Dip cm)</th>
                  <th className="py-3 px-4">والیوم لیٹرز (Volume Litres) *</th>
                  <th className="py-3 px-4 w-44 text-center">تصدیق / اعتماد (Confidence)</th>
                  <th className="py-3 px-3 text-center w-16">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {verificationRows.map((row, idx) => {
                  const isLowConf = row.confidence < 70 || row.flagged;
                  return (
                    <tr
                      key={row.id || idx}
                      className={`transition-colors ${
                        isLowConf ? "bg-red-50/70 hover:bg-red-50" : "hover:bg-slate-50/70"
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Dip (cm) - Editable */}
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="1"
                            value={row.dip_cm}
                            onChange={(e) => handleRowChange(idx, "dip_cm", e.target.value)}
                            className="w-24 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-indigo-600 text-center"
                          />
                          <span className="text-slate-400 font-bold text-xs">cm</span>
                        </div>
                      </td>

                      {/* Volume (Litres) - Editable Input */}
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="1"
                            value={row.volume_litres}
                            onChange={(e) => handleRowChange(idx, "volume_litres", e.target.value)}
                            placeholder="لیٹرز درج کریں..."
                            className={`w-44 px-3.5 py-2 rounded-xl border text-base font-mono font-black focus:outline-none transition-all ${
                              isLowConf
                                ? "bg-white border-red-400 text-red-950 focus:border-red-600 focus:ring-2 focus:ring-red-200"
                                : "bg-white border-slate-300 text-slate-900 focus:border-emerald-600"
                            }`}
                          />
                          <span className="text-xs text-slate-400 font-bold">Ltr</span>
                        </div>
                      </td>

                      {/* Confidence Badge */}
                      <td className="py-2 px-4 text-center">
                        {row.confidence >= 90 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>95%+ درست (High)</span>
                          </span>
                        ) : row.confidence >= 70 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>75% درمیانہ (Medium)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-800 text-[11px] font-black border border-red-300 animate-pulse">
                            <X className="w-3.5 h-3.5 text-red-600" />
                            <span>❌ یہ لائن چیک کریں</span>
                          </span>
                        )}
                      </td>

                      {/* Delete Action */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="یہ قطار حذف کریں"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors self-start"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>+ نئی لائن شامل کریں (Add Missing Row)</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveCalibration}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all hover:scale-102 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
                <span>تمام تصدیق کریں اور سیو کریں (Save Dip Chart)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
