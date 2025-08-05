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

export const metadata: Metadata = {
  title: "Autosell - AI-Powered Marketplace Automation",
  description: "Upload photos and automatically create optimized listings for Facebook Marketplace, FINN.no, and Amazon. AI-powered pricing, platform recommendations, and automated publishing.",
  keywords: "marketplace automation, AI listing, Facebook Marketplace, FINN.no, Amazon selling, automated pricing, multi-platform selling",
  authors: [{ name: "Autosell" }],
  openGraph: {
    title: "Autosell - AI-Powered Marketplace Automation",
    description: "Upload photos and automatically create optimized listings for Facebook Marketplace, FINN.no, and Amazon.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Autosell - AI-Powered Marketplace Automation",
    description: "Upload photos and automatically create optimized listings for Facebook Marketplace, FINN.no, and Amazon.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
