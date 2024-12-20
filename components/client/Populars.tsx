import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const Populars = () => {
  return (
  <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6">
    <h2 className="text-4xl font-bold pb-5">
      Populars
    </h2>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 grid-rows-[110px_110px] gap-2">
      <Link href="/products" className="relative group overflow-hidden lg:row-span-2 flex items-center gap-5 lg:block rounded bg-yellow-500 hover:shadow-brand transition-all ease-in-out p-5">
        <Image src="/dishes.svg" width={128} height={128} alt="dishes" className="hidden sm:block w-16 lg:w-32" />
        <div>
          <h3 className="text-white font-medium text-lg">
            Daxshat idishlar
          </h3>
          <span className="text-gray-300">
            345 400na
          </span>
        </div>
      </Link>
      <Link href="/products" className="flex items-center gap-5 rounded bg-red-400 hover:shadow-brand transition-all ease-in-out p-5">
        <Image src="/dishes.svg" width={128} height={128} alt="dishes" className="hidden sm:block w-16" />
        <div>
          <h3 className="text-white font-medium text-lg">
            Offis va uy uchun kreslolar
          </h3>
          <span className="text-gray-300">
            345 dona
          </span>
        </div>
      </Link>
      <Link href="/products" className="flex items-center gap-5 rounded bg-red-400 hover:shadow-brand transition-all ease-in-out p-5">
        <Image src="/dishes.svg" width={128} height={128} alt="dishes" className="hidden sm:block w-16" />
        <div>
          <h3 className="text-white font-medium text-lg">
            Seyflar
          </h3>
          <span className="text-gray-300">
            345 dona
          </span>
        </div>
      </Link>
      <Link href="/products" className="relative group overflow-hidden lg:row-span-2 flex items-center gap-5 lg:block rounded bg-yellow-500 hover:shadow-brand transition-all ease-in-out p-5">
        <Image src="/dishes.svg" width={128} height={128} alt="dishes" className="hidden sm:block w-16 lg:w-32" />
        <div>
          <h3 className="text-white font-medium text-lg">
            Daxshat idishlar
          </h3>
          <span className="text-gray-300">
            345 400na
          </span>
        </div>
      </Link>
      <Link href="/products" className="flex items-center gap-5 rounded bg-red-400 hover:shadow-brand transition-all ease-in-out p-5">
        <Image src="/dishes.svg" width={128} height={128} alt="dishes" className="hidden sm:block w-16" />
        <div>
          <h3 className="text-white font-medium text-lg">
            Chemodan
          </h3>
          <span className="text-gray-300">
            345 dona
          </span>
        </div>
      </Link>
      <Link href="/products" className="flex items-center gap-5 rounded bg-red-400 hover:shadow-brand transition-all ease-in-out p-5">
        <Image src="/dishes.svg" width={128} height={128} alt="dishes" className="hidden sm:block w-16" />
        <div>
          <h3 className="text-white font-medium text-lg">
            Daxshat idishlar
          </h3>
          <span className="text-gray-300">
            345 dona
          </span>
        </div>
      </Link>
    </div>
  </div>
  )
}

export default Populars