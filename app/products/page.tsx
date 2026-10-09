"use client";

import React, { useState, useEffect } from "react";
import { 
  Package, 
  ShoppingCart, 
  PlusCircle, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Search,
  Tag,
  Coins
} from "lucide-react";
import { formatRs, getTodayDatePK, formatDate } from "@/lib/formatters";
import { Product } from "@/lib/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Quick Sale State
  const [saleProductId, setSaleProductId] = useState("");
  const [saleQty, setSaleQty] = useState("1");
  const [saleDate, setSaleDate] = useState(getTodayDatePK());

  // Add Product State
  const [newProdName, setNewProdName] = useState("");
  const [newProdCat, setNewProdCat] = useState("Mobil Oil");
  const [newProdCost, setNewProdCost] = useState("");
  const [newProdSale, setNewProdSale] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);

  const fetchProductsData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.products) setProducts(data.products);
      if (data.recentSales) setRecentSales(data.recentSales);
      if (data.products?.length > 0 && !saleProductId) {
        setSaleProductId(data.products[0].id.toString());
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsData();
  }, []);

  const selectedProduct = products.find((p) => p.id === Number(saleProductId));
  const currentQtyNum = parseFloat(saleQty) || 0;
  const currentTotal = selectedProduct ? currentQtyNum * selectedProduct.sale_price : 0;
  const currentProfit = selectedProduct ? currentQtyNum * (selectedProduct.sale_price - selectedProduct.purchase_price) : 0;

  // Handle POS Sale
  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || currentQtyNum <= 0) return;

    try {
      setSelling(true);
      setErrorMsg("");
      setSuccessMsg("");

      const res = await fetch("/api/products/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          qty: currentQtyNum,
          date: formatDate(saleDate),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sale failed");

      setSuccessMsg(data.message || "فروخت کامیابی سے درج ہو گئی!");
      setSaleQty("1");
      fetchProductsData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error completing sale");
    } finally {
      setSelling(false);
    }
  };

  // Handle Add New Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAddingProduct(true);
      setErrorMsg("");

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProdName,
          category: newProdCat,
          purchase_price: parseFloat(newProdCost),
          sale_price: parseFloat(newProdSale),
          stock_qty: parseFloat(newProdStock) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add product");

      setShowAddModal(false);
      setNewProdName("");
      setNewProdCost("");
      setNewProdSale("");
      setNewProdStock("");
      fetchProductsData();
      setSuccessMsg("نیا پروڈکٹ کامیابی سے شامل کر دیا گیا!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error adding product");
    } finally {
      setAddingProduct(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = products.length;
  const totalStockQty = products.reduce((acc, p) => acc + (p.stock_qty || 0), 0);
  const totalStockValue = products.reduce((acc, p) => acc + (p.stock_qty || 0) * (p.purchase_price || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-teal-100 text-teal-700">
              <Package className="w-6 h-6" />
            </span>
            <span>موبل آئل و دیگر سامان</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Products & POS</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            موبل آئل، فلٹر، گریس کا اسٹاک اور فوری سیل کاؤنٹر • خودکار اسٹاک کٹوتی اور نفع
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md transition-all hover:scale-102"
        >
          <PlusCircle className="w-4 h-4" />
          <span>نیا سامان شامل کریں (Add Product)</span>
        </button>
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

      {/* TOP 3 SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100 rounded-2xl p-6 border-l-4 border-emerald-500 border border-emerald-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-200 text-emerald-800 flex items-center justify-center shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                کل آئٹمز (Products)
              </span>
              <span className="text-xs text-emerald-900/70 font-semibold">Catalog Variety</span>
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-950 mt-4 font-mono tracking-tight">
            {totalItems} <span className="text-sm font-bold text-emerald-800">اقسام</span>
          </div>
          <p className="text-xs text-emerald-900 font-bold mt-2">رجسٹرڈ اشیاء کی تعداد</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 rounded-2xl p-6 border-l-4 border-blue-500 border border-blue-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-200 text-blue-800 flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 block">
                دستیاب اسٹاک (Total Units)
              </span>
              <span className="text-xs text-blue-900/70 font-semibold">Available Stock</span>
            </div>
          </div>
          <div className="text-3xl font-black text-blue-950 mt-4 font-mono tracking-tight">
            {totalStockQty} <span className="text-sm font-bold text-blue-800">پیس / بوتل</span>
          </div>
          <p className="text-xs text-blue-900 font-bold mt-2">شاپ میں موجود کل تعداد</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-violet-100 rounded-2xl p-6 border-l-4 border-purple-500 border border-purple-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-200 text-purple-800 flex items-center justify-center shadow-sm">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-purple-800 block">
                اسٹاک مالیت (Inventory Value)
              </span>
              <span className="text-xs text-purple-900/70 font-semibold">Total Stock Value</span>
            </div>
          </div>
          <div className="text-3xl font-black text-purple-950 mt-4 font-mono tracking-tight">
            {formatRs(totalStockValue)}
          </div>
          <p className="text-xs text-purple-900 font-bold mt-2">خرید قیمت پر کل انوینٹری</p>
        </div>
      </div>

      {/* QUICK SALE COUNTER (POS) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-md">
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
          <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
            <ShoppingCart className="w-5 h-5" />
          </span>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
            فوری سیل کاؤنٹر (Quick POS Sale Counter)
          </h2>
        </div>

        <form onSubmit={handleRecordSale} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Product Select */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                پروڈکٹ منتخب کریں (Select Product)
              </label>
              <select
                value={saleProductId}
                onChange={(e) => setSaleProductId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:border-teal-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.category}] — قیمت: {formatRs(p.sale_price)} (موجود اسٹاک: {p.stock_qty})
                  </option>
                ))}
              </select>
            </div>

            {/* Qty */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                تعداد (Quantity)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={saleQty}
                onChange={(e) => setSaleQty(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-black font-mono text-center text-slate-900 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Quick Summary Pill & Sell Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-4 text-xs font-bold">
              <div>
                <span className="text-slate-500">کل فروخت: </span>
                <span className="font-black text-slate-900 font-mono text-base">{formatRs(currentTotal)}</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-700">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>خالص منافع: {formatRs(currentProfit)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={selling || !selectedProduct}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{selling ? "اندراج ہو رہا ہے..." : "فروخت درج کریں (Complete Sale)"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* PRODUCTS INVENTORY LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              موجودہ سامان اسٹاک (Inventory Stock)
            </span>
            <span className="text-xs text-slate-500 font-mono font-bold">({products.length} items)</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="تلاش کریں (Search oil / filter)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:border-teal-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">سامان کا نام (Product Name)</th>
                <th className="py-3 px-3">کیٹیگری</th>
                <th className="py-3 px-3 text-right">خرید ریٹ (Cost)</th>
                <th className="py-3 px-3 text-right">سیل ریٹ (Sale)</th>
                <th className="py-3 px-3 text-right">منافع فی دانہ</th>
                <th className="py-3 px-4 text-center">موجودہ اسٹاک</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    کوئی سامان نہیں ملا
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const profitUnit = p.sale_price - p.purchase_price;
                  const isLow = p.stock_qty <= 5;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 font-bold">
                        {formatRs(p.purchase_price)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                        {formatRs(p.sale_price)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                        +{formatRs(profitUnit)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-mono font-black border ${
                            isLow
                              ? "bg-red-100 border-red-300 text-red-800 animate-pulse"
                              : "bg-emerald-100 border-emerald-300 text-emerald-800"
                          }`}
                        >
                          {p.stock_qty} pcs {isLow && "(Low)"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECENT SALES LOG */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="text-xs font-black uppercase tracking-wider text-slate-800">
            حالیہ کاؤنٹر سیلز (Recent Retail Sales)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">تاریخ (Date)</th>
                <th className="py-3 px-4">آئٹم (Item)</th>
                <th className="py-3 px-4 text-right">مقدار (Qty)</th>
                <th className="py-3 px-4 text-right">کل رقم (Total)</th>
                <th className="py-3 px-4 text-right">حاصل شدہ منافع (Profit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    کوئی حالیہ سیل درج نہیں ہے
                  </td>
                </tr>
              ) : (
                recentSales.slice(0, 10).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{formatDate(s.date)}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{s.productName}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900">{s.qty}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-blue-700">
                      {formatRs(s.total)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-700">
                      +{formatRs(s.profit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD PRODUCT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-black text-slate-900 mb-1">
              نیا سامان یا موبل آئل شامل کریں
            </h2>
            <p className="text-xs text-slate-500 font-medium mb-4">
              نئی پروڈکٹ کی تفصیلات اور خریداری/سیل ریٹ درج کریں
            </p>

            <form onSubmit={handleAddProduct} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  سامان کا نام (Product Name)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Havoline Formula 20W-50 4L"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  کیٹیگری (Category)
                </label>
                <select
                  value={newProdCat}
                  onChange={(e) => setNewProdCat(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                >
                  <option value="Mobil Oil">Mobil Oil (موبل آئل)</option>
                  <option value="Filter">Oil / Air Filter (فلٹر)</option>
                  <option value="Grease">Grease (گریس)</option>
                  <option value="Brake Fluid">Brake Fluid (بریک آئل)</option>
                  <option value="Coolant">Radiator Coolant (کولنٹ)</option>
                  <option value="Other">Other (دیگر سامان)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    خرید قیمت (Cost Price)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="3500"
                    value={newProdCost}
                    onChange={(e) => setNewProdCost(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-black font-mono text-slate-900 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    فروخت قیمت (Sale Price)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="4200"
                    value={newProdSale}
                    onChange={(e) => setNewProdSale(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-black font-mono text-slate-900 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  ابتدائی اسٹاک تعداد (Opening Stock Qty)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="20"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-black font-mono text-slate-900 focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={addingProduct}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
                >
                  {addingProduct ? "شامل ہو رہا ہے..." : "شامل کریں (Add Product)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
