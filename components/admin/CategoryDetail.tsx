import useCategoryStore from "@/zustand/useCategoryStore";
import Link from "next/link";
import { MdDeleteForever } from "react-icons/md";
import Loader from "../Loader";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { CategoryI } from "@/lib/types";
import CategoryImportExport from "./CategoryImportExport";

const CategoryDetail = () => {
  const { categories, fetchCategories, loading, deleteCategory } = useCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Confirm + await: a category is a storefront navigation node — one stray tap
  // must not silently drop it, and the toast must reflect the real outcome.
  const handleDelete = async (item: CategoryI) => {
    if (!item.id) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`"${item.name}" kategoriyasi oʼchirilsinmi? Mahsulotlar oʼchmaydi, lekin bu boʼlim doʼkondan yoʼqoladi.`)
    )
      return;
    try {
      await deleteCategory(item.id);
      toast.success("Kategoriya oʼchirildi");
    } catch {
      toast.error("Oʼchirib boʼlmadi");
    }
  };

  return (
    <div>
      <div>
        <div className="py-5 flex flex-wrap gap-3 justify-between items-center">
          {/* text  */}
          <h1 className=" text-xl text-brand-600 font-bold">Kategoriyalar</h1>
          {/* Import / Export + Add Category  */}
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryImportExport />
            <Link href={"/admin-dashboard/add-category"}>
              <button className="px-5 py-2 bg-brand-50 border border-brand-100 rounded-lg">
                Kategoriya qoʼshish
              </button>
            </Link>
          </div>
        </div>
        {/* Loading  */}
        {loading && categories.length === 0 && (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        )}

        {/* Empty state — every other admin list has one; this table used to
            render bare headers over an empty body. */}
        {!loading && categories.length === 0 && (
          <div className="text-center text-slate-500 py-16">
            Hozircha kategoriya yoʼq. &quot;Kategoriya qoʼshish&quot; tugmasi bilan boshlang.
          </div>
        )}

        {/* Mobile: card list. The sibling tab (Mahsulotlar) already ships this
            pattern; this table was the last admin list that only scrolled
            sideways on a phone. */}
        <div className="lg:hidden space-y-2">
          {categories.map((item, idx) => (
            <div
              key={item.id ?? idx}
              className="rounded-xl border border-brand-100 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-700 first-letter:uppercase">
                  {item.name}
                </h3>
                <button
                  onClick={() => handleDelete(item)}
                  aria-label={`${item.name} kategoriyasini oʼchirish`}
                  className="shrink-0"
                >
                  <MdDeleteForever className="text-red-500 text-2xl cursor-pointer" />
                </button>
              </div>
              {item.subcategory.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {item.subcategory.map((tag, i) => (
                    <span
                      key={i}
                      className="rounded-md py-0.5 px-2.5 text-xs bg-slate-100 text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-2">Subkategoriya yoʼq</p>
              )}
            </div>
          ))}
        </div>

        {/* table  */}
        <div className="w-full overflow-x-auto hidden lg:block">
          <table className="w-full text-left border border-collapse sm:border-separate border-brand-100 text-brand-400">
            <tbody>
              <tr>
                <th
                  scope="col"
                  className="py-2 px-4 lg:px-6 text-md border-l first:border-l-0 border-brand-100 text-slate-700 bg-slate-100 font-bold fontPara"
                >
                  №
                </th>
                <th
                  scope="col"
                  className="py-2 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-brand-100 text-slate-700 bg-slate-100"
                >
                  Kategoriya nomi
                </th>
                <th
                  scope="col"
                  className="py-2 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-brand-100 text-slate-700 bg-slate-100"
                >
                  Subkategoriyalar
                </th>
                <th
                  scope="col"
                  className="py-2 px-4 lg:px-6 text-md font-bold fontPara border-l first:border-l-0 border-brand-100 text-slate-700 bg-slate-100"
                >
                  Oʼchirish
                </th>
              </tr>
              {categories.map((item, idx) => (
                <tr key={idx} className="text-brand-300">
                  <td className="py-2 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-brand-100 stroke-slate-500 text-slate-500 ">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-brand-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                    {item.name}
                  </td>
                  <td className="flex items-center gap-2 flex-wrap py-2 px-4 lg:px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-brand-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
                    {item.subcategory.map((tag,idx) => (
                      <span
                        key={idx}
                        className={`rounded-md transition-all ease-in-out py-1 px-4 bg-gray-300`}
                      >
                        {tag}
                      </span>
                    ))}
                  </td>
                  <td className="py-2 px-4 lg:px-6 transition duration-300 border-t border-l first:border-l-0 border-brand-100 stroke-slate-500">
                    <button onClick={() => handleDelete(item)}>
                      <MdDeleteForever className="text-red-500 text-2xl mx-auto cursor-pointer" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CategoryDetail;
