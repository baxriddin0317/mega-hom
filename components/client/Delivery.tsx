import Image from 'next/image'
import React from 'react'

const Delivery = () => {
  return (
    <section className="pt-10 overflow-hidden">
      <div className="relative overflow-hidden bg-brand text-white py-2 sm:py-4">
        <div className="running-text">
          <span className={`marquee-text text-xl sm:text-2xl`}>
            O&apos;zbekiston bo&apos;ylab yetkazib berish bepul!!! O&apos;zbekiston bo&apos;ylab
            yetkazib berish bepul!!! O&apos;zbekiston bo&apos;ylab yetkazib berish bepul!!!
          </span>
        </div>
      </div>
      <div
        data-aos="fade-left"
        data-aos-duration="500"
        className="max-w-4xl mx-auto -mb-10"
      >
        <Image
          src="/labo-delivery.png"
          alt="Delivery Image"
          width={800}
          height={400}
          className="w-full"
        />
      </div>
    </section>
  )
}

export default Delivery