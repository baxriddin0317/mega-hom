'use client'
import DashboardKPIs, { Period } from "@/components/admin/DashboardKPIs";
import TopSellers from "@/components/admin/TopSellers";
import MeshBackdrop from "@/components/MeshBackdrop";
import { useRole } from "@/components/admin/RoleContext";
import { ROLE_LABELS, Role, isAdminPlus, isManagerPlus } from "@/lib/roles";
import { auth } from "@/firebase/FirebaseConfig";
import { signOut } from "firebase/auth";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Charts pull in recharts (~100KB) — load them after the KPI shell paints
// instead of blocking the dashboard's first render on the chart bundle.
const DashboardCharts = dynamic(() => import("@/components/admin/DashboardCharts"), {
  ssr: false,
  loading: () => (
    <div className="px-5 mb-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-40 rounded-xl border border-brand-100 bg-white animate-pulse ${
              i === 0 ? "md:col-span-2 xl:col-span-2" : i === 3 ? "md:col-span-2 xl:col-span-4" : ""
            }`}
          />
        ))}
      </div>
    </div>
  ),
});

// Bosh sahifa = Hisobotlar, xolos. KPI kartalari + grafiklar + eng koʼp
// sotilganlar; hech qanday boshqaruv elementi yoʼq. Mahsulot/kategoriya/zaxira
// bilan ishlash toʼliq Ombor sahifasiga koʼchdi (/admin-dashboard/inventory).
const Admin = () => {
  const me = useRole();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("today");

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("logout failed", e);
    }
    if (typeof window !== "undefined") localStorage.removeItem("users");
    router.push("/login");
  };

  const canCatalog = isManagerPlus(me?.role);
  const canStaff = isAdminPlus(me?.role);

  return (
    <div className="brand-mesh min-h-screen pb-10">
      {/* Top */}
      <div className="mb-5 px-5 pt-5">
        <div className="relative overflow-hidden rounded-xl shadow-lg shadow-brand/20">
          <MeshBackdrop colors={["#C21A1A", "#9E1414", "#5B0D0D", "#7A1010", "#C21A1A"]} speed={0.5} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#5B0D0D]/45 via-transparent to-[#5B0D0D]/45" />
          <div className="relative z-10 flex items-center justify-between text-white px-5 py-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs text-white/70">Hisobotlar</p>
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <Link
              className="font-medium text-white bg-white/15 hover:bg-white/25 border border-white/30 rounded-lg px-3 py-1.5 transition-colors"
              href={'/'}
              title="Profildan chiqmagan holda doʼkonga qaytish"
            >
              ← Doʼkon
            </Link>
            <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/pos'}>
              Kassa
            </Link>
            {canStaff && (
              <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/staff'}>
                Xodimlar
              </Link>
            )}
            {canCatalog && (
              <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/customers'}>
                Mijozlar
              </Link>
            )}
            {canCatalog && (
              <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/inventory'}>
                Ombor
              </Link>
            )}
            {canCatalog && (
              <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/expenses'}>
                Xarajatlar
              </Link>
            )}
            {canCatalog && (
              <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/analytics'}>
                Tahlil
              </Link>
            )}
            <Link className="font-medium text-white/90 hover:text-white" href={'/admin-dashboard/orders'}>
              Buyurtmalar
            </Link>
            <Popover className="relative lg:ml-5">
              <PopoverButton className="flex items-center outline-none">
                <Image
                  width={56}
                  height={56}
                  className="size-14"
                  src="https://cdn-icons-png.flaticon.com/128/2202/2202112.png"
                  alt=""
                />
              </PopoverButton>
              <PopoverPanel
                anchor="bottom"
                className="divide-y w-52 bg-black -translate-x-5 divide-white/5 rounded-xl text-sm/6 [--anchor-gap:var(--spacing-5)] data-[closed]:-translate-y-1 data-[closed]:opacity-0 p-2"
              >
                <div className="block rounded-lg py-2 px-3">
                  <p className="font-semibold text-white">{me?.name}</p>
                  <p className="text-xs text-white/60">{ROLE_LABELS[(me?.role as Role) ?? "user"]}</p>
                </div>
                <div className="block rounded-lg transition hover:bg-white/20">
                  <Link href="/" className="block py-2 px-3 font-semibold text-white">
                    Doʼkonga qaytish
                  </Link>
                </div>
                <div className="block rounded-lg py-2 px-3 transition hover:bg-white/20 cursor-pointer">
                  <button onClick={handleLogout} className="font-semibold text-white">
                    Chiqish
                  </button>
                </div>
              </PopoverPanel>
            </Popover>
          </div>
          </div>
        </div>
      </div>

      {canCatalog ? (
        <>
          {/* Hisobotlar — davr KPIlari, grafiklar va eng koʼp sotilganlar */}
          <DashboardKPIs period={period} onPeriod={setPeriod} />
          <DashboardCharts period={period} />
          <TopSellers />
        </>
      ) : (
        <div className="px-5">
          <div className="max-w-md mx-auto text-center bg-brand-50 border border-brand-100 rounded-xl p-8 mt-10">
            <h2 className="text-lg font-bold text-brand-600 mb-2">Salom, {me?.name}!</h2>
            <p className="text-slate-600 mb-4">Siz xodim sifatida kassa va buyurtmalar bilan ishlaysiz.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/admin-dashboard/pos"
                className="inline-block px-5 py-2.5 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600"
              >
                Kassa (POS)
              </Link>
              <Link
                href="/admin-dashboard/orders"
                className="inline-block px-5 py-2.5 bg-white border border-brand-200 text-brand-600 font-semibold rounded-lg hover:bg-brand-50"
              >
                Buyurtmalar
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
