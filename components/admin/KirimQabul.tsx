"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FiMinus, FiPlus, FiSearch, FiTrash2, FiTruck, FiCheckCircle } from "react-icons/fi";
import useProductStore from "@/zustand/useProductStore";
import useSupplierStore from "@/zustand/useSupplierStore";
import useStockStore, { ReceiveLine } from "@/zustand/useStockStore";
import { useRole } from "./RoleContext";
import ProductImage, { firstThumbUrl } from "@/components/ProductImage";
import { ProductT } from "@/lib/types";
import { FormattedPrice } from "@/utils";

// Receiving-document reference (e.g. "KR-K3F9A2") — same style as order nos, so
// every ledger row of one qabul shares a quotable id.
const genDocNo = (): string => {
  const t = Date.now().toString(36).toUpperCase().slice(-5);
  const r = Math.random().toString(36).toUpperCase().slice(2, 4).padEnd(2, "X");
  return `KR-${t}${r}`;
};

// Kirim — tovar qabul qilish. An enterprise receiving document: pick the
// supplier, scan/search products into lines, set miqdor + tan narx per line,
// and commit once — stock increments, tan narx refreshes, and every line lands
// in the Harakatlar ledger under one KR- hujjat raqami.
const KirimQabul = () => {
  const me = useRole();
  const { products, fetchProducts } = useProductStore();
  const { suppliers, fetchSuppliers, addSupplier } = useSupplierStore();
  const { receiveGoods } = useStockStore();

  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [updateCost, setUpdateCost] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newSupOpen, setNewSupOpen] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [done, setDone] = useState<{ docNo: string; kinds: number; units: number; sum: number } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, [fetchProducts, fetchSuppliers]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          (p.title ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [products, search]);

  const addLine = (p: ProductT) => {
    setDone(null);
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      if (prev.length >= 150) {
        toast.error("Bitta hujjatda koʼpi bilan 150 qator");
        return prev;
      }
      return [...prev, { product: p, qty: 1, unitCost: Number(p.costPrice) || 0 }];
    });
    setSearch("");
    searchRef.current?.focus();
  };

  // Hardware barcode scanner types the code then Enter — add the exact match.
  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const q = search.trim();
    if (!q) return;
    const exact = products.find((p) => p.barcode === q || p.id === q);
    const target = exact ?? (matches.length === 1 ? matches[0] : null);
    if (target) addLine(target);
  };

  // Stepper/trash path: hitting 0 removes the row (cart idiom).
  const setLineQty = (id: string, qty: number) => {
    if (qty <= 0) return setLines((prev) => prev.filter((l) => l.product.id !== id));
    if (qty > 1_000_000) return;
    setLines((prev) => prev.map((l) => (l.product.id === id ? { ...l, qty } : l)));
  };
  // Typing path: clearing the field to retype must NOT delete the row — hold it
  // at 0 (rendered empty); commit() refuses zero-qty lines with a clear message.
  const typeLineQty = (id: string, raw: string) => {
    const n = parseInt(raw, 10);
    const qty = Number.isFinite(n) ? Math.min(1_000_000, Math.max(0, n)) : 0;
    setLines((prev) => prev.map((l) => (l.product.id === id ? { ...l, qty } : l)));
  };
  const setLineCost = (id: string, unitCost: number) =>
    setLines((prev) => prev.map((l) => (l.product.id === id ? { ...l, unitCost: Math.max(0, unitCost) } : l)));

  const totals = useMemo(() => {
    let units = 0, sum = 0;
    for (const l of lines) {
      units += l.qty;
      sum += l.qty * (l.unitCost || 0);
    }
    return { kinds: lines.length, units, sum };
  }, [lines]);

  const saveSupplier = async () => {
    const name = newSupName.trim();
    if (!name) return toast.error("Nomini kiriting");
    try {
      await addSupplier({ name });
      setSupplier(name);
      setNewSupName("");
      setNewSupOpen(false);
      toast.success("Yetkazib beruvchi qoʼshildi");
    } catch {
      toast.error("Saqlab boʼlmadi");
    }
  };

  const commit = async () => {
    if (lines.length === 0) return toast.error("Kamida bitta mahsulot qoʼshing");
    if (lines.some((l) => !Number.isFinite(l.qty) || Math.floor(l.qty) <= 0))
      return toast.error("Har bir qatorda miqdor 1 dan katta boʼlsin");
    setBusy(true);
    const docNo = genDocNo();
    try {
      await receiveGoods({
        lines,
        supplierName: supplier,
        note,
        docNo,
        updateCost,
        actorUid: me?.uid ?? "",
        actorName: me?.name ?? "",
      });
      setDone({ docNo, ...totals });
      setLines([]);
      setNote("");
      toast.success(`Qabul qilindi — ${totals.units} dona (${docNo})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg === "too-many-lines"
          ? "Bitta hujjatda koʼpi bilan 150 qator — boʼlib qabul qiling"
          : msg === "empty"
            ? "Kamida bitta mahsulot qoʼshing"
            : "Saqlab boʼlmadi (ruxsat yoki internet)"
      );
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-300 text-slate-700 placeholder-slate-400";

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-slate-500 mb-4">
        Yangi tovar keldimi? Shu yerda qabul qiling: yetkazib beruvchini tanlang, mahsulotlarni
        qidirib (yoki shtrix-kodni skaner qilib) qoʼshing, har biriga <b>miqdor</b> va{" "}
        <b>tan narx</b>ni kiriting. «Qabul qilish» bosilganda zaxira avtomatik koʼpayadi va hamma
        qator <b>Harakatlar</b> tarixiga yoziladi.
      </p>

      {/* Success panel — the last committed document */}
      {done && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
          <FiCheckCircle className="text-green-600 text-xl shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-bold">Qabul qilindi — hujjat {done.docNo}</p>
            <p>
              {done.kinds} tur · {done.units} dona
              {done.sum > 0 && <> · jami tan narx {FormattedPrice(done.sum)} soʼm</>}
              {" "}— zaxiraga qoʼshildi, tarixda koʼrinadi.
            </p>
          </div>
        </div>
      )}

      {/* Supplier + note */}
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Yetkazib beruvchi
          </label>
          <div className="flex gap-2">
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={input}>
              <option value="">Tanlanmagan (ixtiyoriy)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setNewSupOpen((v) => !v)}
              title="Yangi yetkazib beruvchi qoʼshish"
              className="px-3 rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50 shrink-0"
            >
              <FiPlus />
            </button>
          </div>
          {newSupOpen && (
            <div className="flex gap-2 mt-2">
              <input
                value={newSupName}
                onChange={(e) => setNewSupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveSupplier()}
                placeholder="Yangi firma / ombor nomi"
                className={input}
                autoFocus
              />
              <button
                type="button"
                onClick={saveSupplier}
                className="px-4 rounded-lg bg-brand-500 text-white font-semibold hover:bg-brand-600 shrink-0"
              >
                Saqlash
              </button>
            </div>
          )}
          <Link
            href="/admin-dashboard/suppliers"
            className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline mt-1"
          >
            <FiTruck /> Barcha yetkazib beruvchilar
          </Link>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Izoh</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Masalan: 07.08 partiya, faktura №12 (ixtiyoriy)"
            className={input}
          />
        </div>
      </div>

      {/* Product search / scan */}
      <div className="relative mb-3">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Mahsulot qidiring yoki shtrix-kodni skaner qiling…"
          className={`${input} pl-9`}
        />
        {matches.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
            {matches.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addLine(p)}
                className="w-full flex items-center gap-3 text-left px-3 py-2 hover:bg-brand-50 border-b border-slate-50 last:border-0"
              >
                <div className="relative size-9 shrink-0 rounded overflow-hidden bg-slate-50">
                  <ProductImage fill sizes="36px" className="object-cover" src={firstThumbUrl(p.productImageUrl)} alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 capitalize truncate">{p.title}</p>
                  <p className="text-xs text-slate-400">
                    qoldiq: {p.quantity ?? 0} dona
                    {p.costPrice ? <> · tan: {FormattedPrice(p.costPrice)}</> : null}
                  </p>
                </div>
                <FiPlus className="text-brand-500 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lines */}
      {lines.length === 0 ? (
        <p className="text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl py-10 mb-3">
          Hujjat boʼsh — yuqoridagi qidiruvdan mahsulot qoʼshing.
        </p>
      ) : (
        <div className="space-y-2.5 mb-3">
          {lines.map((l) => {
            const cur = Number(l.product.quantity) || 0;
            return (
              <div key={l.product.id} className="rounded-xl border border-brand-100 bg-white p-3">
                <div className="flex items-center gap-3">
                  <div className="relative size-11 shrink-0 rounded overflow-hidden bg-slate-50">
                    <ProductImage fill sizes="44px" className="object-cover" src={firstThumbUrl(l.product.productImageUrl)} alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700 capitalize leading-tight truncate">
                      {l.product.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      qoldiq: {cur} → <b className="text-green-600">{cur + Math.max(0, Math.floor(l.qty) || 0)}</b> dona
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLineQty(l.product.id, 0)}
                    className="text-red-400 hover:text-red-600 shrink-0"
                    aria-label="Qatorni oʼchirish"
                  >
                    <FiTrash2 />
                  </button>
                </div>
                <div className="flex flex-wrap items-end gap-3 mt-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Miqdor (dona)</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setLineQty(l.product.id, l.qty - 1)}
                        className="size-8 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                      >
                        <FiMinus className="text-xs" />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={l.qty || ""}
                        placeholder="0"
                        onChange={(e) => typeLineQty(l.product.id, e.target.value)}
                        className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-center text-slate-700 outline-none focus:ring-1 focus:ring-brand-300"
                      />
                      <button
                        type="button"
                        onClick={() => setLineQty(l.product.id, l.qty + 1)}
                        className="size-8 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                      >
                        <FiPlus className="text-xs" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                      Tan narx (1 dona, soʼm)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={l.unitCost || ""}
                      placeholder="0"
                      onChange={(e) => setLineCost(l.product.id, parseFloat(e.target.value) || 0)}
                      className="w-32 px-2 py-1.5 border border-slate-200 rounded-lg text-right text-slate-700 outline-none focus:ring-1 focus:ring-brand-300"
                    />
                  </div>
                  <p className="ml-auto text-sm text-slate-500">
                    = <b className="text-slate-700">{FormattedPrice(l.qty * (l.unitCost || 0))}</b> soʼm
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Options + summary + commit */}
      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={updateCost}
          onChange={(e) => setUpdateCost(e.target.checked)}
          className="size-4 accent-brand-500"
        />
        Kiritilgan tan narx mahsulot kartasiga yozilsin (yangi tan narx boʼladi)
      </label>

      <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            <p>
              <b>{totals.kinds}</b> tur · <b>{totals.units}</b> dona
            </p>
            <p className="text-xs text-slate-500">
              Jami tan narx: <b>{FormattedPrice(totals.sum)}</b> soʼm
            </p>
          </div>
          <button
            type="button"
            onClick={commit}
            disabled={busy || lines.length === 0}
            className="px-6 py-2.5 rounded-lg bg-brand-500 text-white font-bold hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? "Saqlanmoqda…" : "✓ Qabul qilish"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KirimQabul;
