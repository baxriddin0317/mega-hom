"use client"
import useCartProductStore from '@/zustand/useCartStore';
import { useRouter } from 'next/navigation';
import React from 'react'

const CartButton = () => {
  const { cartProducts } = useCartProductStore();

  // navigate
  const navigate = useRouter();

  const handleNavigate = () => {
    if(cartProducts.length > 0){
      navigate.push("/cart-product")
    }
  }
  return (
    <button onClick={handleNavigate} className="fixed bottom-5 md:bottom-10 2xl:bottom-20 right-5 md:right-10 2xl:right-16 z-50 rounded-full bg-red-500 size-14 md:size-20 flex items-center justify-center p-2.5 md:p-4">
      <svg data-slot="icon" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full h-full text-white">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
      <span className='absolute top-0 right-0 bg-blue-900 size-4 rounded-full text-xs text-white'>{cartProducts.length}</span>
    </button>
  )
}

export default CartButton