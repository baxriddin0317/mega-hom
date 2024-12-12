"use client"
import React, { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import Image from "next/image";
import { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

type SwiperEventCallback = (s: SwiperType, time: number, progress: number) => void;

const Hero = () => {
  const progressCircle = useRef<SVGSVGElement>(null);
  const progressContent = useRef<HTMLSpanElement | null>(null);

  const onAutoplayTimeLeft: SwiperEventCallback = (s, time, progress) => {
    if (progressCircle.current) {
      progressCircle.current.style.setProperty('--progress', `${1 - progress}`);
    }
    if (progressContent.current) {
      progressContent.current.textContent = `${Math.ceil(time / 1000)}s`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Swiper
        spaceBetween={30}
        centeredSlides={true}
        autoplay={{
          delay: 2500,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
        }}
        navigation={true}
        modules={[Autoplay, Pagination, Navigation]}
        onAutoplayTimeLeft={onAutoplayTimeLeft}
        className="mySwiper h-40 sm:h-80 lg:h-[500px]"
      >
        {/* Slide 1 */}
        <SwiperSlide>
          <div className="relative w-full h-full">
            <Image
              fill
              src="/ramadan-banner.webp"
              alt="Ramadan Banner"
              className="absolute w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 w-full h-full"></div>
          </div>
        </SwiperSlide>

        {/* Slide 2 */}
        <SwiperSlide>
          <div className="relative w-full h-full">
            <Image
              fill
              src="/banner1.jpg"
              alt="Banner 1"
              className="absolute w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 w-full h-full"></div>
          </div>
        </SwiperSlide>

        {/* Slide 3 */}
        <SwiperSlide>
          <div className="relative w-full h-full">
            <Image
              fill
              src="/banner2.jpg"
              alt="Banner 2"
              className="absolute w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 w-full h-full"></div>
          </div>
        </SwiperSlide>

        {/* Custom Autoplay Progress */}
        <div className="autoplay-progress w-8 sm:w-12 h-8 sm:h-12 text-xs">
          <svg viewBox="0 0 48 48" ref={progressCircle}>
            <circle cx="24" cy="24" r="20"></circle>
          </svg>
          <span ref={progressContent}></span>
        </div>
      </Swiper>
    </div>
  );
}

export default Hero