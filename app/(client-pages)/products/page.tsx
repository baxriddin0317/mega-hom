"use client"
import Card from '@/components/client/Card';
import { IconChevron } from '@/components/icons';
import Link from 'next/link';
import React, { useState } from 'react'

const cards = [
  {
    img: "bestSellers/08DLX.jpg",
    title: "3L Grafin va 150ML Fyujer",
    currentPrice: 350000,
    prePrice: 450000,
  },
  {
    img: "bestSellers/58278M.jpg",
    title: "40x28 Dekorativ temir lagan",
    currentPrice: 815000,
    prePrice: 875000,
  },
  {
    img: "bestSellers/9PCGranite2.jpg",
    title: "9PC Granit",
    currentPrice: 1250000,
    prePrice: 1350000,
  },
  {
    img: "bestSellers/CHEMODAN.jpg",
    title: "Hoffmayer 72PC",
    currentPrice: 400000,
    prePrice: 550000,
  },
  {
    img: "bestSellers/DOMTIME205F.jpg",
    title: "Kreslo 205",
    currentPrice: 1650000,
    prePrice: 1800000,
  },
  {
    img: "bestSellers/qozon1.JPG",
    title: "Granit qozon",
    currentPrice: 490000,
    prePrice: 650000,
  },
  {
    img: "bestSellers/Termos096JP.jpg",
    title: "Termos 096JP",
    currentPrice: 400000,
    prePrice: 550000,
  },
  {
    img: "bestSellers/DOMTIME363F.jpg",
    title: "Kreslo 363F",
    currentPrice: 1450000,
    prePrice: 1550000,
  },
  // Add more cards as needed
];

const categories = ["Qozon", "Tavoq", "Tarelka"];

const Products = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  return (
    <div className="max-w-7xl mx-auto pt-4 px-4 sm:px-6">
      <div className="pb-10">
        <h2 className="text-3xl sm:text-4xl font-bold pb-5">Category name</h2>

        <div className="flex items-center gap-3 flex-wrap pb-5">
          {categories.map((category) => (
            <button
              key={category}
              className={`rounded-md transition-all ease-in-out py-1 px-4 ${
                selectedCategory === category
                  ? "bg-gray-300"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              onClick={() => handleCategoryChange(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 lg:gap-5">
          {cards.map((card, index) => (
            <Card
              key={index}
              img={card.img}
              title={card.title}
              currentPrice={card.currentPrice}
              prePrice={card.prePrice}
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