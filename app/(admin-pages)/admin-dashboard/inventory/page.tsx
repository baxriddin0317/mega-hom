"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import { FiBox, FiClock, FiGrid, FiTruck } from "react-icons/fi";
import useProductStore from "@/zustand/useProductStore";
import { useRole } from "@/components/admin/RoleContext";
import { isManagerPlus } from "@/lib/roles";
import NoAccess from "@/components/admin/NoAccess";
import ProductDetail from "@/components/admin/ProductDetail";
import CategoryDetail from "@/components/admin/CategoryDetail";
import KirimQabul from "@/components/admin/KirimQabul";
import StockLedger from "@/components/admin/StockLedger";
import LowStockCard from "@/components/admin/LowStockCard";
import { FormattedPrice } from "@/utils";

type OmborTab = "mahsulotlar" | "kirim" | "harakatlar" | "kategoriyalar";
const TABS: { key: OmborTab; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: "mahsulotlar", label: "Mahsulotlar", icon: <FiBox />, hint: "Qoʼshish, tahrirlash, narx, zaxira" },
  { key: "kirim", label: "Kirim — qabul", icon: <FiTruck />, hint: "Kelgan tovarni qabul qilish" },
  { key: "harakatlar", label: "Harakatlar", icon: <FiClock />, hint: "Zaxira tarixi (kim, qachon, nega)" },
  { key: "kategoriyalar", label: "Kategoriyalar", icon: <FiGrid />, hint: "Katalog boʼlimlari" },
];
const isTab = (v: string | null): v is OmborTab =>
  v === "mahsulotlar" || v === "kirim" || v === "harakatlar" || v === "kategoriyalar";

// Ombor — the ONE place the admin runs the shop's goods: create/edit products,
// receive incoming stock (kirim), audit every stock change, manage categories.
// The dashboard page stays reports-only; everything hands-on lives here.
const OmborPage = () => {
  const me = useRole();
  const { products, fetchProducts } = useProductStore();
  const [tab, setTab] = useState<OmborTab>("mahsulotlar");

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Deep-linkable tabs (?tab=kirim …) without useSearchParams — the admin pages
  // are statically prerendered and a Suspense boundary here isn't worth it.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("tab");
    if (isTab(q)) setTab(q);
  }, []);
  const switchTab = (t: OmborTab) => {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
  };

  // Valuation — Qoldiq (on-hand) × Tan narx (unit cost): the ombor's worth at
  // cost, at retail, and the margin still sitting on the shelves.
  const val = useMemo(() => {
    let units = 0, cost = 0, retail = 0, noCost = 0, low = 0, out = 0;
    for (const p of products) {
      const q = Number(p.quantity) || 0;
      const c = Number(p.costPrice) || 0;
      if (q > 0 && !p.costPrice) noCost++;
      if (q <= 0) out++;
      else if (q <= (p.lowStockThreshold ?? 5)) low++;
      units += q;
      cost += q * c;
      retail += q * (Number(p.price) || 0);
    }
    return { skus: products.length, units, cost, retail, profit: retail - cost, noCost, low, out };
  }, [products]);

  if (!isManagerPlus(me?.role)) return <NoAccess min="manager" />;

  const kpi = "rounded-xl border px-4 py-3";
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link
        href="/admin-dashboard"
        className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-brand mb-3"
      >
        <GoArrowLeft className="text-xl" />
        <span>Hisobotlar (bosh sahifa)</span>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-xl font-bold text-brand">Ombor — boshqaruv markazi</h1>
        <button
          type="button"
          onClick={() => switchTab("kirim")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-bold hover:bg-brand-600"
        >
          <FiTruck /> Kirim — tovar qabul qilish
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Doʼkon tovarlari bilan bogʼliq hamma ish shu yerda: mahsulot qoʼshish va tahrirlash, kelgan
        tovarni qabul qilish (kirim), zaxira tarixi va kategoriyalar.
      </p>

      {/* Valuation KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
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
        <div className={`${kpi} ${val.low + val.out > 0 ? "border-red-100 bg-red-50" : "border-slate-100 bg-white"}`}>
          <p className="text-xs text-slate-500">Kam qolgan / tugagan</p>
          <p className={`text-lg sm:text-xl font-bold ${val.low + val.out > 0 ? "text-red-500" : "text-slate-700"}`}>
            {val.low + val.out} <span className="text-sm font-medium text-slate-400">ta</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{val.out} tugagan · pastdagi roʼyxatda</p>
        </div>
      </div>
      {val.noCost > 0 && (
        <p className="mb-3 text-[11px] text-amber-600">
          ⚠ {val.noCost} ta mahsulotda tan narx kiritilmagan — ular tan narx qiymatiga kirmaydi.
          Kirim qabulida tan narxni kiritsangiz, avtomatik toʼladi.
        </p>
      )}

      <LowStockCard bare />

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            title={t.hint}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              tab === t.key
                ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-brand-50"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "mahsulotlar" && <ProductDetail />}
      {tab === "kirim" && <KirimQabul />}
      {tab === "harakatlar" && <StockLedger />}
      {tab === "kategoriyalar" && <CategoryDetail />}
    </div>
  );
};

export default OmborPage;
