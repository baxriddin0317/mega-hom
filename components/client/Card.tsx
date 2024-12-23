import { ImageT } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { FormattedPrice } from '@/utils'
import React from "react";

interface CardProps {
  img: ImageT[];
  title: string;
  currentPrice: number;
  prePrice: number;
  href: string;
}

const Card = ({ img, title, currentPrice, prePrice, href }: CardProps) => {
  return (
    <Link
      href={href}
      className="flex flex-col h-full rounded border divide-y overflow-hidden shadow-sm"
    >
      <div className="relative w-full h-44 sm:h-72 shrink-0">
        <Image
          src={img[0].url ? img[0].url : `/sample.webp`}
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
              {FormattedPrice(currentPrice)} UZS
            </span>
            <span className="text-gray-400 line-through">
              {prePrice}
            </span>
          </div>
          <span className="block text-center w-full rounded bg-red-500 hover:bg-red-600 transition-all ease-in-out text-white p-2">
            Buyrutma qilish
          </span>
        </div>
      </div>
    </Link>
  );
};

export default Card;