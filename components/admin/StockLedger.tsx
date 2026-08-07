"use client";
import { useEffect, useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import Loader from "../Loader";
import useStockStore from "@/zustand/useStockStore";
import { FormattedPrice } from "@/utils";

const TYPE_BADGE: Record<string, string> = {
  kirim: "bg-green-100 text-green-700",
  chiqim: "bg-red-100 text-red-700",
  tuzatish: "bg-blue-100 text-blue-700",
  sotuv: "bg-teal-100 text-teal-700",
  qaytarish: "bg-orange-100 text-orange-700",
};
const TYPE_LABEL: Record<string, string> = {
  kirim: "Kirim (+)",
  chiqim: "Chiqim (−)",
  tuzatish: "Tuzatish (=)",
  sotuv: "Sotuv",
  qaytarish: "Qaytarish",
};
const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Hammasi" },
  { key: "kirim", label: "Kirim" },
  { key: "chiqim", label: "Chiqim" },
  { key: "tuzatish", label: "Tuzatish" },
  { key: "sotuv", label: "Sotuv" },
  { key: "qaytarish", label: "Qaytarish" },
];

// Ombor → Harakatlar: the append-only stock ledger. EVERY quantity change lands
// here — qabul (kirim), chiqim, qoʼlda tuzatish, POS/web sotuv, qaytarish — so
// "nega qoldiq oʼzgardi?" always has an answer with sana, sabab and kim.
const StockLedger = () => {
  const { movements, loading, fetchMovements } = useStockStore();
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements.filter((m) => {
      if (typeFilter && m.type !== typeFilter) return false;
      if (!q) return true;
      return (
        (m.productTitle ?? "").toLowerCase().includes(q) ||
        (m.supplierName ?? "").toLowerCase().includes(q) ||
        (m.orderNo ?? "").toLowerCase().includes(q) ||
        (m.actorName ?? "").toLowerCase().includes(q)
      );
    });
  }, [movements, typeFilter, search]);

  const fmtWhen = (m: (typeof movements)[number]) =>
    m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString() : "—";

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        Zaxiraning <b>barcha</b> oʼzgarishlari shu yerda: <b>Kirim</b> (tovar qabul qilish),{" "}
        <b>Chiqim</b> (yaroqsiz/yoʼqolgan), <b>Tuzatish</b> (qoʼlda oʼzgartirish yoki sanash),
        hamda avtomatik <b>Sotuv</b> va <b>Qaytarish</b> yozuvlari. Har bir qatorda sana, miqdor,
        yangi qoldiq, sabab va kim bajargani koʼrinadi.
      </p>

      {/* Filter chips + search */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                typeFilter === f.key
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-brand-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px] sm:max-w-xs sm:ml-auto">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mahsulot, hujjat, kim…"
            className="w-full pl-9 pr-3 py-2 border border-brand-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-300 text-slate-700 placeholder-slate-400 text-sm"
          />
        </div>
      </div>

      {loading && movements.length === 0 && (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      )}
      {!loading && visible.length === 0 && (
        <p className="text-center text-slate-400 py-16">
          {movements.length === 0
            ? "Hozircha harakatlar yoʼq — birinchi kirimni «Kirim — qabul» boʼlimidan qiling."
            : "Filtr boʼyicha harakat topilmadi."}
        </p>
      )}

      {/* Mobile cards */}
      {visible.length > 0 && (
        <div className="lg:hidden space-y-2.5">
          {visible.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-700 capitalize truncate">{m.productTitle}</p>
                  <span className={`inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[m.type] ?? ""}`}>
                    {TYPE_LABEL[m.type] ?? m.type}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${m.delta < 0 ? "text-red-500" : m.delta > 0 ? "text-green-600" : "text-slate-400"}`}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </p>
                  <p className="text-[11px] text-slate-400">qoldiq: {m.newQty ?? "—"}</p>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{fmtWhen(m)}</span>
                {m.actorName && <span>{m.actorName}</span>}
                {(m.unitCost ?? 0) > 0 && <span>tan: {FormattedPrice(m.unitCost!)} soʼm</span>}
              </div>
              {(m.reason || m.supplierName || m.orderNo) && (
                <p className="text-xs text-slate-500 mt-1">
                  {[m.reason, m.supplierName, m.orderNo].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      {visible.length > 0 && (
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="py-2 px-3">Sana</th>
                <th className="py-2 px-3">Mahsulot</th>
                <th className="py-2 px-3">Tur</th>
                <th className="py-2 px-3 text-right">Oʼzgarish</th>
                <th className="py-2 px-3 text-right">Yangi qoldiq</th>
                <th className="py-2 px-3 text-right">Tan narx</th>
                <th className="py-2 px-3">Sabab / hujjat</th>
                <th className="py-2 px-3">Kim</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {visible.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="py-2 px-3 whitespace-nowrap text-slate-500">{fmtWhen(m)}</td>
                  <td className="py-2 px-3 capitalize">{m.productTitle}</td>
                  <td className="py-2 px-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[m.type] ?? ""}`}>
                      {TYPE_LABEL[m.type] ?? m.type}
                    </span>
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-bold ${
                      m.delta < 0 ? "text-red-500" : m.delta > 0 ? "text-green-600" : "text-slate-400"
                    }`}
                  >
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </td>
                  <td className="py-2 px-3 text-right">{m.newQty ?? "—"}</td>
                  <td className="py-2 px-3 text-right text-slate-500">
                    {(m.unitCost ?? 0) > 0 ? FormattedPrice(m.unitCost!) : "—"}
                  </td>
                  <td className="py-2 px-3 text-slate-500">
                    {m.reason || "—"}
                    {m.supplierName && (
                      <span className="block text-xs text-slate-400">↳ {m.supplierName}</span>
                    )}
                    {m.orderNo && (
                      <span className="block text-xs font-mono text-slate-400">{m.orderNo}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-500">{m.actorName || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockLedger;
