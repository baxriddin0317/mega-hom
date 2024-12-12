"use client"
import { useState } from "react";
import Link from "next/link";
import { HumburgerIcon, XIcon } from "../icons";
import Image from "next/image";

interface Navigation {
  title: string;
  link: string;
}

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const navigations: Navigation[] = [
    { title: "Oshxona toplamlari", link: "/products" },
    { title: "Maishiy texnikalar", link: "/products" },
    { title: "Chamadonlar", link: "/products" },
    { title: "Seyflar", link: "/products" },
    { title: "Office kreslolar", link: "/products" },
    { title: "Dekorlar", link: "/products" },
  ];

  return (
    <header>
      <div className="w-full bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-5 py-1 md:py-0 xl:px-0 px-4 my-2">
          <Link href="/" className="relative flex justify-center p-4 w-40 sm:w-48">
            <Image className="absolute object-cover" fill src="/megahome-text.png" alt="Logo" />
          </Link>

          <div className="max-w-md w-full">
            <input type="search" placeholder="Mahsulot izlash" className="border border-gray-400 rounded-md w-full h-10 md:h-12 px-4"  />
          </div>
        </div>

        <div className="relative bg-brand">
          <div className="max-w-7xl mx-auto px-4">
            <div className="md:hidden flex items-center justify-between py-2">
              <span className="text-white">MENU</span>
              <button type="button" className="text-white" onClick={() => setMenuOpen(!menuOpen)} >
                {menuOpen ? (
                  <HumburgerIcon />
                ) : (
                  <XIcon />
                )}
              </button>
            </div>

            <div className={`absolute md:static top-12 left-0 w-full bg-brand md:max-h-none overflow-hidden transition-all ease-in-out duration-200 ${menuOpen ? "max-h-64" : "max-h-0"}`} >
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                {navigations.map((navigation, index) => (
                  <Link
                    key={index}
                    href={navigation.link}
                    className="flex items-center justify-center gap-1 uppercase text-white transition-all ease-in-out hover:text-white/70 border-b border-transparent hover:border-b hover:border-white font-medium text-xs lg:text-sm p-3"
                  >
                    <span>{navigation.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header