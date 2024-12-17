"use client";
import useCartProductStore from "@/zustand/useCartStore";
import React, { useState } from "react";
import Quantity from "../Quantity";
import { BsCartDash } from "react-icons/bs";
import SubmitModal from "../Modal";
import Image from "next/image";

const CartProductContent = () => {
  const [open, setOpen] = useState(false);
  const { cartProducts, totalPrice, totalQuantity } = useCartProductStore();

  return (
    <div className="grid lg:grid-cols-6 gap-6">
      <div className="order-2 bg-white shadow-md border border-gray-300 rounded-xl p-5 flex lg:col-span-4 flex-col gap-10 py-5">
        {cartProducts.map((cart) => (
          <div key={cart.id} className="flex flex-wrap items-center">
            <div className="relative size-44 overflow-hidden rounded-md">
              <Image
                fill
                className="absolute size-full object-cover"
                src={cart.productImageUrl[0].url}
                alt=""
              />
            </div>
            <div className="flex flex-col">
              <h3>{cart.title}</h3>
              <p>{cart.price}UZS</p>
            </div>
            <Quantity id={cart.id} />
          </div>
        ))}
      </div>
      <div className="max-h-60 bg-white shadow-md border border-gray-300 rounded-xl p-5 order-1 lg:order-3 lg:col-span-2 space-y-2 font-medium">
        <div className="flex items-center justify-between">
          <p className="text-slate-400">Mahsulotlar soni</p>
          <p className="text-gray-800">{totalQuantity} ta</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-slate-400">Umumiy summa</p>
          <p className="text-gray-800 ">{totalPrice} UZS</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center mx-auto justify-center gap-2 bg-indigo-500 transition-all ease-in-out hover:bg-indigo-600 rounded-xl max-w-lg w-full text-white p-3 !mt-6"
        >
          <BsCartDash className="text-white text-xl" />
          <span>Adminga Yuborish</span>
        </button>
      </div>
      {open && <SubmitModal setOpen={setOpen} />}
    </div>
  );
};

export default CartProductContent;
