"use client"
import Card from '@/components/client/Card';
import { IconChevron } from '@/components/icons';
import Loader from '@/components/Loader';
import useCategoryStore from '@/zustand/useCategoryStore';
import useProductStore from '@/zustand/useProductStore';
import Link from 'next/link';
import React, { useEffect, useState } from 'react'

const Products = ({ params }: { params: Promise<{ id: string }> }) => {
  const [projectId, setProjectId] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const { category, fetchSingleCategory } = useCategoryStore()
  const { products, fetchProducts } = useProductStore()
  
  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setProjectId(id)
    }
    getId()
  }, [params])
 
  useEffect(() => {
    fetchSingleCategory(projectId);
    fetchProducts()
  }, [fetchSingleCategory, fetchProducts, projectId]);
  
  const handleCategoryChange = (category: string) => {
    setSelectedSubCategory(category);
  };

  if(category == null){
    return <div className="flex items-center justify-center h-40">
      <Loader />
    </div>
  }
  
  return (
    <div className="max-w-7xl mx-auto pt-4 px-4 sm:px-6">
      <div className="pb-10">
        <h2 className="text-3xl sm:text-4xl font-bold pb-5 capitalize">{category.name}</h2>

        <div className="flex items-center gap-3 flex-wrap pb-5">
          {category.subcategory.map((c,id) => (
            <button
              key={id}
              className={`rounded-md transition-all ease-in-out py-1 px-4 capitalize ${
                selectedSubCategory === c
                  ? "bg-brand text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              onClick={() => handleCategoryChange(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 lg:gap-5">
          {products.filter(product => product.category === category?.name).map((card) => (
            <Card
              key={card.id}
              img={card.productImageUrl}
              title={card.title}
              currentPrice={card.price}
              prePrice={card.price + 100}
              href={`/product/${card.id}`}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <nav
          className="isolate inline-flex -space-x-px rounded-md shadow-sm"
          aria-label="Pagination"
        >
          <Link
            href="#"
            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
          >
            <span className="sr-only">Previous</span>
            <span className='rotate-90'>  
              <IconChevron aria-hidden="true" />
            </span>
          </Link>
          <Link
            href="#"
            aria-current="page"
            className="relative z-10 inline-flex items-center bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            1
          </Link>
          <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
            2
          </span>
          <span className="relative hidden items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 md:inline-flex">
            3
          </span>
          <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
            ...
          </span>
          <span className="relative hidden items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 md:inline-flex">
            8
          </span>
          <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
            9
          </span>
          <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
            10
          </span>
          <Link
            href="#"
            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
          >
            <span className="sr-only">Next</span>
            <span className='-rotate-90'>  
              <IconChevron aria-hidden="true" />
            </span>
          </Link>
        </nav>
      </div>
    </div>
  )
}

export default Products