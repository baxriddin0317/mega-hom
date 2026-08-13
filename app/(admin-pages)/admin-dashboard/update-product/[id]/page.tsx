"use client"
import Loader from "@/components/Loader";
import { fireStorage } from "@/firebase/FirebaseConfig";
import Link from "next/link";
import { GoArrowLeft } from "react-icons/go";
import { CategoryI, ImageT, ProductT } from "@/lib/types";
import Model3DManager from "@/components/admin/Model3DManager";
import { isManagerPlus } from "@/lib/roles";
import { useRole } from "@/components/admin/RoleContext";
import NoAccess from "@/components/admin/NoAccess";
import VatExplainer from "@/components/admin/VatExplainer";
import useCategoryStore from "@/zustand/useCategoryStore";
import useProductStore from "@/zustand/useProductStore";
import useStockStore from "@/zustand/useStockStore";
import { Switch } from "@headlessui/react";
import { Timestamp, deleteField } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { IMAGE_UPLOAD_METADATA } from "@/lib/storageMeta";
import ProductImage from "@/components/ProductImage";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { optimizeImageForUpload } from "@/utils/optimizeImage";
import { uploadThumbSafe } from "@/lib/uploadThumb";

const emptyTimestamp = new Timestamp(0, 0);

const UpdateProductContent = ({ params }: { params: Promise<{ id: string }> }) => {
  const navigate = useRouter();
  const { product, loading, fetchSingleProduct, updateProduct } = useProductStore();
  const { logCorrection } = useStockStore();
  const { categories, fetchCategories } = useCategoryStore();
  const me = useRole();
  const [load, setLoad] = useState(false);
  const [projectId, setProjectId] = useState("");
   const [selectedCategory, setSelectedCategory] = useState<CategoryI | null>(null);
  
  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setProjectId(id)
    }
    getId()
  }, [params])
  
  const [updatedProduct, setUpdatedProduct] = useState<ProductT>({
    id: projectId || '',
    title: '',
    price: 0,
    costPrice: 0,
    productImageUrl: [] as ImageT[],
    category: '',
    subCategory: '',
    description: '',
    isBest: false,
    isNew: false,
    ikpu: '',
    vatRate: 12,
    barcode: '',
    quantity: 0,
    time: product?.time || emptyTimestamp,
    date: product?.date || emptyTimestamp,
    storageFileId: ''
  });

  useEffect(() => {
    if (projectId) {
      fetchSingleProduct(projectId as string);
    }
  }, [projectId, fetchSingleProduct]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  
  useEffect(() => {
    if (product) {
      setUpdatedProduct({
        id: product.id,
        title: product.title,
        price: product.price,
        costPrice: product.costPrice ?? 0,
        lowStockThreshold: product.lowStockThreshold,
        productImageUrl: product.productImageUrl,
        category: product.category,
        subCategory: product.subCategory,
        description: product.description,
        isBest: product.isBest,
        isNew: product.isNew,
        isHidden: product.isHidden,
        ikpu: product.ikpu ?? '',
        vatRate: product.vatRate ?? 12,
        barcode: product.barcode ?? '',
        quantity: product.quantity,
        model3d: product.model3d,
        time: product.time,
        date: product.date,
        storageFileId: product.storageFileId
      });
      const findCategory = categories.find(c => c.name == product.category);
      if(findCategory){
        setSelectedCategory(findCategory)
      }
    }
  }, [product]);

  // get sub category
  const handleGetSubCategory = (value: string) => {
    const findCategory = categories.find(c => c.name == value);
    if(findCategory){
      setSelectedCategory(findCategory)
    }
  }

  // Append images to an existing product. try/finally guarantees the spinner is
  // always released (the old code had no catch — a denied/failed upload hung the
  // edit page). Falls back to the doc id as the folder for legacy products that
  // were created without a storageFileId, and persists that id so later deletes
  // target the right folder.
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoad(true);
    try {
      const folder = updatedProduct.storageFileId || projectId;
      const uploadPromises = Array.from(files).map(async (file) => {
        const optimized = await optimizeImageForUpload(file);
        const safeName = `${uuidv4().slice(0, 8)}-${optimized.name}`;
        const storageRef = ref(fireStorage, `products/${folder}/${safeName}`);
        await uploadBytes(storageRef, optimized, IMAGE_UPLOAD_METADATA);
        const downloadUrl = await getDownloadURL(storageRef);
        const thumb = await uploadThumbSafe(optimized, folder, safeName);
        return { url: downloadUrl, path: storageRef.fullPath, ...thumb };
      });
      const imageUrls = await Promise.all(uploadPromises);
      setUpdatedProduct((prevProduct) => ({
        ...prevProduct,
        storageFileId: prevProduct.storageFileId || projectId,
        productImageUrl: [...prevProduct.productImageUrl, ...imageUrls],
      }));
      toast.success(imageUrls.length > 1 ? `${imageUrls.length} ta rasm yuklandi` : "Rasm yuklandi");
    } catch (error) {
      console.error("Image upload failed:", error);
      // optimizeImageForUpload throws a specific Uzbek message for HEIC/TIFF —
      // show it; anything else gets the generic permission/network hint.
      toast.error(
        error instanceof Error && error.message.includes(":")
          ? error.message
          : "Rasmni yuklab boʼlmadi — ruxsat yoki internet aloqasini tekshiring"
      );
    } finally {
      setLoad(false);
    }
  };

  // Remove a gallery image from state and Storage. Prefer the stored full path
  // (same as add-product); skip Storage delete for CSV-imported URLs with empty path.
  // Legacy products may lack storageFileId — never rebuild a path from that alone.
  const handleDeleteImage = async (image: ImageT) => {
    setUpdatedProduct((prevProduct) => ({
      ...prevProduct,
      productImageUrl: prevProduct.productImageUrl.filter((im) => im.url !== image.url),
    }));

    if (!image.path?.trim()) {
      toast.success("Rasm oʼchirildi");
      return;
    }

    try {
      await deleteObject(ref(fireStorage, image.path));
      toast.success("Rasm oʼchirildi");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Rasmni oʼchirib boʼlmadi");
    }
  };

  const handleUpdate = async () => {
    if (!projectId) return;
    const oldQty = Number(product?.quantity) || 0;
    const newQty = Number(updatedProduct.quantity) || 0;
    // model3d: Firestore rejects `undefined` values and merge:true keeps an
    // omitted field — so "admin removed the model" must write deleteField(),
    // and "never had one" must not send the key at all.
    const payload: Record<string, unknown> = { ...updatedProduct };
    if (product?.model3d && !updatedProduct.model3d) payload.model3d = deleteField();
    else if (!updatedProduct.model3d) delete payload.model3d;
    try {
      await updateProduct(projectId, payload as unknown as ProductT);
    } catch {
      toast.error("Saqlab boʼlmadi (ruxsat yoki internet)");
      return;
    }
    // Quantity changed through the edit form → append a "tuzatish" row so the
    // change is visible in Ombor → Harakatlar (the product doc itself is already
    // saved above; this is the audit-trail half). A failed row must not undo a
    // successful save — report it instead.
    if (product && newQty !== oldQty) {
      try {
        await logCorrection({
          productId: projectId,
          productTitle: updatedProduct.title,
          oldQty,
          newQty,
          reason: "Mahsulot tahriri sahifasidan",
          actorUid: me?.uid ?? "",
          actorName: me?.name ?? "",
        });
        toast.success(`Mahsulot yangilandi · zaxira ${oldQty} → ${newQty} dona tarixga yozildi`);
      } catch {
        toast.success("Mahsulot yangilandi (zaxira tarixiga yozib boʼlmadi)");
      }
    } else {
      toast.success("Mahsulot yangilandi");
    }
    navigate.push("/admin-dashboard/inventory");
  };

  if (!isManagerPlus(me?.role)) return <NoAccess min="manager" />;

  if(loading){
    return <div className="flex items-center justify-center h-screen"><Loader /></div>
  }

  // Loaded but nothing came back (deleted product, bad id, denied read) — the
  // form used to render with its empty defaults, which looks like a real product
  // whose fields were all wiped, and saving it would have created that.
  if (!product) {
    return (
      <div className="max-w-md mx-auto text-center bg-white border border-brand-100 rounded-xl p-8 mt-16 shadow-sm">
        <h2 className="text-lg font-bold text-slate-700">Mahsulot topilmadi</h2>
        <p className="text-slate-500 mt-1 text-sm">
          Bu mahsulot oʼchirilgan yoki havola notoʼgʼri.
        </p>
        <Link
          href="/admin-dashboard/inventory"
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 text-white font-semibold hover:bg-brand-600"
        >
          <GoArrowLeft /> Mahsulotlarga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start sm:items-center min-h-screen p-4">
      {load && <Loader />}
      {/* Login Form  */}
      <div className="login_Form w-full max-w-md bg-brand-50 px-5 sm:px-8 py-6 border border-brand-100 rounded-xl shadow-md">
        {/* Top Heading  */}
        <div className="mb-5">
          <h2 className="text-center text-2xl font-bold text-brand-500 ">
            Mahsulotni tahrirlash
          </h2>
        </div>
        {/* Input One  */}
        <div className="mb-3">
          <input
            type="text"
            name="title"
            placeholder="Mahsulot nomi"
            value={updatedProduct.title}
            onChange={(e) => setUpdatedProduct({ ...updatedProduct, title: e.target.value })}
            className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300"
          />
        </div>
        {/* Input Two  */}
        <div className="mb-3">
          <input
            type="number"
            name="price"
            placeholder="Sotish narxi (UZS)"
            value={updatedProduct?.price}
            onChange={(e) => setUpdatedProduct({ ...updatedProduct, price: +e.target.value })}
            className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300"
          />
        </div>
        {/* Cost (tan narx) + Stock (zaxira) */}
        <div className="mb-3 flex gap-3 w-full">
          <input
            type="number"
            name="costPrice"
            value={updatedProduct.costPrice ?? 0}
            onChange={(e) => setUpdatedProduct({ ...updatedProduct, costPrice: +e.target.value })}
            placeholder="Tan narx (xarid)"
            title="Tan narx — foyda shu asosda hisoblanadi (mijozga koʼrinmaydi)"
            className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 flex-1 rounded-md outline-none placeholder-brand-300"
          />
          <input
            type="number"
            name="quantity"
            value={updatedProduct.quantity}
            onChange={(e) => setUpdatedProduct({ ...updatedProduct, quantity: +e.target.value })}
            placeholder="Zaxira (dona)"
            title="Ombordagi miqdor"
            className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-32 rounded-md outline-none placeholder-brand-300"
          />
        </div>
        {/* Display uploaded images with delete option */}
        <div className="mb-3 flex flex-wrap gap-2">
          {updatedProduct.productImageUrl.map((img, index) => (
            <div key={img.path || img.url || index} className="relative w-20 h-20">
              <ProductImage
                src={img.url}
                alt={`Product Image ${index + 1}`}
                className="rounded-md object-cover"
                fill
                sizes="80px"
                fallbackClassName="absolute inset-0 rounded-md"
              />
              <button
                type="button"
                onClick={() => handleDeleteImage(img)}
                className="absolute size-5 top-0 right-0 bg-red-500 text-white rounded-full p-1 text-[8px] z-10"
                title="Delete Image"
              >
                X
              </button>
            </div>
          ))}
        </div>
        {/* Input img  */}
        <div className="mb-3">
          <input
            name="productImageUrl"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              handleImageUpload(e.target.files);
              e.target.value = ""; // allow re-selecting the same file after a remove
            }}
            className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300"
          />
        </div>
        {/* Input Four  */}
        <div className="mb-3">
          <select 
            className="w-full px-1 py-2 text-brand-700 bg-brand-50 border border-brand-200 rounded-md outline-none"
            value={updatedProduct.category}
            onChange={(e) => {
              setUpdatedProduct({ ...updatedProduct, category: e.target.value })
              handleGetSubCategory(e.target.value)
            }}
          >
            <option disabled>Kategoriyani tanlang</option>
            {categories.map((value) => {
              const { name, id } = value;
              return (
                <option
                  className=" first-letter:uppercase"
                  key={id}
                  value={name}
                >
                  {name}
                </option>
              );
            })}
          </select>
        </div>
        {/* Input sub category  */}
        <div className="mb-3">
          <select
            disabled={selectedCategory == null}
            value={updatedProduct.subCategory}
            onChange={(e) => {
              setUpdatedProduct({
                ...updatedProduct,
                subCategory: e.target.value,
              });
            }}
            className="w-full px-1 py-2 text-brand-700 bg-brand-50 border border-brand-200 rounded-md outline-none  "
          >
            <option >Subkategoriyani tanlang</option>
            {selectedCategory?.subcategory.map((value,idx) => {
              return (
                <option
                  className=" first-letter:uppercase"
                  key={idx}
                  value={value}
                >
                  {value}
                </option>
              );
            })}
          </select>
        </div>
        {/* Input Five  */}
        <div className="mb-3">
          <textarea
            name="description"
            placeholder="Mahsulot tavsifi"
            rows={5}
            value={updatedProduct?.description}
            onChange={(e) => setUpdatedProduct({ ...updatedProduct, description: e.target.value })}
            className=" w-full px-2 py-1 text-brand-700 bg-brand-50 border border-brand-200 rounded-md outline-none placeholder-brand-300 "
          ></textarea>
        </div>
        {/* Fiscal + POS fields (Uzbekistan ChEK) */}
        <div className="mb-3 space-y-3 border-t border-brand-100 pt-3">
          <input
            type="text"
            inputMode="numeric"
            value={updatedProduct.ikpu ?? ""}
            onChange={(e) =>
              setUpdatedProduct({ ...updatedProduct, ikpu: e.target.value.replace(/\D/g, "").slice(0, 17) })
            }
            placeholder="IKPU / MXIK kodi (17 raqam) — tasnif.soliq.uz"
            className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300"
          />
          <div className="flex gap-3 w-full">
            <div className="w-28">
              <label htmlFor="upd-vat-rate" className="block text-xs text-brand-500 mb-1">
                QQS stavkasi %
              </label>
              <input
                id="upd-vat-rate"
                type="number"
                min={0}
                max={100}
                step={1}
                value={updatedProduct.vatRate ?? 12}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value));
                  setUpdatedProduct({
                    ...updatedProduct,
                    vatRate: Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0)),
                  });
                }}
                placeholder="QQS %"
                title="QQS (VAT) foizi"
                className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="upd-barcode" className="block text-xs text-brand-500 mb-1">
                Shtrix-kod (ixtiyoriy)
              </label>
              <input
                id="upd-barcode"
                type="text"
                value={updatedProduct.barcode ?? ""}
                onChange={(e) => setUpdatedProduct({ ...updatedProduct, barcode: e.target.value })}
                placeholder="Shtrix-kod"
                className="bg-brand-50 border text-brand-700 border-brand-200 px-2 py-2 w-full rounded-md outline-none placeholder-brand-300"
              />
            </div>
          </div>
          <VatExplainer
            price={Number(updatedProduct.price) || 0}
            vatRate={updatedProduct.vatRate ?? 12}
          />
        </div>
        <Model3DManager
          folder={updatedProduct.storageFileId || projectId}
          value={updatedProduct.model3d}
          onChange={(m) => setUpdatedProduct((prev) => ({ ...prev, model3d: m }))}
        />
        <div className="flex items-start divide-x-2 gap-4 mb-3">
          <div>
            <span className="text-sm text-brand block capitalize mb-1">
              Top mahsulot
            </span>
            <Switch
              checked={updatedProduct.isBest}
              onChange={() => setUpdatedProduct({ ...updatedProduct, isBest: !updatedProduct.isBest })}
              className={`${
                updatedProduct.isBest ? 'bg-brand' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
            >
              <span
                className={`${
                  updatedProduct.isBest ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>
          <div className="pl-4">
            <span className="text-sm text-brand block capitalize mb-1">
              Yangi mahsulot
            </span>
            <Switch
              checked={updatedProduct.isNew}
              onChange={() => setUpdatedProduct({ ...updatedProduct, isNew: !updatedProduct.isNew })}
              className={`${
                updatedProduct.isNew ? 'bg-brand' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
            >
              <span
                className={`${
                  updatedProduct.isNew ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>
        </div>
        {/* Update Product Button  */}
        <div className="mb-3">
          <button
            type="button"
            onClick={handleUpdate}
            className="bg-brand-500 hover:bg-brand-600 w-full text-white text-center py-2 font-bold rounded-md"
          >
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateProductContent;
