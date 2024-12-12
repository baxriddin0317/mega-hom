import Image from "next/image";
import Link from "next/link";
import React from "react";

interface CardProps {
  img: string;
  title: string;
  currentPrice: number;
  prePrice: number;
}

const Card = ({ img, title, currentPrice, prePrice }: CardProps) => {
  const formattedCurrentPrice = currentPrice.toLocaleString("en-US");
  const formattedPrePrice = prePrice.toLocaleString("en-US");

  return (
    <Link
      href="/product/1"
      className="flex flex-col h-full rounded border divide-y overflow-hidden shadow-sm"
    >
      <div className="relative w-full h-44 sm:h-72 shrink-0">
        <Image
          src={`/${img}`}
          alt={title}
          fill
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-3 justify-between h-full p-3 sm:p-4">
        <div className="space-y-1">
          <span className="text-black hover:text-brand">
            <h3 className="sm:text-xl font-semibold">{title}</h3>
          </span>
          <p>qisqacha xossalari</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <span className="font-medium text-brand animate-pulse">
              {formattedCurrentPrice}
            </span>
            <span className="text-gray-400 line-through">
              {formattedPrePrice}
            </span>
          </div>
          <span className="block text-center w-full rounded bg-brand hover:bg-brand/80 transition-all ease-in-out text-white p-2">
            Buyrutma qilish
          </span>
        </div>
      </div>
    </Link>
  );
};

export default Card;