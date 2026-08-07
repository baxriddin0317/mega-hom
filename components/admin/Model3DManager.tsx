"use client";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { FiTrash2, FiUploadCloud } from "react-icons/fi";
import { TbAugmentedReality } from "react-icons/tb";
import { fireStorage } from "@/firebase/FirebaseConfig";
import { Model3D, Model3DVariant } from "@/lib/types";

const MAX_MODEL_MB = 40; // matches the storage.rules cap for model/* uploads

// Correct MIME types are load-bearing: storage.rules matches model/.*, Android
// Scene Viewer wants gltf-binary, iOS AR Quick Look wants the usdz type.
const contentTypeFor = (name: string) =>
  name.toLowerCase().endsWith(".usdz") ? "model/vnd.usdz+zip" : "model/gltf-binary";

const uploadModelFile = async (folder: string, file: File) => {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext !== "glb" && ext !== "usdz") throw new Error("format");
  if (file.size > MAX_MODEL_MB * 1024 * 1024) throw new Error("size");
  const safeName = `${uuidv4().slice(0, 8)}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
  const sref = ref(fireStorage, `products/${folder}/model/${safeName}`);
  await uploadBytes(sref, file, {
    contentType: contentTypeFor(file.name),
    cacheControl: "public,max-age=31536000,immutable", // content-addressed by uuid name
  });
  const url = await getDownloadURL(sref);
  return { url, path: sref.fullPath };
};

const tryDelete = async (path?: string) => {
  if (!path) return;
  try {
    await deleteObject(ref(fireStorage, path));
  } catch (e) {
    console.warn("model file delete skipped:", e);
  }
};

const uploadErrToast = (e: unknown) => {
  const msg = e instanceof Error ? e.message : "";
  toast.error(
    msg === "format"
      ? "Faqat .glb yoki .usdz fayl"
      : msg === "size"
        ? `Fayl juda katta (maks. ${MAX_MODEL_MB}MB)`
        : "Yuklab boʼlmadi (ruxsat yoki internet)"
  );
};

// Admin block for a product's WebAR/3D assets: default GLB (+ optional USDZ for
// iPhone), rang variantlari (each its own GLB), and real dimensions in sm.
// Controlled component — the parent form owns the Model3D value and saves it
// with the product document.
const Model3DManager = ({
  folder,
  value,
  onChange,
}: {
  folder: string;
  value?: Model3D;
  onChange: (next?: Model3D) => void;
}) => {
  const [busy, setBusy] = useState<string | null>(null); // which control is uploading
  const [variantName, setVariantName] = useState("");
  const variantGlbRef = useRef<HTMLInputElement>(null);

  const setField = (patch: Partial<Model3D>) => {
    if (!value) return;
    onChange({ ...value, ...patch });
  };

  const uploadDefaultGlb = async (file: File | null) => {
    if (!file) return;
    setBusy("glb");
    try {
      const up = await uploadModelFile(folder, file);
      await tryDelete(value?.glbPath); // replacing → old file is garbage
      onChange({ ...(value ?? {}), glbUrl: up.url, glbPath: up.path } as Model3D);
      toast.success("3D model (GLB) yuklandi");
    } catch (e) {
      uploadErrToast(e);
    } finally {
      setBusy(null);
    }
  };

  const uploadDefaultUsdz = async (file: File | null) => {
    if (!file || !value) return;
    setBusy("usdz");
    try {
      const up = await uploadModelFile(folder, file);
      await tryDelete(value.usdzPath);
      setField({ usdzUrl: up.url, usdzPath: up.path });
      toast.success("USDZ (iPhone AR) yuklandi");
    } catch (e) {
      uploadErrToast(e);
    } finally {
      setBusy(null);
    }
  };

  const addVariant = async (file: File | null) => {
    if (!file || !value) return;
    const name = variantName.trim();
    if (!name) return toast.error("Avval rang nomini yozing (masalan: Oq)");
    setBusy("variant");
    try {
      const up = await uploadModelFile(folder, file);
      const v: Model3DVariant = { name, glbUrl: up.url, glbPath: up.path };
      setField({ variants: [...(value.variants ?? []), v] });
      setVariantName("");
      toast.success(`"${name}" varianti qoʼshildi`);
    } catch (e) {
      uploadErrToast(e);
    } finally {
      setBusy(null);
    }
  };

  const removeVariant = async (idx: number) => {
    if (!value) return;
    const v = value.variants?.[idx];
    if (!v) return;
    setField({ variants: (value.variants ?? []).filter((_, i) => i !== idx) });
    await tryDelete(v.glbPath);
    await tryDelete(v.usdzPath);
  };

  const removeAll = async () => {
    if (!value) return;
    if (typeof window !== "undefined" && !window.confirm("3D model butunlay oʼchirilsinmi?")) return;
    const paths = [
      value.glbPath,
      value.usdzPath,
      ...(value.variants ?? []).flatMap((v) => [v.glbPath, v.usdzPath]),
    ];
    onChange(undefined);
    for (const p of paths) await tryDelete(p);
    toast.success("3D model oʼchirildi");
  };

  const setDim = (key: "l" | "w" | "h", raw: string) => {
    if (!value) return;
    const n = parseFloat(raw);
    setField({ dims: { ...value.dims, [key]: Number.isFinite(n) && n > 0 ? n : undefined } });
  };

  const input =
    "bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300";
  const fileBtn =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-200 bg-white text-brand-600 text-xs font-semibold cursor-pointer hover:bg-brand-50";

  return (
    <div className="mb-3 border-t border-brand-100 pt-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 mb-1">
        <TbAugmentedReality className="text-lg" /> 3D / AR model (ixtiyoriy)
      </p>
      <p className="text-[11px] text-brand-400 mb-2.5">
        GLB fayl yuklansa, mahsulot sahifasida 360° koʼrish va «Xonangizda koʼring» (AR) paydo
        boʼladi. iPhone uchun USDZ ixtiyoriy — boʼlmasa avtomatik yasaladi.
      </p>

      {!value?.glbUrl ? (
        <label className={fileBtn}>
          {busy === "glb" ? (
            <span className="size-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <FiUploadCloud />
          )}
          GLB yuklash (asosiy model)
          <input
            type="file"
            accept=".glb"
            className="hidden"
            disabled={busy !== null}
            onChange={(e) => { uploadDefaultGlb(e.target.files?.[0] ?? null); e.target.value = ""; }}
          />
        </label>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-green-50 border border-green-200 px-2.5 py-1.5">
            <span className="text-xs text-green-700 font-medium truncate">✓ GLB yuklangan</span>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-[11px] text-brand-600 underline cursor-pointer">
                {busy === "glb" ? "Yuklanmoqda…" : "Almashtirish"}
                <input
                  type="file"
                  accept=".glb"
                  className="hidden"
                  disabled={busy !== null}
                  onChange={(e) => { uploadDefaultGlb(e.target.files?.[0] ?? null); e.target.value = ""; }}
                />
              </label>
              <button type="button" onClick={removeAll} title="3D modelni oʼchirish" className="text-red-400 hover:text-red-600">
                <FiTrash2 className="text-sm" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className={fileBtn}>
              {busy === "usdz" ? (
                <span className="size-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiUploadCloud />
              )}
              {value.usdzUrl ? "USDZ almashtirish" : "USDZ (iPhone, ixtiyoriy)"}
              <input
                type="file"
                accept=".usdz"
                className="hidden"
                disabled={busy !== null}
                onChange={(e) => { uploadDefaultUsdz(e.target.files?.[0] ?? null); e.target.value = ""; }}
              />
            </label>
            {value.usdzUrl && <span className="text-[11px] text-green-600">✓ bor</span>}
          </div>

          {/* Real dimensions (sm) — shown to shoppers as spec chips */}
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number" min={0} placeholder="Uzunlik (sm)" title="Uzunlik, sm"
              value={value.dims?.l ?? ""} onChange={(e) => setDim("l", e.target.value)} className={input}
            />
            <input
              type="number" min={0} placeholder="Kenglik (sm)" title="Kenglik, sm"
              value={value.dims?.w ?? ""} onChange={(e) => setDim("w", e.target.value)} className={input}
            />
            <input
              type="number" min={0} placeholder="Balandlik (sm)" title="Balandlik, sm"
              value={value.dims?.h ?? ""} onChange={(e) => setDim("h", e.target.value)} className={input}
            />
          </div>

          {/* Rang variantlari — each its own GLB; chips on the product page */}
          <div className="rounded-lg border border-brand-100 p-2.5 space-y-2">
            <p className="text-xs font-semibold text-brand-500">Rang variantlari</p>
            <input
              value={value.defaultName ?? ""}
              onChange={(e) => setField({ defaultName: e.target.value })}
              placeholder="Asosiy model rangi (masalan: Yongʼoq)"
              className={input}
            />
            {(value.variants ?? []).map((v, i) => (
              <div key={v.glbPath || i} className="flex items-center justify-between gap-2 text-xs bg-slate-50 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-700 font-medium truncate">🎨 {v.name}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {v.usdzUrl && <span className="text-green-600">usdz ✓</span>}
                  <button type="button" onClick={() => removeVariant(i)} className="text-red-400 hover:text-red-600" title="Oʼchirish">
                    <FiTrash2 />
                  </button>
                </span>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                placeholder="Yangi rang nomi (Oq, Sonoma…)"
                className={input}
              />
              <label className={`${fileBtn} shrink-0 self-stretch items-center`}>
                {busy === "variant" ? (
                  <span className="size-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiUploadCloud />
                )}
                GLB
                <input
                  ref={variantGlbRef}
                  type="file"
                  accept=".glb"
                  className="hidden"
                  disabled={busy !== null}
                  onChange={(e) => { addVariant(e.target.files?.[0] ?? null); e.target.value = ""; }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Model3DManager;
