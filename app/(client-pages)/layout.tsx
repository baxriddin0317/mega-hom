import Contact from "@/components/client/Contact";
import Delivery from "@/components/client/Delivery";
import Footer from "@/components/client/Footer";
import Header from "@/components/client/Header";
import NewProducts from "@/components/client/NewProducts";
import Partners from "@/components/client/Partners";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mega Home",
  description: "",
};

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="bg-body min-h-screen">
        {children}
        <NewProducts />
        <Partners />
        <Delivery />
        <Contact />
        <Link href="/" className="fixed bottom-5 md:bottom-10 2xl:bottom-20 right-5 md:right-10 2xl:right-16 z-50 rounded-full bg-red-500 size-14 md:size-20 flex items-center justify-center p-2.5 md:p-4">
          <svg data-slot="icon" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full h-full text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        </Link>
      </main>
      <Footer />
    </>
  );
}
