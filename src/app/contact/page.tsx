import React from "react";
import { Mail, Phone, MapPin, MessageCircle, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-slate-900">اتصل بفريق منصة نبض العقار</h1>
        <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
          يسعدنا تقديم الدعم الفني والإجابة عن استفسارات الملاك والوسطاء العقاريين في مصر
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">الاتصال الهاتفي</h3>
          <p className="text-xs text-slate-500 font-mono">+20 2 2790 0000</p>
          <span className="text-[11px] text-slate-400 block">يومياً من 9 صباحاً حتى 6 مساءً</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <MessageCircle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">الدعم عبر واتساب</h3>
          <p className="text-xs text-slate-500 font-mono">+20 100 111 2233</p>
          <span className="text-[11px] text-slate-400 block">رد سريع خلال ساعات العمل</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">المقر الرئيسي</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            شارع التسعين الشمالي، التجمع الخامس، القاهرة الجديدة، مصر
          </p>
        </div>
      </div>
    </div>
  );
}
