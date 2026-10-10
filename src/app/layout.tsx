import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "نبض العقار (AqarPulse) | المنصة العقارية الذكية والخريطة التفاعلية في مصر",
  description:
    "استكشف آلاف العقارات والشقق والفيلات والمقرات الإدارية في القاهرة الجديدة، الشيخ زايد، 6 أكتوبر، والعاصمة الإدارية على خريطة تفاعلية مدعومة بنظام PostGIS وحماية الخصوصية.",
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-brand-500 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
