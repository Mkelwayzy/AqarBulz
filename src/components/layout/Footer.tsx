import React from "react";
import Link from "next/link";
import { MapPin, Phone, Mail, ShieldCheck, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 pt-12 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-extrabold">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-xl font-black text-white">نبض العقار</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              المنصة العقارية الذكية الأولى في مصر القائمة على الخرائط الجغرافية التفاعلية، لربط الملاك والوسطاء العقاريين المعتمدين بالباحثين عن أفضل الفرص السكنية والتجارية.
            </p>
            <div className="flex items-center gap-2 text-xs text-brand-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>بيانات موثوقة ونظام حماية لخصوصية الموقع</span>
            </div>
          </div>

          {/* Col 2: Top Locations */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3 border-b border-slate-800 pb-2">
              أبرز مناطق وقرى ميت غمر
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/explore?q=دقادوس" className="hover:text-brand-400 transition-colors">
                  مدينة ميت غمر - دقادوس
                </Link>
              </li>
              <li>
                <Link href="/explore?q=تفهنا الأشراف" className="hover:text-brand-400 transition-colors">
                  تفهنا الأشراف
                </Link>
              </li>
              <li>
                <Link href="/explore?q=صهرجت الكبرى" className="hover:text-brand-400 transition-colors">
                  صهرجت الكبرى
                </Link>
              </li>
              <li>
                <Link href="/explore?q=دماص" className="hover:text-brand-400 transition-colors">
                  دماص
                </Link>
              </li>
              <li>
                <Link href="/explore?q=كوم النور" className="hover:text-brand-400 transition-colors">
                  كوم النور
                </Link>
              </li>
              <li>
                <Link href="/explore?q=أتميدة" className="hover:text-brand-400 transition-colors">
                  أتميدة وبشلا
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3 border-b border-slate-800 pb-2">
              روابط سريعة
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/explore" className="hover:text-brand-400 transition-colors">
                  استكشاف الخريطة التفاعلية
                </Link>
              </li>
              <li>
                <Link href="/properties?transactionType=sale" className="hover:text-brand-400 transition-colors">
                  عقارات وفيلات للبيع
                </Link>
              </li>
              <li>
                <Link href="/properties?transactionType=rent" className="hover:text-brand-400 transition-colors">
                  شقق ودوبلكس للإيجار
                </Link>
              </li>
              <li>
                <Link href="/smart-match" className="hover:text-brand-400 transition-colors">
                  محرك التوافق العقاري الذكي
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-brand-400 transition-colors">
                  بوابة الملاك والوسطاء العقاريين
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-brand-400 transition-colors">
                  لوحة إدارة ومراجعة الإعلانات
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Market Disclaimer */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3 border-b border-slate-800 pb-2">
              سوق العقارات المصري
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              جميع الأسعار المعروضة بالجنيه المصري (EGP). تخضع الإعلانات لسياسة مراجعة الجودة ومكافحة التكرار، ولا يُنشر أي إعلان دون التحقق من مطابقة المعايير الجغرافية والمواصفات.
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              <span className="font-bold text-white block mb-0.5">امتثال تنظيمي:</span>
              يُنصح بمراجعة القوانين واللوائح المنظمة للإعلانات العقارية الإلكترونية في جمهورية مصر العربية قبل إتمام التعاقدات المالية.
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div>
            © {new Date().getFullYear()} نبض العقار (AqarPulse). جميع الحقوق محفوظة.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              سياسة الخصوصية
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              شروط الاستخدام
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-slate-300 transition-colors">
              اتصل بنا
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
