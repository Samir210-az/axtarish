import type { Metadata, Viewport } from "next";
import "@fontsource-variable/onest";
import "@fontsource-variable/playfair-display";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axtarış: Azərbaycan bazarında qiymətlər",
  description:
    "Məhsulun adını yazın və Azərbaycan bazarında kimin neçə manata satdığını, minimum, median və maksimum qiyməti bir yerdə görün.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a0609",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <body>
        <div className="backdrop" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
