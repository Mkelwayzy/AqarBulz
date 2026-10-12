"use client";

import React, { useState, useEffect } from "react";
import AdminNav from "@/components/admin/AdminNav";
import {
  ShieldCheck,
  UserPlus,
  Users,
  Shield,
  KeyRound,
  Lock,
  UserX,
  UserCheck,
  Trash2,
  Edit,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Sparkles,
  Info,
  X,
  Check,
} from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  adminRole: "superadmin" | "moderator" | "support" | "editor" | "admin";
  adminPermissions: string[];
  isStaff: boolean;
  isSuspended: boolean;
  createdAt: string;
}

const ALL_AVAILABLE_PERMISSIONS = [
  { key: "properties.review", label: "مراجعة واعتماد العقارات والمشاريع المقيدة" },
  { key: "properties.delete", label: "حذف وتعديل بيانات العقارات المنشورة" },
  { key: "users.manage", label: "إدارة وتجميد حسابات المعلنين والعملاء" },
  { key: "staff.manage", label: "إضافة وتعديل موظفي وفريق الإدارة" },
  { key: "inquiries.reply", label: "متابعة والرد على استفسارات ومحادثات العملاء" },
  { key: "reports.resolve", label: "معالجة بلاغات المحتوى والشكاوى" },
  { key: "cms.edit", label: "إدارة مقالات وصفحات ومحتوى المنصة (CMS)" },
  { key: "metrics.view", label: "الاطلاع على التقارير والإحصائيات الحساسة" },
];

export default function AdminStaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Add Staff Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    adminRole: "moderator" as "superadmin" | "moderator" | "support" | "editor",
    adminPermissions: ["properties.review"] as string[],
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Edit Permissions Modal
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editRole, setEditRole] = useState<string>("moderator");

  // Reset Staff Password Modal
  const [passwordModalStaff, setPasswordModalStaff] = useState<StaffMember | null>(null);
  const [newStaffPassword, setNewStaffPassword] = useState("");

  // My Password Modal (Logged-in admin change own password)
  const [showMyPasswordModal, setShowMyPasswordModal] = useState(false);
  const [myCurrentPassword, setMyCurrentPassword] = useState("");
  const [myNewPassword, setMyNewPassword] = useState("");
  const [myPasswordLoading, setMyPasswordLoading] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff");
      const data = await res.json();
      if (res.ok && data.staff) {
        setStaffList(data.staff);
      } else {
        setError(data.error || "فشل تحميل قائمة موظفي الإدارة");
      }
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessNotice(data.message);
        setShowAddModal(false);
        setAddForm({
          name: "",
          email: "",
          phone: "",
          password: "",
          adminRole: "moderator",
          adminPermissions: ["properties.review"],
        });
        loadStaff();
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        setError(data.error || "فشل إضافة الموظف");
      }
    } catch {
      setError("حدث خطأ أثناء إضافة الموظف");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEditedStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/staff/${editingStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminRole: editRole,
          adminPermissions: editPermissions,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessNotice(data.message);
        setEditingStaff(null);
        loadStaff();
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        setError(data.error || "فشل تعديل صلاحيات الموظف");
      }
    } catch {
      setError("حدث خطأ أثناء الحفظ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetStaffPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalStaff || !newStaffPassword) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/staff/${passwordModalStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: newStaffPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessNotice(`تم تعيين كلمة المرور الجديدة للموظف (${passwordModalStaff.name}) بنجاح`);
        setPasswordModalStaff(null);
        setNewStaffPassword("");
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        setError(data.error || "فشل إعادة تعيين كلمة المرور");
      }
    } catch {
      setError("حدث خطأ أثناء الحفظ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStaffSuspension = async (staff: StaffMember) => {
    const isSuspending = !staff.isSuspended;
    const confirmMsg = isSuspending
      ? `هل أنت متأكد من تجميد وصول الموظف (${staff.name}) إلى لوحة الإدارة؟`
      : `هل تريد إعادة تفعيل حساب الموظف (${staff.name})؟`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: isSuspending }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessNotice(data.message);
        loadStaff();
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        setError(data.error || "فشل تحديث حالة الحساب");
      }
    } catch {
      setError("حدث خطأ أثناء تحديث حالة الموظف");
    }
  };

  const handleRevokeStaff = async (staff: StaffMember) => {
    if (!confirm(`هل أنت متأكد من إلغاء الصفة الإدارية عن (${staff.name}) وسحب كافة صلاحياته؟`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/staff/${staff.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessNotice(data.message);
        loadStaff();
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        setError(data.error || "فشل إلغاء الصلاحيات");
      }
    } catch {
      setError("حدث خطأ أثناء الحذف");
    }
  };

  const handleChangeMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMyPasswordLoading(true);

    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: myCurrentPassword,
          newPassword: myNewPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessNotice("تم تحديث كلمة مرور حسابك الإداري بنجاح!");
        setShowMyPasswordModal(false);
        setMyCurrentPassword("");
        setMyNewPassword("");
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        alert(data.error || "فشل تحديث كلمة المرور");
      }
    } catch {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setMyPasswordLoading(false);
    }
  };

  const togglePermission = (permKey: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes("all")) {
      setList([permKey]);
      return;
    }
    if (list.includes(permKey)) {
      setList(list.filter((k) => k !== permKey));
    } else {
      setList([...list, permKey]);
    }
  };

  const superAdminsCount = staffList.filter((s) => s.adminRole === "superadmin").length;
  const moderatorsCount = staffList.filter((s) => s.adminRole === "moderator").length;
  const supportCount = staffList.filter((s) => s.adminRole === "support").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <AdminNav />

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>هيكل الصلاحيات والحوكمة الإدارية</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              إدارة موظفي وفريق الإدارة والصلاحيات
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              التحكم في موظفي المنصة، تعيين الصلاحيات المخصصة، وتغيير كلمات المرور
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowMyPasswordModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>تغيير كلمة مروري الشخصية</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-2 shadow-lg shadow-amber-500/10"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ إضافة موظف إدارة جديد</span>
            </button>
          </div>
        </div>

        {/* Notices */}
        {successNotice && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-slate-400 text-xs font-bold mb-1">إجمالي فريق الإدارة</div>
            <div className="text-2xl font-black text-white">{staffList.length}</div>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-amber-400 text-xs font-bold mb-1">مدير عام (Super Admin)</div>
            <div className="text-2xl font-black text-amber-400">{superAdminsCount}</div>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-blue-400 text-xs font-bold mb-1">مشرفو مراجعة العقارات</div>
            <div className="text-2xl font-black text-blue-400">{moderatorsCount}</div>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-emerald-400 text-xs font-bold mb-1">مسؤولو الدعم والاستفسارات</div>
            <div className="text-2xl font-black text-emerald-400">{supportCount}</div>
          </div>
        </div>

        {/* Staff Table Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>قائمة أعضاء فريق الإدارة والمسؤولين</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {staffList.length} موظف مسجل
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
              <p className="text-xs font-bold">جاري تحميل بيانات الموظفين...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">اسم الموظف والحساب</th>
                    <th className="p-4">بيانات التواصل</th>
                    <th className="p-4">الرتبة الإدارية</th>
                    <th className="p-4">الصلاحيات الممنوحة</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {staffList.map((member) => {
                    const isOwner = member.email === "mkelwayzy@gmail.com";

                    return (
                      <tr key={member.id} className="hover:bg-slate-800/30 transition">
                        {/* Name */}
                        <td className="p-4">
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{member.name}</span>
                            {isOwner && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-black border border-amber-500/30">
                                المالك الرئيسي ⭐
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {member.email}
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="p-4 text-slate-300">
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{member.phone || "غير محدد"}</span>
                          </div>
                        </td>

                        {/* Admin Role */}
                        <td className="p-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              member.adminRole === "superadmin"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : member.adminRole === "moderator"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                : member.adminRole === "support"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            }`}
                          >
                            {member.adminRole === "superadmin"
                              ? "مدير عام (Super Admin)"
                              : member.adminRole === "moderator"
                              ? "مشرف مراجعة عقارات"
                              : member.adminRole === "support"
                              ? "مسؤول دعم وعملاء"
                              : "محرر محتوى وتسويق"}
                          </span>
                        </td>

                        {/* Permissions */}
                        <td className="p-4">
                          {member.adminRole === "superadmin" ||
                          member.adminPermissions?.includes("all") ? (
                            <span className="text-[11px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                              كامل الصلاحيات (Full Access)
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {member.adminPermissions?.map((perm) => (
                                <span
                                  key={perm}
                                  className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 font-mono"
                                >
                                  {perm}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              member.isSuspended
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {member.isSuspended ? "موقوف ⛔" : "نشط ومفعل ✅"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Permissions */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStaff(member);
                                setEditRole(member.adminRole || "moderator");
                                setEditPermissions(member.adminPermissions || []);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="تعديل الصلاحيات والرتبة"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password */}
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordModalStaff(member);
                                setNewStaffPassword("");
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition"
                              title="إعادة تعيين كلمة مرور الموظف"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Suspend / Activate */}
                            {!isOwner && (
                              <button
                                type="button"
                                onClick={() => handleToggleStaffSuspension(member)}
                                className={`p-1.5 rounded-lg transition ${
                                  member.isSuspended
                                    ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                                    : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
                                }`}
                                title={member.isSuspended ? "تفعيل الموظف" : "تجميد الموظف"}
                              >
                                {member.isSuspended ? (
                                  <UserCheck className="w-3.5 h-3.5" />
                                ) : (
                                  <UserX className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Revoke */}
                            {!isOwner && (
                              <button
                                type="button"
                                onClick={() => handleRevokeStaff(member)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                title="إلغاء الصلاحية الإدارية"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Add New Staff Member */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <UserPlus className="w-5 h-5" />
                <span>إضافة موظف إدارة جديد</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم الموظف *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد عبد الله"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    البريد الإلكتروني *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ahmed@aqarpulse.eg"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="01012345678"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  كلمة المرور الأولية للحساب *
                </label>
                <input
                  type="password"
                  required
                  placeholder="8 أحرف على الأقل"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الرتبة والمسؤولية الإدارية *
                </label>
                <select
                  value={addForm.adminRole}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      adminRole: e.target.value as any,
                      adminPermissions:
                        e.target.value === "superadmin"
                          ? ["all"]
                          : e.target.value === "moderator"
                          ? ["properties.review"]
                          : e.target.value === "support"
                          ? ["inquiries.reply", "reports.resolve"]
                          : ["cms.edit"],
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="moderator">مشرف مراجعة عقارات (Property Moderator)</option>
                  <option value="support">مسؤول دعم واستفسارات (Customer Support)</option>
                  <option value="editor">مشرف محتوى وتسويق (CMS Editor)</option>
                  <option value="superadmin">مدير عام كامل الصلاحيات (Super Admin)</option>
                </select>
              </div>

              {/* Granular Permissions Checkboxes */}
              {addForm.adminRole !== "superadmin" && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="block text-xs font-bold text-slate-300">
                    تخصيص الصلاحيات الممنوحة للموظف:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {ALL_AVAILABLE_PERMISSIONS.map((perm) => (
                      <label
                        key={perm.key}
                        className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={addForm.adminPermissions.includes(perm.key)}
                          onChange={() =>
                            togglePermission(perm.key, addForm.adminPermissions, (perms) =>
                              setAddForm({ ...addForm, adminPermissions: perms })
                            )
                          }
                          className="rounded text-amber-500"
                        />
                        <span className="text-[11px] text-slate-300 leading-tight">
                          {perm.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>حفظ وإنشاء حساب الموظف</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Permissions Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span>تعديل صلاحيات ({editingStaff.name})</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الرتبة الإدارية
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="moderator">مشرف مراجعة عقارات (Property Moderator)</option>
                  <option value="support">مسؤول دعم واستفسارات (Customer Support)</option>
                  <option value="editor">مشرف محتوى وتسويق (CMS Editor)</option>
                  <option value="superadmin">مدير عام كامل الصلاحيات (Super Admin)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  الصلاحيات المحددة:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {ALL_AVAILABLE_PERMISSIONS.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={
                          editRole === "superadmin" || editPermissions.includes(perm.key)
                        }
                        disabled={editRole === "superadmin"}
                        onChange={() =>
                          togglePermission(perm.key, editPermissions, setEditPermissions)
                        }
                        className="rounded text-amber-500"
                      />
                      <span className="text-[11px] text-slate-300 leading-tight">
                        {perm.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>حفظ التعديلات</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Staff Password Modal */}
      {passwordModalStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                <span>إعادة تعيين كلمة مرور الموظف</span>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalStaff(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetStaffPassword} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                أدخل كلمة المرور الجديدة للموظف (<strong>{passwordModalStaff.name}</strong>). سيتم تحديثها فوراً وتطبيقها لحسابه.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  كلمة المرور الجديدة *
                </label>
                <input
                  type="password"
                  required
                  placeholder="8 أحرف على الأقل"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPasswordModalStaff(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>حفظ كلمة المرور الجديدة</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Change My Own Password Modal */}
      {showMyPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                <span>تغيير كلمة مروري الإدارية</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMyPasswordModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangeMyPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  كلمة المرور الحالية (اختياري إن كنت مسجلاً كمدير عام)
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={myCurrentPassword}
                  onChange={(e) => setMyCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  كلمة المرور الجديدة المطلوبة *
                </label>
                <input
                  type="password"
                  required
                  placeholder="8 أحرف على الأقل"
                  value={myNewPassword}
                  onChange={(e) => setMyNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMyPasswordModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={myPasswordLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-2"
                >
                  {myPasswordLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>حفظ وتحديث كلمة المرور</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
