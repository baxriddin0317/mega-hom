"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import { FiCamera, FiSmartphone, FiX } from "react-icons/fi";
import { TbAugmentedReality, TbRulerMeasure } from "react-icons/tb";
import { Model3D } from "@/lib/types";
import { productUrl } from "@/lib/site";

// <model-viewer> is a custom element; declare the attributes we actually use so
// TSX stays typed without pulling the library's types into the server bundle.
type ModelViewerAttrs = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string;
  "ios-src"?: string;
  poster?: string;
  alt?: string;
  ar?: boolean;
  "ar-modes"?: string;
  "ar-placement"?: string;
  "camera-controls"?: boolean;
  "touch-action"?: string;
  "shadow-intensity"?: string;
  exposure?: string;
  loading?: "auto" | "lazy" | "eager";
  reveal?: "auto" | "manual";
};
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "model-viewer": ModelViewerAttrs;
      }
    }
  }
}

// The runtime element API we call (subset of ModelViewerElement — typed locally
// so the library stays a purely client-side dynamic import).
interface MVElement extends HTMLElement {
  getDimensions: () => { x: number; y: number; z: number };
  getBoundingBoxCenter: () => { x: number; y: number; z: number };
  updateHotspot: (h: { name: string; position?: string }) => void;
  queryHotspot: (name: string) => { canvasPosition: { x: number; y: number } } | null;
  toDataURL: (type?: string) => string;
  src: string | null;
  iosSrc: string | null;
}

// The 5 edge lines of the official model-viewer "Dimensions" example: each
// connects two corner dots; the label hotspot between them shows that edge's
// real length taken from the loaded model's own geometry.
const DIM_LINES: [string, string][] = [
  ["hotspot-dot+X-Y+Z", "hotspot-dot+X-Y-Z"],
  ["hotspot-dot+X-Y-Z", "hotspot-dot+X+Y-Z"],
  ["hotspot-dot+X+Y-Z", "hotspot-dot-X+Y-Z"],
  ["hotspot-dot-X+Y-Z", "hotspot-dot-X-Y-Z"],
  ["hotspot-dot-X-Y-Z", "hotspot-dot-X-Y+Z"],
];
const DOT_NAMES = [
  "hotspot-dot+X-Y+Z", "hotspot-dot+X-Y-Z", "hotspot-dot+X+Y-Z",
  "hotspot-dot-X+Y-Z", "hotspot-dot-X-Y-Z", "hotspot-dot-X-Y+Z",
];
const DIM_LABELS = ["hotspot-dim+X-Y", "hotspot-dim+X-Z", "hotspot-dim+Y-Z", "hotspot-dim-X-Z", "hotspot-dim-X-Y"];

// 360° / AR viewer for a product's 3D model. Real capabilities, no gimmicks:
//  • camera-controls 360° + zoom (touch friendly)
//  • AR: WebXR/Scene Viewer on Android, Quick Look on iPhone (USDZ uploaded or
//    auto-generated from the GLB by model-viewer)
//  • rang variantlari — chips swap the model src instantly
//  • oʼlcham chiziqlari — the official dimensions overlay, from model geometry
//  • rasm olish — PNG snapshot of the current 3D view
//  • QR handoff — desktop users open the AR view on their phone
const ProductViewer3D = ({
  productId,
  title,
  model,
  poster,
}: {
  productId: string;
  title: string;
  model: Model3D;
  poster?: string;
}) => {
  const mvRef = useRef<MVElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [ready, setReady] = useState(false); // model-viewer script registered
  const [loaded, setLoaded] = useState(false); // current GLB loaded
  const [progress, setProgress] = useState(0);
  const [showDims, setShowDims] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [variantIdx, setVariantIdx] = useState(0);

  // Default model first, then color variants — chips never re-order.
  const variants = useMemo(() => {
    const list = [
      {
        name: model.defaultName?.trim() || "Asosiy",
        glbUrl: model.glbUrl,
        usdzUrl: model.usdzUrl,
      },
      ...(model.variants ?? []).map((v) => ({ name: v.name, glbUrl: v.glbUrl, usdzUrl: v.usdzUrl })),
    ];
    return list.filter((v) => v.glbUrl);
  }, [model]);
  const active = variants[Math.min(variantIdx, variants.length - 1)];

  // Register the custom element on the client only (the library touches window
  // at module scope, so it must never be imported during SSR).
  useEffect(() => {
    let cancelled = false;
    import("@google/model-viewer")
      .then(() => { if (!cancelled) setReady(true); })
      .catch((e) => console.error("model-viewer yuklanmadi:", e));
    return () => { cancelled = true; };
  }, []);

  /* ---------------- dimensions overlay (official example pattern) ---------- */
  const refreshDimHotspots = useCallback(() => {
    const mv = mvRef.current;
    if (!mv || typeof mv.getDimensions !== "function") return;
    try {
      const c = mv.getBoundingBoxCenter();
      const s = mv.getDimensions();
      const x2 = s.x / 2, y2 = s.y / 2, z2 = s.z / 2;
      const cm = (m: number) => `${(m * 100).toFixed(0)} sm`;
      mv.updateHotspot({ name: "hotspot-dot+X-Y+Z", position: `${c.x + x2} ${c.y - y2} ${c.z + z2}` });
      mv.updateHotspot({ name: "hotspot-dim+X-Y", position: `${c.x + x2 * 1.2} ${c.y - y2 * 1.1} ${c.z}` });
      mv.updateHotspot({ name: "hotspot-dot+X-Y-Z", position: `${c.x + x2} ${c.y - y2} ${c.z - z2}` });
      mv.updateHotspot({ name: "hotspot-dim+X-Z", position: `${c.x + x2 * 1.2} ${c.y} ${c.z - z2 * 1.2}` });
      mv.updateHotspot({ name: "hotspot-dot+X+Y-Z", position: `${c.x + x2} ${c.y + y2} ${c.z - z2}` });
      mv.updateHotspot({ name: "hotspot-dim+Y-Z", position: `${c.x} ${c.y + y2 * 1.1} ${c.z - z2 * 1.1}` });
      mv.updateHotspot({ name: "hotspot-dot-X+Y-Z", position: `${c.x - x2} ${c.y + y2} ${c.z - z2}` });
      mv.updateHotspot({ name: "hotspot-dim-X-Z", position: `${c.x - x2 * 1.2} ${c.y} ${c.z - z2 * 1.2}` });
      mv.updateHotspot({ name: "hotspot-dot-X-Y-Z", position: `${c.x - x2} ${c.y - y2} ${c.z - z2}` });
      mv.updateHotspot({ name: "hotspot-dim-X-Y", position: `${c.x - x2 * 1.2} ${c.y - y2 * 1.1} ${c.z}` });
      mv.updateHotspot({ name: "hotspot-dot-X-Y+Z", position: `${c.x - x2} ${c.y - y2} ${c.z + z2}` });
      const labels = mv.querySelectorAll<HTMLElement>("[data-dim]");
      const values = [cm(s.z), cm(s.y), cm(s.x), cm(s.y), cm(s.z)];
      labels.forEach((el, i) => { el.textContent = values[i] ?? ""; });
    } catch (e) {
      console.warn("dimensions overlay failed:", e);
    }
  }, []);

  const drawDimLines = useCallback(() => {
    const mv = mvRef.current;
    const svg = svgRef.current;
    if (!mv || !svg || typeof mv.queryHotspot !== "function") return;
    const lines = svg.querySelectorAll("line");
    DIM_LINES.forEach(([a, b], i) => {
      const ha = mv.queryHotspot(a);
      const hb = mv.queryHotspot(b);
      const line = lines[i];
      if (!ha || !hb || !line) return;
      line.setAttribute("x1", String(ha.canvasPosition.x));
      line.setAttribute("y1", String(ha.canvasPosition.y));
      line.setAttribute("x2", String(hb.canvasPosition.x));
      line.setAttribute("y2", String(hb.canvasPosition.y));
    });
  }, []);

  // Wire custom-element events via ref (React props don't map custom events).
  useEffect(() => {
    if (!ready) return;
    const mv = mvRef.current;
    if (!mv) return;
    const onLoad = () => {
      setLoaded(true);
      refreshDimHotspots();
      // Hotspot canvas positions are computed on the NEXT render tick — drawing
      // synchronously on 'load' leaves the lines at the previous model's
      // coordinates (visible when switching color variants). Double-rAF waits
      // out the first frame, same workaround model-viewer's own test harness uses.
      requestAnimationFrame(() => requestAnimationFrame(drawDimLines));
    };
    const onProgress = (e: Event) => {
      const p = (e as CustomEvent<{ totalProgress: number }>).detail?.totalProgress ?? 0;
      setProgress(Math.round(p * 100));
    };
    const onCamera = () => drawDimLines();
    mv.addEventListener("load", onLoad);
    mv.addEventListener("progress", onProgress);
    mv.addEventListener("camera-change", onCamera);
    window.addEventListener("resize", onCamera);
    return () => {
      mv.removeEventListener("load", onLoad);
      mv.removeEventListener("progress", onProgress);
      mv.removeEventListener("camera-change", onCamera);
      window.removeEventListener("resize", onCamera);
    };
  }, [ready, refreshDimHotspots, drawDimLines]);

  // Variant switch: swap src on the SAME element (camera + AR state preserved).
  useEffect(() => {
    const mv = mvRef.current;
    if (!ready || !mv || !active) return;
    if (mv.src !== active.glbUrl) {
      setLoaded(false);
      mv.src = active.glbUrl;
      mv.iosSrc = active.usdzUrl ?? null;
    }
  }, [ready, active]);

  const snapshot = () => {
    const mv = mvRef.current;
    if (!mv || !loaded) return;
    try {
      const url = mv.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40) || "mahsulot"}-3d.png`;
      a.click();
      toast.success("Rasm saqlandi 📷");
    } catch {
      toast.error("Rasm olib boʼlmadi");
    }
  };

  const openQr = async () => {
    try {
      const url = await QRCode.toDataURL(`${productUrl(productId)}?ar=1`, { width: 480, margin: 1 });
      setQrDataUrl(url);
      setQrOpen(true);
    } catch {
      toast.error("QR yaratib boʼlmadi");
    }
  };

  if (!ready) {
    return (
      <div className="relative w-full aspect-square rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center">
        <span className="size-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-100 bg-white">
        <model-viewer
          ref={(el: HTMLElement | null) => { mvRef.current = el as MVElement | null; }}
          src={active?.glbUrl}
          ios-src={active?.usdzUrl}
          poster={poster}
          alt={`${title} — 3D koʼrinish`}
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-placement="floor"
          camera-controls
          touch-action="pan-y"
          shadow-intensity="1"
          exposure="1"
          loading="eager"
          style={{ width: "100%", height: "100%", ["--poster-color" as string]: "transparent" }}
        >
          {/* dimension overlay: corner dots + edge-length labels (geometry-true) */}
          {DOT_NAMES.map((n) => (
            <div
              key={n}
              slot={n}
              className={`size-2.5 rounded-full bg-brand-500 border-2 border-white shadow ${showDims && loaded ? "" : "hidden"}`}
            />
          ))}
          {DIM_LABELS.map((n) => (
            <div
              key={n}
              slot={n}
              data-dim
              className={`px-2 py-0.5 rounded-full bg-slate-800/85 text-white text-[11px] font-semibold whitespace-nowrap ${showDims && loaded ? "" : "hidden"}`}
            />
          ))}
          {/* AR CTA — model-viewer shows it only when a real AR mode exists */}
          <button
            slot="ar-button"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 text-white text-sm font-bold shadow-lg active:scale-95 transition-transform"
          >
            <TbAugmentedReality className="text-lg" /> Xonangizda koʼring
          </button>
        </model-viewer>

        {/* edge lines between the corner dots */}
        <svg
          ref={svgRef}
          className={`absolute inset-0 w-full h-full pointer-events-none ${showDims && loaded ? "" : "hidden"}`}
          aria-hidden
        >
          {DIM_LINES.map(([a, b]) => (
            <line key={`${a}-${b}`} stroke="#334155" strokeWidth="1.5" strokeDasharray="4 3" />
          ))}
        </svg>

        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 pointer-events-none">
            <span className="size-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500">3D model yuklanmoqda… {progress}%</span>
          </div>
        )}

        {/* top-right tool rail */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => { setShowDims((v) => !v); requestAnimationFrame(() => requestAnimationFrame(drawDimLines)); }}
            title="Oʼlcham chiziqlari"
            aria-pressed={showDims}
            className={`size-9 rounded-full flex items-center justify-center shadow border transition-colors ${
              showDims ? "bg-brand-500 text-white border-brand-500" : "bg-white/95 text-slate-600 border-slate-200 hover:bg-brand-50"
            }`}
          >
            <TbRulerMeasure className="text-lg" />
          </button>
          <button
            type="button"
            onClick={snapshot}
            title="Rasm olish (PNG)"
            className="size-9 rounded-full bg-white/95 text-slate-600 border border-slate-200 shadow flex items-center justify-center hover:bg-brand-50"
          >
            <FiCamera className="text-lg" />
          </button>
          <button
            type="button"
            onClick={openQr}
            title="Telefonda AR ochish (QR)"
            className="hidden lg:flex size-9 rounded-full bg-white/95 text-slate-600 border border-slate-200 shadow items-center justify-center hover:bg-brand-50"
          >
            <FiSmartphone className="text-lg" />
          </button>
        </div>
      </div>

      {/* color variant chips */}
      {variants.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-slate-500">Rang:</span>
          {variants.map((v, i) => (
            <button
              key={v.name + i}
              type="button"
              onClick={() => setVariantIdx(i)}
              aria-pressed={i === variantIdx}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                i === variantIdx
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-brand-50"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      {/* real dimensions from the admin (spec row — also read by non-3D shoppers) */}
      {(model.dims?.l || model.dims?.w || model.dims?.h) ? (
        <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-600">
          {model.dims?.l ? <span className="px-2.5 py-1 rounded-lg bg-slate-100">Uzunlik: <b>{model.dims.l} sm</b></span> : null}
          {model.dims?.w ? <span className="px-2.5 py-1 rounded-lg bg-slate-100">Kenglik: <b>{model.dims.w} sm</b></span> : null}
          {model.dims?.h ? <span className="px-2.5 py-1 rounded-lg bg-slate-100">Balandlik: <b>{model.dims.h} sm</b></span> : null}
        </div>
      ) : null}

      {/* QR handoff modal (desktop → phone) */}
      {qrOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onClick={() => setQrOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-700">Telefonda AR</h3>
              <button onClick={() => setQrOpen(false)} className="text-slate-400 hover:text-slate-700" aria-label="Yopish">
                <FiX className="text-xl" />
              </button>
            </div>
            {/* data-URL QR — plain img, next/image adds nothing here */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="AR QR kod" className="w-full rounded-lg border border-slate-100" />
            <p className="text-xs text-slate-500 mt-3">
              Telefon kamerasi bilan skaner qiling — mahsulot xonangizda, haqiqiy oʼlchamda ochiladi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductViewer3D;
