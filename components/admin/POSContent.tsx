"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import { FiChevronUp, FiClock, FiMinus, FiPlus, FiSearch, FiShoppingCart, FiTrash2, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Loader from "../Loader";
import ProductImage, { firstImageUrl } from "@/components/ProductImage";
import { useRole } from "./RoleContext";
import useProductStore from "@/zustand/useProductStore";
import useCustomerStore from "@/zustand/useCustomerStore";
import { useOrderStore, StoreSaleItem } from "@/zustand/useOrderStore";
import { ProductT, CustomerT } from "@/lib/types";
import { FormattedPrice } from "@/utils";
import { printReceipt, openReceiptWindow } from "@/utils/receipt";

// In-store counter (POS) — cash sales recorded into the same orders collection
// as the website (channel:"store", status:"sotildi"). Fiscal receipt + card
// payment come in a later phase; this records the sale and feeds the CRM/KPIs.
const POSContent = () => {
  const { products, loading, fetchProducts } = useProductStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { addStoreSale } = useOrderStore();
  const me = useRole();
  const [search, setSearch] = useState("");
  const [basket, setBasket] = useState<StoreSaleItem[]>([]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [custPicked, setCustPicked] = useState<CustomerT | null>(null);
  const [cash, setCash] = useState("");
  const [discount, setDiscount] = useState("");
  const [busy, setBusy] = useState(false);
  const [printChek, setPrintChek] = useState(true);
  const [chekWidth, setChekWidth] = useState<58 | 80>(80);
  const [sheetOpen, setSheetOpen] = useState(false); // mobile "Sotuv tahlili" bottom sheet
  // Sale moment. "" = live "hozir" (records at commit time); a datetime-local
  // string = backdated sale (e.g. daftar entries from when the till was offline).
  const [saleAt, setSaleAt] = useState("");
  // Live wall clock for the header chip + the picker default/max. Starts at 0,
  // not Date.now(), so SSR HTML and the first client paint agree; a mount
  // effect fills it in. Minute-level display → a 15s tick is plenty.
  const [nowMs, setNowMs] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const payingRef = useRef(false); // re-entry guard so a double-tap can't double-charge

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, [fetchProducts, fetchCustomers]);

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  // The sheet only makes sense with items in it — auto-close when the basket
  // empties (last line removed, or a completed sale).
  useEffect(() => {
    if (basket.length === 0) setSheetOpen(false);
  }, [basket.length]);

  // Freeze background scroll while the sheet is up.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  // Recognize repeat buyers at the till: match the typed name/phone against the
  // CRM (derived from past orders). Picking one links the sale to that customer.
  const custMatches = useMemo(() => {
    const q = phone.trim().toLowerCase();
    if (q.length < 2 || custPicked) return [];
    const digits = q.replace(/\D/g, "");
    return customers
      .filter(
        (c) =>
          c.phone !== "no-phone" &&
          ((digits.length >= 2 && c.phone.includes(digits)) ||
            (c.name ?? "").toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [customers, phone, custPicked]);

  const pickCustomer = (c: CustomerT) => {
    setPhone(c.displayPhone || c.phone);
    setName(c.name || "");
    setCustPicked(c);
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => !p.isHidden);
    if (!q) return list;
    return list.filter(
      (p) =>
        (p.title ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [products, search]);

  const subtotal = useMemo(() => basket.reduce((a, b) => a + b.price * b.quantity, 0), [basket]);
  const totalQty = useMemo(() => basket.reduce((a, b) => a + b.quantity, 0), [basket]);
  const discountNum = Math.min(Math.max(0, parseFloat(discount) || 0), subtotal);
  const total = Math.max(0, subtotal - discountNum);
  const cashNum = parseFloat(cash) || 0;
  const change = cashNum - total;
  // QQS contained in the payable total (extraction from VAT-inclusive prices,
  // discount allocated pro-rata) — the same figure the printed chek shows.
  const basketVat = useMemo(() => {
    let vat = 0;
    for (const b of basket) {
      const r = Number(b.vatRate) || 0;
      if (r > 0) vat += (b.price * b.quantity * r) / (100 + r);
    }
    if (vat > 0 && subtotal > 0 && total < subtotal) vat *= total / subtotal;
    return vat;
  }, [basket, subtotal, total]);

  // datetime-local wants a LOCAL "YYYY-MM-DDTHH:mm" (no timezone suffix) —
  // toISOString() would shift the wall time to UTC.
  const toLocalInput = (ms: number) => {
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const fmtDT = (ms: number) =>
    new Date(ms).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const saleAtMs = useMemo(() => {
    if (!saleAt) return null;
    const t = new Date(saleAt).getTime();
    return Number.isNaN(t) ? null : t;
  }, [saleAt]);
  const backdated = saleAtMs !== null;

  // Live on-hand for a product (the POS list is a real-time snapshot).
  const stockOf = (id: string) => products.find((p) => p.id === id)?.quantity ?? 0;

  const addToBasket = (p: ProductT) => {
    const stock = p.quantity ?? 0;
    const inBasket = basket.find((b) => b.id === p.id)?.quantity ?? 0;
    // Don't let the till oversell a tracked item past its on-hand stock.
    if (stock > 0 && inBasket >= stock) {
      return toast.error(`"${p.title}": zaxirada faqat ${stock} dona bor`);
    }
    // stock <= 0 means out-of-stock OR not-yet-counted — allow but warn, so an
    // un-seeded catalog can still sell while the owner is filling in stock.
    if (stock <= 0) {
      toast(`"${p.title}": zaxira tugagan yoki belgilanmagan`, { icon: "⚠️" });
    }
    setBasket((prev) => {
      const i = prev.findIndex((b) => b.id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: p.id,
          title: p.title,
          price: p.price,
          quantity: 1,
          category: p.category ?? "",
          productImageUrl: p.productImageUrl ?? [],
          // Snapshot cost + fiscal codes at sale time (profit + future ChEK).
          costAtSale: p.costPrice ?? 0,
          ikpu: p.ikpu ?? "",
          // Canonical default 12 — same as add/update-product and CSV import —
          // so a legacy product's fiscal treatment can't depend on which screen
          // last touched it. Explicit 0 still means "QQS yoʼq".
          vatRate: p.vatRate ?? 12,
        },
      ];
    });
  };
  const setQty = (id: string, delta: number) => {
    const line = basket.find((b) => b.id === id);
    if (!line) return;
    const next = line.quantity + delta;
    if (next <= 0) {
      setBasket((prev) => prev.filter((b) => b.id !== id));
      return;
    }
    const stock = stockOf(id);
    if (delta > 0 && stock > 0 && next > stock) {
      return toast.error(`Zaxirada faqat ${stock} dona bor`);
    }
    setBasket((prev) => prev.map((b) => (b.id === id ? { ...b, quantity: next } : b)));
  };
  const removeLine = (id: string) => setBasket((prev) => prev.filter((b) => b.id !== id));

  // A hardware scanner types the code then Enter. On Enter, add the product
  // matched by exact barcode/id (or the single visible match).
  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const q = search.trim();
    if (!q) return;
    const exact = products.find((p) => p.barcode === q || p.id === q);
    const target = exact ?? (visible.length === 1 ? visible[0] : null);
    if (target) {
      addToBasket(target);
      setSearch("");
      searchRef.current?.focus();
    }
  };

  const pay = async () => {
    if (payingRef.current) return; // already processing — blocks double-tap / both pay buttons
    if (!basket.length) return toast.error("Savatcha boʼsh");
    if (cash && cashNum < total) return toast.error("Naqd pul yetarli emas");
    // Backdating is for the PAST (a sale from the paper daftar) — a future-dated
    // order would sit outside every report period until its day arrives.
    if (saleAtMs !== null && saleAtMs > Date.now() + 60_000) {
      return toast.error("Kelajak sanasiga sotuv yozib boʼlmaydi");
    }
    payingRef.current = true;
    // Open the chek window NOW — synchronously, inside the click gesture — so the
    // browser doesn't block it as a non-user popup. The sale below is async, and a
    // window.open AFTER the await would be blocked (nothing would print). It shows
    // a "preparing…" placeholder until the sale resolves; we fill it in then.
    const chekWin = printChek ? openReceiptWindow(chekWidth) : null;
    if (printChek && !chekWin) toast.error("Chek oynasi bloklandi — popup ruxsatini yoqing");
    setBusy(true);
    // Snapshot everything the receipt needs BEFORE the form is cleared.
    const receiptItems = basket.map((b) => ({
      title: b.title,
      quantity: b.quantity,
      price: b.price,
      vatRate: b.vatRate,
    }));
    const tendered = cash !== "" ? cashNum : undefined;
    const soldMs = saleAtMs ?? Date.now(); // freeze the moment ONCE — doc and chek must agree
    try {
      const { orderNo } = await addStoreSale({
        basketItems: basket,
        totalPrice: total,
        totalQuantity: totalQty,
        discount: discountNum,
        clientName: name.trim(),
        clientLastName: "",
        clientPhone: phone.trim(),
        cashierUid: me?.uid ?? "",
        cashierName: me?.name ?? "",
        paymentMethod: "naqd",
        soldAtMs: soldMs,
      });
      toast.success(
        backdated
          ? `Sotuv yakunlandi (${fmtDT(soldMs)}) — ${FormattedPrice(total)} UZS`
          : `Sotuv yakunlandi — ${FormattedPrice(total)} UZS`
      );
      if (chekWin) {
        printReceipt(
          {
            orderNo,
            dateMs: soldMs,
            cashier: me?.name,
            customerName: name.trim() || undefined,
            customerPhone: phone.trim() || undefined,
            items: receiptItems,
            subtotal,
            discount: discountNum,
            total,
            cash: tendered,
            change: tendered !== undefined ? tendered - total : undefined,
            paymentMethod: "naqd",
            widthMm: chekWidth,
            heading: "CHEK",
          },
          chekWin
        );
      }
      setBasket([]);
      setPhone("");
      setName("");
      setCustPicked(null);
      setCash("");
      setDiscount("");
      setSaleAt(""); // next sale goes back on the live clock — a stale backdate can't leak forward
      searchRef.current?.focus();
    } catch {
      chekWin?.close(); // discard the placeholder window if the sale didn't save
      toast.error("Sotuvni saqlab boʼlmadi");
    } finally {
      setBusy(false);
      payingRef.current = false;
    }
  };

  const inputCls =
    "w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-300 text-slate-700 placeholder-slate-400";

  // The basket + payment panel. Rendered twice — desktop right column and the
  // mobile "Sotuv tahlili" bottom sheet — off the same controlled state, so the
  // two are always in sync (only one is visible per breakpoint).
  const salePanel = (
    <>
      {basket.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">
          Mahsulotni bosing yoki shtrix-kodni skaner qiling.
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {basket.map((b) => (
            <div key={b.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{b.title}</p>
                <p className="text-xs text-slate-500">
                  {FormattedPrice(b.price)} × {b.quantity} = {FormattedPrice(b.price * b.quantity)}
                </p>
              </div>
              <button onClick={() => setQty(b.id, -1)} className="size-8 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                <FiMinus className="text-xs" />
              </button>
              <span className="w-5 text-center text-sm">{b.quantity}</span>
              <button
                onClick={() => setQty(b.id, 1)}
                disabled={stockOf(b.id) > 0 && b.quantity >= stockOf(b.id)}
                title={stockOf(b.id) > 0 && b.quantity >= stockOf(b.id) ? "Zaxira chegarasi" : ""}
                className="size-8 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiPlus className="text-xs" />
              </button>
              <button onClick={() => removeLine(b.id)} className="text-red-400 hover:text-red-600 ml-1">
                <FiTrash2 className="text-sm" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-100 mt-3 pt-3 space-y-1.5">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Oraliq jami</span>
          <span>{FormattedPrice(subtotal)} UZS</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-500">Chegirma</span>
          <input
            type="number"
            inputMode="numeric"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
            className="w-28 px-2 py-1 border border-slate-200 rounded-lg text-right text-slate-700 outline-none focus:ring-1 focus:ring-brand-300"
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold text-slate-700">Jami</span>
          <span className="font-bold text-lg text-brand-600">{FormattedPrice(total)} UZS</span>
        </div>
        {basketVat > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>shu jumladan QQS</span>
            <span>{FormattedPrice(Math.round(basketVat))} UZS</span>
          </div>
        )}
      </div>

      {/* Sale moment — defaults to a live "hozir"; picking a past date/time
          backdates the order (every report buckets on the order's date), with a
          loud amber state so a forgotten override can't mis-date later sales. */}
      <div className={`mt-3 rounded-lg border px-2.5 py-2 ${backdated ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm text-slate-600">
            <FiClock className={backdated ? "text-amber-500" : "text-brand-500"} />
            Sotuv sanasi
          </span>
          {backdated ? (
            <button
              type="button"
              onClick={() => setSaleAt("")}
              className="text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              Hozirga qaytarish
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-600">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
              Hozir
            </span>
          )}
        </div>
        <input
          type="datetime-local"
          value={saleAt || (nowMs ? toLocalInput(nowMs) : "")}
          max={nowMs ? toLocalInput(nowMs) : undefined}
          onChange={(e) => setSaleAt(e.target.value)}
          className="w-full mt-1.5 px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 outline-none focus:ring-1 focus:ring-brand-300"
        />
        {saleAtMs !== null && (
          <p className="text-[11px] text-amber-700 mt-1">
            ⚠️ Sotuv {fmtDT(saleAtMs)} sanasiga yoziladi
          </p>
        )}
      </div>

      <div className="space-y-2 mt-3">
        <div className="relative">
          <input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setCustPicked(null);
              if (!e.target.value) setName("");
            }}
            placeholder="Mijoz: ism yoki telefon (ixtiyoriy)"
            className={inputCls}
          />
          {custMatches.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {custMatches.map((c) => (
                <button
                  key={c.phone}
                  type="button"
                  onClick={() => pickCustomer(c)}
                  className="w-full text-left px-3 py-2 hover:bg-brand-50 border-b border-slate-50 last:border-0"
                >
                  <p className="text-sm text-slate-700 capitalize">{c.name || "Mijoz"}</p>
                  <p className="text-xs text-slate-400">
                    {c.displayPhone} · {c.orderCount} buyurtma
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
        {custPicked && (
          <div className="flex items-center justify-between gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
            <span>
              ♻️ <b className="capitalize">{custPicked.name || "Mijoz"}</b> ·{" "}
              {custPicked.orderCount} buyurtma · {FormattedPrice(custPicked.totalSpent)} UZS
            </span>
            <button
              type="button"
              onClick={() => {
                setCustPicked(null);
                setPhone("");
                setName("");
              }}
              className="text-green-700/70 hover:text-green-900"
              aria-label="Bekor qilish"
            >
              ✕
            </button>
          </div>
        )}
        <input
          type="number"
          inputMode="numeric"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
          placeholder="Berilgan naqd pul"
          className={inputCls}
        />
        {cash !== "" && cashNum >= total && (
          <p className="text-sm text-green-600 font-medium">Qaytim: {FormattedPrice(change)} UZS</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={printChek}
            onChange={(e) => setPrintChek(e.target.checked)}
            className="size-4 accent-brand-500"
          />
          🧾 Chek chiqarish
        </label>
        <select
          value={chekWidth}
          onChange={(e) => setChekWidth(Number(e.target.value) as 58 | 80)}
          disabled={!printChek}
          title="Chek qogʼozi eni"
          className="border border-slate-200 rounded-lg px-2 py-1 text-slate-600 outline-none disabled:opacity-50"
        >
          <option value={80}>80 mm</option>
          <option value={58}>58 mm</option>
        </select>
      </div>

      <button
        onClick={pay}
        disabled={busy || basket.length === 0}
        className="w-full mt-3 px-4 py-3 rounded-lg bg-brand-500 text-white font-bold hover:bg-brand-600 disabled:opacity-50"
      >
        {busy ? "Saqlanmoqda…" : "Toʼlash (naqd)"}
      </button>
      <p className="text-[11px] text-slate-400 mt-2">
        Hozircha naqd sotuv qayd etiladi. Fiskal chek va karta/QR toʼlovi keyingi bosqichda
        (roʼyxatdan oʼtgan virtual kassa orqali).
      </p>
    </>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-5">
      <Link
        href="/admin-dashboard"
        className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-brand-500 mb-2"
      >
        <GoArrowLeft className="text-xl" />
        <span>Admin panel</span>
      </Link>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h1 className="text-xl font-bold text-brand-500">Kassa (POS)</h1>
        {/* The exact moment the sotuv will be recorded at — live clock, or the
            picked override (amber = backdating in effect). */}
        {nowMs > 0 && (
          <span
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border ${
              backdated
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-white border-slate-200 text-slate-500"
            }`}
          >
            <FiClock className={backdated ? "text-amber-500" : "text-brand-500"} />
            {fmtDT(saleAtMs ?? nowMs)}
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-5">
        {/* LEFT: scan/search + product grid */}
        <div>
          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder="Shtrix-kod skaner qiling yoki nomi boʼyicha qidiring…"
              className={`${inputCls} pl-9`}
            />
          </div>

          {loading && products.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader />
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center text-slate-400 py-16">Mahsulot topilmadi.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {visible.map((p) => {
                const stock = p.quantity ?? 0;
                const low = stock > 0 && stock <= (p.lowStockThreshold ?? 5);
                return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToBasket(p)}
                  className={`border border-slate-200 rounded-lg p-2 text-left hover:border-brand-400 hover:shadow-sm transition ${stock <= 0 ? "opacity-60" : ""}`}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded mb-1 bg-slate-50">
                    <ProductImage
                      src={firstImageUrl(p.productImageUrl)}
                      alt={p.title}
                      fill
                      className="object-cover"
                    />
                    <span
                      className={`absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        stock <= 0
                          ? "bg-red-500 text-white"
                          : low
                            ? "bg-amber-100 text-amber-700"
                            : "bg-white/90 text-slate-600"
                      }`}
                    >
                      {stock <= 0 ? "Tugadi" : `${stock} dona`}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 line-clamp-2 min-h-8">{p.title}</p>
                  <p className="text-xs text-brand-600 font-bold">{FormattedPrice(p.price)} UZS</p>
                </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: basket + payment (desktop/tablet). On phones this panel
            lives in the "Sotuv tahlili" bottom sheet instead — no scrolling
            past the product grid to finish a sale. */}
        <div className="hidden lg:block bg-white border border-slate-200 rounded-xl p-4 h-fit lg:sticky lg:top-4">
          <h2 className="font-bold text-slate-700 mb-2">Savatcha ({totalQty})</h2>
          {salePanel}
        </div>
      </div>

      {/* Mobile sticky bar — one-tap pay + "Sotuv tahlili", which raises the
          whole basket/payment panel as a bottom sheet, so the admin never
          scrolls past the product grid to finish a sale. Floats above the dock. */}
      {basket.length > 0 && (
        <div className="lg:hidden fixed inset-x-3 bottom-[4.75rem] z-40 flex items-stretch gap-2 rounded-2xl bg-white/95 backdrop-blur border border-brand-100 shadow-[0_8px_30px_rgba(0,0,0,0.18)] px-3 py-2">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex-1 min-w-0 flex items-center gap-2.5 text-left active:scale-[0.98] transition-transform"
            aria-label="Sotuv tahlili — savatchani ochish"
          >
            <span className="relative shrink-0 size-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <FiShoppingCart className="text-lg" />
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                {totalQty}
              </span>
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 leading-none">
                Sotuv tahlili <FiChevronUp className="text-sm" />
              </span>
              <span className="block font-bold text-brand-600 text-lg leading-tight truncate">
                {FormattedPrice(total)} UZS
              </span>
            </span>
          </button>
          <button
            onClick={pay}
            disabled={busy}
            className="px-5 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 disabled:opacity-50 shrink-0"
          >
            {busy ? "..." : "Toʼlash"}
          </button>
        </div>
      )}

      {/* Mobile "Sotuv tahlili" bottom sheet — the full basket/payment panel
          (lines, chegirma, sana/vaqt, mijoz, naqd, chek) without any scrolling.
          Same z-tiers as the dock's "Yana" sheet so stacking stays consistent. */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/30 lg:hidden"
              onClick={() => setSheetOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed bottom-0 inset-x-0 z-[70] lg:hidden bg-white rounded-t-3xl shadow-2xl px-4 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))] max-h-[88dvh] overflow-y-auto overscroll-contain"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-slate-700">Sotuv tahlili · {totalQty} ta</h2>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Yopish"
                >
                  <FiX className="text-xl" />
                </button>
              </div>
              {salePanel}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default POSContent;
