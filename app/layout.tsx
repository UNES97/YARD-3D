import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Maersk brand fonts, copied from @maersk-global/fonts (as used in apmtcompass)
const maerskText = localFont({
  variable: "--font-maersk-text",
  display: "swap",
  src: [
    { path: "./fonts/MaerskText-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/MaerskText-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/MaerskText-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/MaerskText-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/MaerskText-Bold.woff2", weight: "700", style: "normal" },
  ],
});

const maerskHeadline = localFont({
  variable: "--font-maersk-headline",
  display: "swap",
  src: [
    { path: "./fonts/MaerskHeadline-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/MaerskHeadline-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/MaerskHeadline-Bold.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "APMT Yard & Quay",
  description: "Live 3D view of an APM Terminals yard and quay side",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${maerskText.variable} ${maerskHeadline.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
