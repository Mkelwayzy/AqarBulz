"use client";

import React, { useState, useEffect } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { User, Property } from "@/lib/db/types";
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Shield,
  Briefcase,
  Home,
  UserX,
  UserCheck,
  AlertTriangle,
  History,
  Building2,
  Loader2,
  Eye,
  X,
  Phone,
  Mail,
} from "lucide-react";

interface AdvertiserUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  isVerified: boolean;
  phoneVerified?: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  companyName?: string;
  commercialRegistrationNo?: string;
  propertiesCount: number;
  publishedCount: number;
  pendingReviewCount: number;
  rejectedCount: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdvertiserUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Detail Modal
  const [selectedUser, setSelectedUser] = useState<AdvertiserUser | null>(null);
  const [userProperties, setUserProperties] = useState<Property[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Suspension Modal
  const [suspensionModal, setSuspensionModal] = useState<{
    user: AdvertiserUser;
    isSuspending: boolean;
  } | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const viewUserHistory = async (user: AdvertiserUser) => {
    setSelectedUser(user);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      const data = await res.json();
      if (data.properties) {
        setUserProperties(data.properties);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleConfirmSuspension = async () => {
    if (!suspensionModal) return;
    const { user, isSuspending } = suspensionModal;

    if (isSuspending && !suspensionReason.trim()) {
      alert("سبب تعليق الحساب إلزامي لتوثيق الإجراء في سجل التدقيق");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isSuspended: isSuspending,
          reason: isSuspending ? suspensionReason.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  isSuspended: isSuspending,
                  suspensionReason: isSuspending ? suspensionReason.trim() : undefined,
                }
              : u
          )
        );
        if (selectedUser && selectedUser.id === user.id) {
          setSelectedUser({
            ...selectedUser,
            isSuspended: isSuspending,
            suspensionReason: isSuspending ? suspensionReason.trim() : undefined,
          });
        }
        setSuspensionModal(null);
        setSuspensionReason("");
      } else {
        alert(data.error || "فشلت العملية");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء تعديل حالة المستخدم");
    } finally {
      setActionLoading(false);
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">مشرف نظام</span>;
      case "broker":
        return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">وسيط معتمد</span>;
      case "owner":
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">مالك عقار</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">مشتري / باحث</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminNav />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-brand-700" />
              <span>إدارة المعلنين والوسطاء والحسابات</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              متابعة أنشطة أصحاب العقارات، توثيق الحسابات، وتعليق الحسابات المخالفة
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-sm w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، البريد، أو الهاتف..."
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
            >
              بحث
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">نوع الحساب (الدور)</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
            >
              <option value="all">جميع الأدوار</option>
              <option value="owner">أصحاب العقارات (Owner)</option>
              <option value="broker">الوسطاء العقاريون (Broker)</option>
              <option value="admin">مشرفو المنصة (Admin)</option>
              <option value="buyer">المشترون والباحثون</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">حالة الحساب</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
            >
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="suspended">معلق</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">جاري تحميل قائمة المستخدمين...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <p className="font-bold text-slate-700 text-sm">لا يوجد مستخدمون مطابقون لمعايير البحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">المستخدم</th>
                  <th className="p-4">الدور والصفة</th>
                  <th className="p-4">إحصائيات العقارات</th>
                  <th className="p-4">حالة الحساب</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* User Info */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {u.isVerified && (
                            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                          <span>{u.email || "بدون بريد (موثق بالهاتف)"}</span>
                          {u.phone && <span className="text-slate-600 font-bold">• {u.phone}</span>}
                        </div>
                        {u.companyName && (
                          <div className="text-[10px] text-slate-500 font-bold">
                            شركة: {u.companyName}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-4 whitespace-nowrap">{roleBadge(u.role)}</td>

                    {/* Stats */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-slate-900 font-bold">
                        إجمالي: {u.propertiesCount} إعلان
                      </div>
                      <div className="text-[11px] text-slate-400 space-x-1 space-x-reverse">
                        <span className="text-emerald-600 font-bold">{u.publishedCount} منشور</span>
                        <span>•</span>
                        <span className="text-amber-600">{u.pendingReviewCount} معلق</span>
                        <span>•</span>
                        <span className="text-rose-600">{u.rejectedCount} مرفوض</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4 whitespace-nowrap">
                      {u.isSuspended ? (
                        <div className="space-y-0.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black">
                            معلق
                          </span>
                          {u.suspensionReason && (
                            <p className="text-[10px] text-rose-700 max-w-xs truncate">
                              السبب: {u.suspensionReason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          نشط
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => viewUserHistory(u)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="عرض ملف المعلن وعقاراته"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Suspension Toggle */}
                        {u.isSuspended ? (
                          <button
                            onClick={() => setSuspensionModal({ user: u, isSuspending: false })}
                            className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors"
                            title="إعادة تفعيل الحساب"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuspensionModal({ user: u, isSuspending: true })}
                            className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors"
                            title="تعليق الحساب"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Advertiser Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>ملف المعلن: {selectedUser.name}</span>
                  {roleBadge(selectedUser.role)}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedUser.email ? `${selectedUser.email} • ` : ""}{selectedUser.phone || "بدون هاتف"}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">حالة التوثيق</span>
                <span className="font-bold text-slate-800">
                  {selectedUser.isVerified ? "موثق رسمياً" : "غير موثق"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">تاريخ الانضمام</span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedUser.createdAt).toLocaleDateString("ar-EG")}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">الحالة الحالية</span>
                <span className={`font-bold ${selectedUser.isSuspended ? "text-rose-600" : "text-emerald-600"}`}>
                  {selectedUser.isSuspended ? "حساب معلق" : "حساب نشط"}
                </span>
              </div>
            </div>

            {/* Listing History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>سجل إعلانات المعلن ({userProperties.length})</span>
              </h4>

              {loadingDetails ? (
                <div className="p-6 text-center text-xs text-slate-400">جاري جلب إعلانات المستخدم...</div>
              ) : userProperties.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  لم يقم هذا المستخدم بإنشاء أي إعلانات حتى الآن.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {userProperties.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{p.title}</span>
                        <span className="text-[11px] text-slate-400">
                          {p.price.toLocaleString("ar-EG")} ج.م • {p.addressDetails}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200">
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspension Confirmation Modal */}
      {suspensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                {suspensionModal.isSuspending ? (
                  <UserX className="w-5 h-5 text-rose-600" />
                ) : (
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                )}
                <span>
                  {suspensionModal.isSuspending ? "تعليق حساب المعلن" : "إعادة تفعيل حساب المعلن"}
                </span>
              </h3>
              <button
                onClick={() => setSuspensionModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              المستخدم: <strong className="text-slate-900">{suspensionModal.user.name}</strong> ({suspensionModal.user.email})
            </p>

            {suspensionModal.isSuspending ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  سبب تعليق الحساب الإلزامي (سيتم تسجيله بسجل التدقيق):
                </label>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  rows={3}
                  placeholder="مثال: تكرار نشر إعلانات مضللة أو وهمية مخالفة لشروط الاستخدام..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            ) : (
              <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                سيتم رفع التعليق والسماح للمعلن بتسجيل الدخول وإدارة إعلاناته كالمعتاد.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSuspensionModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                disabled={actionLoading || (suspensionModal.isSuspending && !suspensionReason.trim())}
                onClick={handleConfirmSuspension}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-colors disabled:opacity-50 ${
                  suspensionModal.isSuspending
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {suspensionModal.isSuspending ? "تأكيد التعليق" : "تأكيد التفعيل"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
