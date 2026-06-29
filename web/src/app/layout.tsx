import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Absolute base for OG/Twitter image URLs. Override per-env via NEXT_PUBLIC_SITE_URL.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://onedollarworld.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "OneDollar.World — what one dollar really does, around the world",
  description:
    "See what a single US dollar actually buys across the world — meals, clean water, a ride to work. The same dollar, millions of different lives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
