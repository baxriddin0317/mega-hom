"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import JSZip from "jszip";
import { FiPrinter, FiDownload, FiSearch, FiPackage } from "react-icons/fi";
import { GoArrowLeft } from "react-icons/go";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import useProductStore from "@/zustand/useProductStore";
import { productUrl } from "@/lib/site";
import { FormattedPrice } from "@/utils";
import { ProductT } from "@/lib/types";

// Chop etiladigan yorliq varaq: har bir mahsulot uchun QR (mijoz skaner qilsa
// megahome.uz dagi sahifa ochiladi) + Code128 SHTRIX-KOD (do'kon kassasida
// skaner qilib savatga qo'shish uchun). Kartani qirqib mahsulotga yopishtiring.
const makeBarcode = (value: string): string => {
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, value, {
      format: "CODE128",
      displayValue: true,
      fontSize: 12,
      height: 40,
      width: 1.5,
      margin: 4,
    });
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("barcode failed:", err);
    return "";
  }
};

// Ekranda/varaqda ko'rsatiladigan QR — 400px "Q" (25%): bir varaqda 4 tadan
// chop etilganda ham toza va ishonchli skaner qilinadi.
const SHEET_QR_OPTS = {
  width: 400,
  margin: 4,
  errorCorrectionLevel: "Q" as const,
  color: { dark: "#1e293b", light: "#ffffff" },
};
// Yuklab olinadigan (yakka yoki ZIP) QR — 800px "H" (30%): ~6-7 sm stikerda ham
// toza (300 DPI) va yirtilsa/iflos bo'lsa ham o'qiladi.
const DOWNLOAD_QR_OPTS = {
  width: 800,
  margin: 4,
  errorCorrectionLevel: "H" as const,
  color: { dark: "#1e293b", light: "#ffffff" },
};

// Fayl nomi uchun xavfsiz slug (bo'sh bo'lsa — mahsulot id'siga qaytadi).
const slugify = (s?: string): string =>
  (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const triggerDownload = (href: string, filename: string, revoke = false) => {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1000);
};

const QRCodesPage = () => {
  const { products, loading, fetchProducts } = useProductStore();
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [bars, setBars] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [zipping, setZipping] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      const entries = await Promise.all(
        products.map(async (p) => {
          const dataUrl = await QRCode.toDataURL(productUrl(p.id), SHEET_QR_OPTS);
          return [p.id, dataUrl] as const;
        })
      );
      if (cancelled) return;
      setCodes(Object.fromEntries(entries));
      // Code128 barcode of the product's barcode value (falls back to the id).
      setBars(Object.fromEntries(products.map((p) => [p.id, makeBarcode(p.barcode || p.id)] as const)));
    };
    if (products.length) generate().catch((err) => console.error("QR sheet failed:", err));
    return () => {
      cancelled = true;
    };
  }, [products]);

  // Qidiruv — nomi, shtrix-kod yoki ID bo'yicha (POS-da izlash bilan bir xil his).
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        (p.title ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [products, search]);

  const fileFor = (p: ProductT) => `megahome-qr-${slugify(p.title) || p.id}.png`;

  // Yakka mahsulot QR'ini yuklab olish — yuqori sifatli 800px "H".
  const downloadOne = async (p: ProductT) => {
    setBusyId(p.id);
    try {
      const dataUrl = await QRCode.toDataURL(productUrl(p.id), DOWNLOAD_QR_OPTS);
      triggerDownload(dataUrl, fileFor(p));
    } catch (err) {
      console.error("QR download failed:", err);
      toast.error("QR yuklab boʼlmadi");
    } finally {
      setBusyId(null);
    }
  };

  // Yakka mahsulotni chop etish — oynani DARHOL ochamiz (await'dan oldin), aks
  // holda brauzer popup'ni bloklaydi. Ekrandagi QR (400 "Q") stikerga yetarli.
  const printOne = (p: ProductT) => {
    const qr = codes[p.id];
    if (!qr) return;
    const win = window.open("", "_blank", "width=420,height=560");
    if (!win) {
      toast.error("Brauzer oynani bloklab qoʼydi — popup ruxsatini yoqing");
      return;
    }
    const doc = win.document;
    doc.title = `QR — ${p.title}`;
    const style = doc.createElement("style");
    style.textContent =
      "body{font-family:-apple-system,Arial,sans-serif;text-align:center;padding:24px}" +
      "img{width:280px;height:280px}h2{font-size:16px;margin:8px 0 2px}" +
      "p{font-size:12px;color:#475569;margin:2px 0}";
    doc.head.appendChild(style);
    const img = doc.createElement("img");
    img.src = qr;
    img.alt = "QR";
    const heading = doc.createElement("h2");
    heading.textContent = p.title;
    const caption = doc.createElement("p");
    caption.textContent = "megahome.uz";
    doc.body.append(img, heading, caption);
    const fire = () => {
      try {
        win.focus();
        win.print();
      } catch {
        /* closed */
      }
    };
    if (img.complete && img.naturalWidth > 0) setTimeout(fire, 80);
    else {
      img.onload = fire;
      img.onerror = fire;
    }
  };

  // Barchasini (yoki qidiruv natijasini) bitta ZIP faylda yuklab olish — har bir
  // mahsulot alohida yuqori sifatli PNG. "Hammasini bir marta" ishonchli ishlaydi.
  const downloadAllZip = async () => {
    if (!visible.length) return;
    setZipping(true);
    const t = toast.loading(`QR kodlar tayyorlanmoqda… (0/${visible.length})`);
    try {
      const zip = new JSZip();
      const seen: Record<string, number> = {};
      let done = 0;
      for (const p of visible) {
        const dataUrl = await QRCode.toDataURL(productUrl(p.id), DOWNLOAD_QR_OPTS);
        // Nom to'qnashuvidan saqlanish (bir xil nomli mahsulotlar).
        let name = fileFor(p);
        if (seen[name] != null) {
          seen[name] += 1;
          name = name.replace(/\.png$/, `-${seen[name]}.png`);
        } else {
          seen[name] = 0;
        }
        zip.file(name, dataUrl.split(",")[1], { base64: true });
        done += 1;
        if (done % 10 === 0) toast.loading(`QR kodlar tayyorlanmoqda… (${done}/${visible.length})`, { id: t });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(URL.createObjectURL(blob), `megahome-qr-kodlar-${visible.length}ta.zip`, true);
      toast.success(`${visible.length} ta QR kod yuklandi`, { id: t });
    } catch (err) {
      console.error("ZIP failed:", err);
      toast.error("ZIP yaratib boʼlmadi", { id: t });
    } finally {
      setZipping(false);
    }
  };

  const sheetReady = products.length > 0 && Object.keys(codes).length >= products.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* boshqaruv paneli — chop etishda koʼrinmaydi */}
      <div className="print:hidden">
        <Link
          href="/admin-dashboard/inventory"
          className="flex items-center gap-1 w-fit text-gray-500 text-sm hover:text-brand-500 mb-2"
        >
          <GoArrowLeft className="text-xl" />
          <span>Ombor</span>
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl font-bold text-brand-500">QR va shtrix-kodlar</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Har bir mahsulotni alohida yuklab oling yoki chop eting; <b>Barchasini yuklash</b> bilan
              hammasini bitta ZIP faylda oling. <b>QR</b> — mijoz skaner qilsa saytdagi mahsulot
              sahifasi ochiladi; <b>shtrix-kod</b> — do'kon kassasida (POS) savatga qo'shish uchun.
            </p>
          </div>
        </div>

        {/* Qidiruv + ommaviy amallar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="relative flex-1 min-w-[220px] sm:max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nomi, shtrix-kod yoki ID boʼyicha izlash…"
              className="w-full pl-9 pr-3 py-2 border border-brand-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-300 text-slate-700 placeholder-slate-400"
            />
          </div>
          <span className="text-xs text-slate-400 order-last sm:order-none w-full sm:w-auto">
            {visible.length} ta{search ? " topildi" : ""}
          </span>
          <button
            type="button"
            onClick={downloadAllZip}
            disabled={!visible.length || zipping}
            className="px-4 py-2 rounded-lg border border-brand-300 text-brand-600 font-semibold hover:bg-brand-50 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <FiPackage /> {zipping ? "Tayyorlanmoqda…" : "Barchasini yuklash (ZIP)"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!sheetReady}
            className="px-4 py-2 rounded-lg bg-brand-500 text-white font-semibold hover:bg-brand-600 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <FiPrinter /> Chop etish
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-20 print:hidden">
          <Loader />
        </div>
      )}

      {!loading && !products.length && (
        <p className="text-center text-slate-500 py-20 print:hidden">Mahsulotlar topilmadi.</p>
      )}
      {!loading && products.length > 0 && !visible.length && (
        <p className="text-center text-slate-500 py-20 print:hidden">Qidiruv boʼyicha mahsulot topilmadi.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4 gap-4">
        {visible.map((p) => (
          <div
            key={p.id}
            className="border border-slate-200 rounded-lg p-3 text-center break-inside-avoid bg-white"
          >
            {codes[p.id] ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL, no optimizer needed
              <img src={codes[p.id]} alt={`QR: ${p.title}`} className="w-full aspect-square" />
            ) : (
              <div className="w-full aspect-square bg-slate-50 animate-pulse rounded" />
            )}
            <p className="text-xs font-semibold text-slate-700 mt-2 line-clamp-2 min-h-8">
              {p.title}
            </p>
            <p className="text-[11px] text-slate-500">{FormattedPrice(p.price)} UZS</p>
            {bars[p.id] && (
              // eslint-disable-next-line @next/next/no-img-element -- data URL, no optimizer needed
              <img src={bars[p.id]} alt={`shtrix-kod: ${p.title}`} className="w-full mt-1" />
            )}
            <p className="text-[10px] text-slate-400 mt-0.5">megahome.uz</p>

            {/* Yakka amallar — chop etishda koʼrinmaydi */}
            <div className="flex items-center justify-center gap-1.5 mt-2 print:hidden">
              <button
                type="button"
                onClick={() => downloadOne(p)}
                disabled={busyId === p.id}
                title="QR kodni yuklab olish (PNG)"
                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-brand-50 text-brand-600 text-xs font-semibold hover:bg-brand-100 disabled:opacity-50"
              >
                <FiDownload /> Yuklash
              </button>
              <button
                type="button"
                onClick={() => printOne(p)}
                disabled={!codes[p.id]}
                title="Shu mahsulot QR kodini chop etish"
                className="inline-flex items-center justify-center px-2 py-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                <FiPrinter />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QRCodesPage;
