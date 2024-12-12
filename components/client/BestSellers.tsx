"use client"
import React, { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import { Swiper as SwiperType } from 'swiper';
import { IconChevron } from "../icons";

import "swiper/css";
import Card from "./Card";

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
];

const BestSellers = () => {
  const swiperRef = useRef<SwiperType>(null);
  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <h2 className="text-3xl sm:text-4xl font-bold pb-5">Best Sellers</h2>
      <div className="relative">
        <Swiper
          onBeforeInit={(swiper) => {
            swiperRef.current = swiper;
          }}
          slidesPerView={2}
          spaceBetween={10}
          navigation={{
            prevEl: ".swiper-button-pre",
            nextEl: ".swiper-button-nex",
          }}
          autoplay={{
            delay: 6000,
            disableOnInteraction: true,
            stopOnLastSlide: true,
          }}
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 16 },
            768: { slidesPerView: 3, spaceBetween: 24 },
            1024: { slidesPerView: 4, spaceBetween: 20 },
          }}
          modules={[Navigation, Autoplay]}
          className="swiperBestSellers !static"
        >
          {cards.map((card, index) => (
            <SwiperSlide key={index} className="!flex !flex-col !h-auto">
              <Card
                img={card.img}
                title={card.title}
                currentPrice={card.currentPrice}
                prePrice={card.prePrice}
              />
            </SwiperSlide>
          ))}

          <button
            type="button"
            onClick={() => swiperRef.current?.slidePrev()}
            className="disabled:opacity-40 sm:absolute top-1/2 sm:-translate-y-1/2 -left-5 bg-white rounded-full border border-brand text-brand rotate-90 z-50 p-1.5 shadow-md mt-5"
          >
             <IconChevron />
          </button>
          <button
            type="button"
            onClick={() => swiperRef.current?.slideNext()}
            className="disabled:opacity-40 sm:absolute top-1/2 sm:-translate-y-1/2 -right-5 bg-white rounded-full border border-brand text-brand -rotate-90 z-50 p-1.5 shadow-md mt-5 ml-3"
          >
            <IconChevron />
          </button>
        </Swiper>
      </div>
    </div>
  )
}

export default BestSellers