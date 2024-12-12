"use client"
import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/autoplay";
import Image from "next/image";

const logos = [
  "elde.svg",
  "imkon.svg",
  "ishonch.svg",
  "tehnodom.jpg",
  "uzum.svg",
  "elde.svg",
  "imkon.svg",
  "ishonch.svg",
  "tehnodom.jpg",
  "uzum.svg",
];
const Partners = () => {
  return (
    <div className="max-w-7xl mx-auto py-10">
      <Swiper
        spaceBetween={24}
        slidesPerView={3}
        breakpoints={{
          640: {
            slidesPerView: 4,
            spaceBetween: 28,
          },
          768: {
            slidesPerView: 6,
            spaceBetween: 32,
          },
          1024: {
            slidesPerView: 5,
            spaceBetween: 40,
          },
        }}
        autoplay={{
          delay: 4000,
          disableOnInteraction: false,
        }}
        allowTouchMove={false}
        modules={[Autoplay]}
        className="swiperPartnerBrands"
      >
        {logos.map((logo, index) => (
          <SwiperSlide key={index}>
            <div className="relative w-full h-12">
              <Image
                fill
                src={`/logos/${logo}`}
                alt={logo}
                className="absolute object-contain mx-auto"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default Partners