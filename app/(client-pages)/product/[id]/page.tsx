import Image from 'next/image'
import React from 'react'

const Product = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-20 py-6">
        <div className="relative max-w-md w-full sm:w-[448px] h-64 sm:h-[448px] rounded-xl overflow-hidden">
          <Image className="absolute w-full h-full sm:object-cover" fill src="/bestSellers/08DLX.jpg" alt='' />
        </div>
        <div className="space-y-8">
          <div className="rounded-xl border border-gray-300 flex items-center gap-8 w-fit py-1.5 px-2">
            <button className="size-9 bg-gray-100 flex items-center justify-center rounded-full">
              -
            </button>
            <div className="w-14 border-b">
              <span className="block text-center">1</span>
            </div>
            <button className="size-9 bg-red-500 text-white flex items-center justify-center rounded-full">
              +
            </button>
          </div>
          <h2 className="sm:text-2xl font-semibold">
            Kreslo 205 lorem20
          </h2>
          <p className="text-lg">
            DOMTIME zamonaviy ko&apos;rinishdagi kreslo
          </p>           
        </div>
      </div>
    </div>
  )
}

export default Product