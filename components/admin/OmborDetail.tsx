"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiBox, FiTruck, FiClock, FiSearch } from "react-icons/fi";
import toast from "react-hot-toast";
import useProductStore from "@/zustand/useProductStore";
import { useRole } from "./RoleContext";
import { isManagerPlus } from "@/lib/roles";
import NoAccess from "./NoAccess";
import ProductImage, { firstThumbUrl } from "@/components/ProductImage";
import StockMovementModal from "./StockMovementModal";
import { ProductT } from "@/lib/types";
import { FormattedPrice } from "@/utils";

// Stock at/under the per-product reorder point (default 5) is "kam qoldi".
const isLow = (p: ProductT) => (p.quantity ?? 0) <= (p.lowStockThreshold ?? 5);
const isOut = (p: ProductT) => (p.quantity ?? 0) <= 0;

// Ombor — the dashboard's stock-control surface (alongside Mahsulotlar &
// Kategoriyalar). At-a-glance valuation + a stock-first product list where the
// owner sees qoldiq, tan narx, ombor qiymati and restocks inline (📦 logs a
// ledger row). The full movement history lives on /inventory ("Harakatlar").
const OmborDetail = () => {
  const me = useRole();
  const { products, loading, fetchProducts, patchProduct } = useProductStore();
  const [stockProduct, setStockProduct] = useState<ProductT | null>(null);
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [sort, setSort] = useState<"stock" | "value" | "name">("stock");
  const [shown, setShown] = useState(24);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const skipSave = useRef(false);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Inventory valuation — Qoldiq (on-hand) × Tan narx (cost) at cost and at
  // retail; the gap is the margin still sitting on the shelves. Mirrors the
  // /inventory page so the two Ombor views agree.
  const val = useMemo(() => {
    let units = 0, cost = 0, retail = 0, noCost = 0, low = 0, out = 0;
    for (const p of products) {
      const q = Number(p.quantity) || 0;
      const c = Number(p.costPrice) || 0;
      if (q > 0 && !p.costPrice) noCost++;
      if (isOut(p)) out++;
      else if (isLow(p)) low++;
      units += q;
      cost += q * c;
      retail += q * (Number(p.price) || 0);
    }
    return { skus: products.length, units, cost, retail, profit: retail - cost, noCost, low, out };
  }, [products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (onlyLow && !isLow(p)) return false;
      if (!q) return true;
      return (
        (p.title ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
    const value = (p: ProductT) => (Number(p.quantity) || 0) * (Number(p.costPrice) || 0);
    const cmp = (a: ProductT, b: ProductT) => {
      switch (sort) {
        case "value": return value(b) - value(a); // most capital tied up first
        case "name": return (a.title ?? "").localeCompare(b.title ?? "");
        default: return (a.quantity ?? 0) - (b.quantity ?? 0); // low → high (reorder view)
      }
    };
    return [...filtered].sort(cmp);
  }, [products, search, onlyLow, sort]);

  useEffect(() => { setShown(24); }, [search, onlyLow, sort]);
  const paged = visible.slice(0, shown);

  const startEdit = (p: ProductT) => {
    setEditingId(p.id);
    setEditStock(String(p.quantity ?? 0));
  };
  const saveStock = async (id: string) => {
    const v = parseInt(editStock, 10);
    const cur = products.find((p) => p.id === id);
    setEditingId(null);
    if (isNaN(v) || v < 0 || !cur || cur.quantity === v) return;
    if (v > 10_000_000) return toast.error("Zaxira qiymati juda katta");
    try {
      await patchProduct(id, { quantity: v });
      toast.success("Zaxira yangilandi");
    } catch {
      toast.error("Saqlab boʼlmadi");
    }
  };

  if (!isManagerPlus(me?.role)) return <NoAccess min="manager" />;

  const kpi = "rounded-xl border px-4 py-3";
  return (
    <div className="pb-4">
      {/* Valuation KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
        <div className={`${kpi} border-slate-100 bg-white`}>
          <p className="text-xs text-slate-500">Jami qoldiq</p>
          <p className="text-lg sm:text-xl font-bold text-slate-700">
            {val.units.toLocaleString("ru-RU")} <span className="text-sm font-medium text-slate-400">dona</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{val.skus} ta mahsulot turi</p>
        </div>
        <div className={`${kpi} border-brand-100 bg-brand-50`}>
          <p className="text-xs text-slate-500">Ombor qiymati — tan narx</p>
          <p className="text-lg sm:text-xl font-bold text-brand">
            {FormattedPrice(val.cost)} <span className="text-sm font-medium text-brand-400">soʼm</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Σ qoldiq × tan narx</p>
        </div>
        <div className={`${kpi} border-green-100 bg-green-50`}>
          <p className="text-xs text-slate-500">Potensial foyda</p>
          <p className="text-lg sm:text-xl font-bold text-green-600">
            {FormattedPrice(val.profit)} <span className="text-sm font-medium text-green-500">soʼm</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">sotuvda − tan narx</p>
        </div>
        <button
          type="button"
          onClick={() => setOnlyLow((v) => !v)}
          title="Kam qolgan mahsulotlarni koʼrsatish"
          className={`${kpi} text-left transition-colors ${
            onlyLow ? "border-red-300 bg-red-100" : val.low + val.out > 0 ? "border-red-100 bg-red-50" : "border-slate-100 bg-white"
          }`}
        >
          <p className="text-xs text-slate-500">Kam qolgan / tugagan</p>
          <p className={`text-lg sm:text-xl font-bold ${val.low + val.out > 0 ? "text-red-500" : "text-slate-700"}`}>
            {val.low + val.out} <span className="text-sm font-medium text-slate-400">ta</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {val.out} tugagan · {onlyLow ? "faqat shular" : "bosib filtrlash"}
          </p>
        </button>
      </div>
      {val.noCost > 0 && (
        <p className="-mt-2 mb-4 text-[11px] text-amber-600">
          ⚠ {val.noCost} ta mahsulotda tan narx kiritilmagan — ular tan narx qiymatiga kirmaydi.
        </p>
      )}

      {/* Toolbar: search + sort + shortcuts to the ledger & suppliers */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px] sm:max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nomi, kategoriya, shtrix-kod boʼyicha…"
            className="w-full pl-9 pr-3 py-2 border border-brand-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-300 text-slate-700 placeholder-slate-400"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          title="Saralash"
          className="px-3 py-2 border border-brand-200 rounded-lg outline-none text-slate-600 text-sm focus:ring-1 focus:ring-brand-300"
        >
          <option value="stock">Zaxira (kam → koʼp)</option>
          <option value="value">Qiymat (koʼp → kam)</option>
          <option value="name">Nomi (A→Z)</option>
        </select>
        <Link
          href="/admin-dashboard/inventory"
          className="px-3 py-2 text-sm rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50 inline-flex items-center gap-1.5"
        >
          <FiClock className="text-base" /> Harakatlar tarixi
        </Link>
        <Link
          href="/admin-dashboard/suppliers"
          className="px-3 py-2 text-sm rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50 inline-flex items-center gap-1.5"
        >
          <FiTruck className="text-base" /> Yetkazib beruvchilar
        </Link>
        <span className="text-xs text-slate-400 w-full sm:w-auto sm:ml-1">
          {visible.length} ta{search || onlyLow ? " koʼrsatilmoqda" : ""}
        </span>
      </div>

      {loading && products.length === 0 && (
        <div className="flex justify-center py-16"><span className="size-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      )}
      {!loading && visible.length === 0 && (
        <p className="text-center text-slate-400 py-14">
          {onlyLow ? "Kam qolgan mahsulot yoʼq — ombor toʼla 👍" : search ? "Mahsulot topilmadi." : "Hozircha mahsulot yoʼq."}
        </p>
      )}

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2.5">
        {paged.map((p) => (
          <div key={p.id} className={`rounded-xl border p-3 ${isOut(p) ? "border-red-200 bg-red-50/50" : "border-brand-100 bg-white"}`}>
            <div className="flex gap-3">
              <div className="relative size-14 shrink-0 rounded overflow-hidden">
                <ProductImage fill sizes="56px" className="object-cover" src={firstThumbUrl(p.productImageUrl)} alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 capitalize leading-tight line-clamp-2">{p.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {p.costPrice ? <>tan: {FormattedPrice(p.costPrice)} · </> : null}
                  qiymat: {FormattedPrice((p.quantity ?? 0) * (p.costPrice ?? 0))} soʼm
                </p>
              </div>
              <div className="text-right shrink-0">
                {editingId === p.id ? (
                  <input
                    autoFocus type="number" value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); else if (e.key === "Escape") { skipSave.current = true; e.currentTarget.blur(); } }}
                    onBlur={() => { if (skipSave.current) { skipSave.current = false; setEditingId(null); } else saveStock(p.id); }}
                    className="w-16 px-1.5 py-0.5 border border-brand-300 rounded text-slate-700 text-right"
                  />
                ) : (
                  <button onClick={() => startEdit(p)} className={`font-bold text-base leading-tight ${isLow(p) ? "text-red-500" : "text-slate-700"}`}>
                    {p.quantity ?? 0}
                    <span className="block text-[9px] font-normal text-slate-400">dona</span>
                  </button>
                )}
                {isLow(p) && <span className="block text-[9px] text-red-500">{isOut(p) ? "tugagan" : "kam qoldi"}</span>}
              </div>
            </div>
            <button
              onClick={() => setStockProduct(p)}
              className="mt-2.5 w-full py-1.5 rounded-lg bg-brand-50 text-brand-600 text-xs font-semibold hover:bg-brand-100 inline-flex items-center justify-center gap-1.5"
            >
              <FiBox /> Zaxira harakati (kirim / chiqim)
            </button>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      {paged.length > 0 && (
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2 px-3 font-semibold">Mahsulot</th>
                <th className="py-2 px-3 font-semibold text-right">Qoldiq</th>
                <th className="py-2 px-3 font-semibold text-right">Tan narx</th>
                <th className="py-2 px-3 font-semibold text-right">Sotuv narx</th>
                <th className="py-2 px-3 font-semibold text-right">Ombor qiymati</th>
                <th className="py-2 px-3 font-semibold text-center">Harakat</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {paged.map((p) => (
                <tr key={p.id} className={`border-b border-slate-50 ${isOut(p) ? "bg-red-50/40" : ""}`}>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative size-11 shrink-0 rounded overflow-hidden">
                        <ProductImage fill sizes="44px" className="object-cover" src={firstThumbUrl(p.productImageUrl)} alt="" />
                      </div>
                      <div className="min-w-0">
                        <p className="capitalize truncate max-w-[280px]">{p.title}</p>
                        <p className="text-xs text-slate-400 capitalize">{p.category || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    {editingId === p.id ? (
                      <input
                        autoFocus type="number" value={editStock}
                        onChange={(e) => setEditStock(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); else if (e.key === "Escape") { skipSave.current = true; e.currentTarget.blur(); } }}
                        onBlur={() => { if (skipSave.current) { skipSave.current = false; setEditingId(null); } else saveStock(p.id); }}
                        className="w-20 px-1.5 py-1 border border-brand-300 rounded outline-none text-slate-700 text-right"
                      />
                    ) : (
                      <button onClick={() => startEdit(p)} title="Bosib tahrirlang" className={`font-bold hover:underline ${isLow(p) ? "text-red-500" : "text-slate-700"}`}>
                        {p.quantity ?? 0}
                        {isLow(p) && <span className="block text-[10px] font-normal">{isOut(p) ? "tugagan" : "kam qoldi"}</span>}
                      </button>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-500">{p.costPrice ? `${FormattedPrice(p.costPrice)}` : "—"}</td>
                  <td className="py-2 px-3 text-right text-slate-500">{FormattedPrice(p.price)}</td>
                  <td className="py-2 px-3 text-right font-semibold text-slate-700">{FormattedPrice((p.quantity ?? 0) * (p.costPrice ?? 0))}</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => setStockProduct(p)}
                      title="Zaxira harakati: qoʼshish / ayirish / tuzatish"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-50 text-brand-600 text-xs font-semibold hover:bg-brand-100"
                    >
                      <FiBox /> Kirim/Chiqim
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visible.length > shown && (
        <div className="flex justify-center pt-5">
          <button
            onClick={() => setShown((s) => s + 24)}
            className="px-5 py-2 rounded-lg border border-brand-200 text-brand-600 font-medium hover:bg-brand-50"
          >
            Yana koʼrsatish ({visible.length - shown})
          </button>
        </div>
      )}

      {stockProduct && <StockMovementModal product={stockProduct} onClose={() => setStockProduct(null)} />}
    </div>
  );
};

export default OmborDetail;
