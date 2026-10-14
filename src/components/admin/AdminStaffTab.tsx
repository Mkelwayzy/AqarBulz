"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Shield,
  KeyRound,
  Mail,
  Phone,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Lock,
  Check,
  AlertTriangle,
  Building2,
  MessageSquare,
  Palette,
  HelpCircle,
  Sliders,
  ChevronDown,
} from "lucide-react";

interface StaffItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  adminRole?: string;
  adminPermissions?: string[];
  isStaff: boolean;
  isSuspended: boolean;
  createdAt?: string;
}

const AVAILABLE_PERMISSIONS = [
  {
    id: "projects.review",
    label: "إدارة ومراجعة المشاريع",
    description: "الموافقة على المشاريع العقارية والاعتماد أو الرفض",
    icon: Building2,
    color: "text-amber-500",
  },
  {
    id: "projects.delete",
    label: "حذف المشاريع نهائياً",
    description: "صلاحية الحذف النهائي للمشاريع المخالفة من النظام",
    icon: XCircle,
    color: "text-rose-500",
  },
  {
    id: "messages.read",
    label: "مراقبة الرسائل والمحادثات",
    description: "فحص سجل المحادثات والرسائل المتبادلة بين العملاء والوسطاء",
    icon: MessageSquare,
    color: "text-emerald-500",
  },
  {
    id: "cms.edit",
    label: "التحكم بالهوية والمحتوى (CMS)",
    description: "تعديل الشعار والأيقونة وأسماء الأزرار والألوان",
    icon: Palette,
    color: "text-purple-500",
  },
  {
    id: "support.manage",
    label: "إدارة البلاغات والدعم الفني",
    description: "استقبال بلاغات المستخدمين وتحديدها كمحلولة",
    icon: HelpCircle,
    color: "text-sky-500",
  },
  {
    id: "staff.manage",
    label: "إدارة موظفي الشركة",
    description: "إنشاء حسابات إدارية جديدة وتعديل صلاحيات الموظفين",
    icon: Users,
    color: "text-indigo-500",
  },
];

export default function AdminStaffTab() {
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Staff Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("moderator");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    "projects.review",
    "messages.read",
  ]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleRolePresetChange = (role: string) => {
    setSelectedRole(role);
    if (role === "superadmin") {
      setSelectedPermissions(AVAILABLE_PERMISSIONS.map((p) => p.id));
    } else if (role === "moderator") {
      setSelectedPermissions(["projects.review", "messages.read"]);
    } else if (role === "content_editor") {
      setSelectedPermissions(["cms.edit"]);
    } else if (role === "support_agent") {
      setSelectedPermissions(["support.manage", "messages.read"]);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || password.length < 8) {
      alert("يرجى ملء جميع البيانات الأساسية وكلمة مرور من 8 أحرف على الأقل");
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
          adminRole: selectedRole,
          adminPermissions: selectedPermissions,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", text: data.message || "تم إنشاء حساب الموظف وتعيين الصلاحيات بنجاح!" });
        setShowAddModal(false);
        setName("");
        setEmail("");
        setPhone("");
        setPassword("");
        fetchStaff();
      } else {
        setFeedback({ type: "error", text: data.error || "فشل إنشاء حساب الموظف" });
      }
    } catch {
      setFeedback({ type: "error", text: "خطأ بالاتصال أثناء إنشاء الحساب" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSuspension = async (member: StaffItem) => {
    if (member.email.toLowerCase() === "mkelwayzy@gmail.com") {
      alert("لا يمكن تعطيل حساب المالك والمشرف العام للمنصة");
      return;
    }

    const nextState = !member.isSuspended;
    setActionLoading(member.id);
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: nextState }),
      });
      if (res.ok) {
        setStaff((prev) =>
          prev.map((s) => (s.id === member.id ? { ...s, isSuspended: nextState } : s))
        );
        setFeedback({
          type: "success",
          text: nextState
            ? `تم تعطيل حساب الموظف (${member.name}) مؤقتاً`
            : `تم تفعيل حساب الموظف (${member.name}) بنجاح`,
        });
      } else {
        const d = await res.json();
        alert(d.error || "فشل تحديث حالة الحساب");
      }
    } catch {
      alert("خطأ أثناء تحديث حالة الموظف");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = staff.filter((s) => {
    return (
      !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-black uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>شركة الإدارة • إدارة فريق العمل والموظفين</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            حسابات موظفي شركة الإدارة والصلاحيات
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إضافة حسابات إدارية جديدة لموظفي الشركة وتعيين الصلاحيات المخصصة لكل موظف بدقة.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-black transition-all shadow-md shadow-indigo-700/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة موظف إدارة جديد</span>
          </button>

          <button
            onClick={fetchStaff}
            disabled={loading}
            className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-700" : ""}`} />
          </button>
        </div>
      </div>

      {/* Master Account Protected Badge */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 border border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white">المشرف العام الرئيسي المعتمد</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Primary Master
              </span>
            </div>
            <span className="text-xs text-slate-300 font-mono" dir="ltr">
              MKELWAYZY@gmail.com
            </span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-medium">
          الصلاحيات: تحكم مطلق وشامل (Super Admin) لكافة مفاصل المنصة وموظفيها.
        </span>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الموظف، البريد الإلكتروني، أو رقم الهاتف..."
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
        </div>
      </div>

      {/* 3. Staff List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">جاري قراءة حسابات موظفي الإدارة...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-800">لا يوجد موظفين مسجلين حالياً</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            اضغط على "إضافة موظف إدارة جديد" للبدء في تعيين حسابات فريق العمل وتحديد صلاحياتهم.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((member) => {
            const isMaster = member.email.toLowerCase() === "mkelwayzy@gmail.com";
            const perms = Array.isArray(member.adminPermissions) ? member.adminPermissions : [];

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sm text-slate-900">{member.name}</span>

                    {isMaster ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-amber-600" />
                        <span>المالك والمشرف العام</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span>موظف إدارة معتمد</span>
                      </span>
                    )}

                    {member.isSuspended ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        معطل
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        نشط
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span dir="ltr" className="font-mono">{member.email}</span>
                    </span>
                    {member.phone && (
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span dir="ltr">{member.phone}</span>
                      </span>
                    )}
                  </div>

                  {/* Granted Permissions Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-black text-slate-400 ml-1">الصلاحيات:</span>
                    {perms.length === 0 || perms.includes("all") ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        كافة الصلاحيات (تحكم كامل)
                      </span>
                    ) : (
                      perms.map((p) => {
                        const def = AVAILABLE_PERMISSIONS.find((ap) => ap.id === p);
                        return (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {def?.label || p}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isMaster && (
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleToggleSuspension(member)}
                      disabled={actionLoading === member.id}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                        member.isSuspended
                          ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                      }`}
                    >
                      {member.isSuspended ? "إلغاء التعطيل (تفعيل)" : "تعطيل الحساب"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">إضافة موظف إدارة جديد</h3>
                  <p className="text-xs text-slate-500">
                    إنشاء حساب إداري وتحديد الصلاحيات المسموح بها للموظف
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1.5">اسم الموظف بالكامل</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد مصطفى"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5">البريد الإلكتروني للدخول</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@company.com"
                    dir="ltr"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-left"
                  />
                </div>

                <div>
                  <label className="block mb-1.5">رقم الهاتف (اختياري)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    dir="ltr"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5">كلمة المرور المبدئية (8 أحرف كحد أدنى)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>

              {/* Role Preset */}
              <div>
                <label className="block mb-1.5">الدور الوظيفي الرئيسي</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "moderator", label: "مشرف مشاريع" },
                    { id: "support_agent", label: "أخصائي دعم ورسائل" },
                    { id: "content_editor", label: "مسؤول محتوى وهية" },
                    { id: "superadmin", label: "مدير بصلاحيات كاملة" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleRolePresetChange(preset.id)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedRole === preset.id
                          ? "bg-indigo-700 text-white border-indigo-700 font-black"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Permissions Selection */}
              <div>
                <label className="block mb-2">تحديد الصلاحيات الممنوحة للموظف:</label>
                <div className="space-y-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.id);
                    const IconComp = perm.icon;

                    return (
                      <label
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-500/20"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100/60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-700"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <IconComp className={`w-3.5 h-3.5 ${perm.color}`} />
                            <span className="font-black text-slate-900">{perm.label}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {perm.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-black cursor-pointer shadow-md shadow-indigo-700/20"
                >
                  {submitting ? "جاري الإنشاء..." : "إنشاء الحساب وتفعيل الصلاحيات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
