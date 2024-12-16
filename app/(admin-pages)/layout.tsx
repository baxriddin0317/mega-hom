import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kursiy Admin panel",
  description: "Generated by xoja",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
    </>
  );
}