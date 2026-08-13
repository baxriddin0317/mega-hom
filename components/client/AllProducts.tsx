"use client";
import { useEffect, useState } from "react";
import Card from "./Card";
import Loader from "../Loader";
import useProductStore from "@/zustand/useProductStore";

// How many tiles the landing page mounts at once. The catalog is 200+ products;
// rendering every one put 214 <img> tags on the homepage, so a shopper scrolling
// to the bottom pulled the ENTIRE photo library over mobile data.
const PAGE_SIZE = 24;

// The full catalog on the homepage. Before this, a product only appeared if it
// was flagged New/Best (those carousels) or found via search — so plain
// products were effectively invisible to customers. This grid shows them all.
const AllProducts = () => {
  const { products, loading, fetchProducts } = useProductStore();
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader />
      </div>
    );
  }

  const visible = products.filter((p) => !p.isHidden);
  if (!visible.length) return null;

  const page = visible.slice(0, shown);
  const remaining = visible.length - page.length;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <h2 className="font-brand text-3xl sm:text-4xl font-bold pb-5">Barcha mahsulotlar</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 lg:gap-5">
        {page.map((card) => (
          <Card
            key={card.id}
            img={card.productImageUrl}
            title={card.title}
            description={card.description}
            currentPrice={card.price}
            quantity={card.quantity}
            href={`/product/${card.id}`}
          />
        ))}
      </div>

      {remaining > 0 && (
        <div className="flex justify-center pt-8">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE_SIZE)}
            className="rounded-xl bg-brand hover:bg-brand-600 text-white font-semibold px-8 py-3 transition-colors"
          >
            Yana koʼrsatish ({remaining} ta)
          </button>
        </div>
      )}
    </div>
  );
};

export default AllProducts;
