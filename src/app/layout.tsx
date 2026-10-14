import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Suspense } from "react";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import PwaInstallPrompt from "@/components/layout/PwaInstallPrompt";
import PwaRegister from "@/components/layout/PwaRegister";
import CapacitorClientInit from "@/components/providers/CapacitorClientInit";

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "نبض العقار (AqarPulse) | المنصة العقارية الذكية لمركز ميت غمر وقراها",
  description:
    "استكشف العقارات والشقق والبيوت والأراضي في مركز ومدينة ميت غمر وقراها بمحافظة الدقهلية على خريطة تفاعلية مدعومة بنظام PostGIS وحماية الخصوصية.",
  applicationName: "نبض العقار",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "نبض العقار",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  keywords: [
    "عقارات مصر",
    "شقق للبيع التجمع الخامس",
    "فيلات الشيخ زايد",
    "خريطة عقارات تفاعلية",
    "AqarPulse",
    "عقارات العاصمة الإدارية",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-brand-500 selection:text-white">
        <CapacitorClientInit />
        <PwaRegister />
        <Navbar />
        <PwaInstallPrompt />
        <main className="flex-1 pb-24">{children}</main>
        <Footer />
        <Suspense fallback={null}>
          <MobileBottomNav />
        </Suspense>
      </body>
    </html>
  );
}

