import type { Metadata, Viewport } from "next";
import { Anton, Kanit } from "next/font/google";
import type { ReactNode } from "react";
import { PreferencesBootstrap } from "@/components/platform/PreferencesBootstrap";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Thank You Day FY27", template: "%s · Thank You Day FY27" },
  description: "Thank You Day FY27 game platform.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090909",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th" className={`${kanit.variable} ${anton.variable} h-full`}>
      <body className="min-h-full bg-bg text-ink">
        <PreferencesBootstrap />
        {children}
      </body>
    </html>
  );
}
