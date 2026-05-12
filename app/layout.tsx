import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Unimus Inventrack (UIT) - Sistem Peminjaman Barang Lab",
  description:
    "Sistem pencatatan dan monitoring peminjaman barang laboratorium Universitas Muhammadiyah Semarang",
  keywords: "peminjaman, laboratorium, unimus, inventrack, monitoring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="font-sans">
      <head>
        <link rel="icon" type="image/png" href="/Logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className={cn(inter.className)}>{children}</body>
    </html>
  );
}
