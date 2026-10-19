import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient, createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { normalizeEgyptianPhone } from "@/lib/auth/security";
import { hasAdminPermission } from "@/lib/auth/admin-permissions";

export const dynamic = "force-dynamic";

async function resolveTargetUser(userId: string) {
  let targetUser = dbStore.findUserById(userId);
  if (!targetUser) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (isUuid) {
        const supabaseAdmin = createAdminClient();
        const { data: cp } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (cp) {
          targetUser = dbStore.ensureUser({
            id: cp.id,
            name: cp.full_name || "مستخدم المنصة",
            email: cp.email || "",
            phone: cp.phone || "",
            role: cp.role || "seeker",
            isVerified: !!cp.is_verified,
            isSuspended: false,
            companyName: cp.company_name || undefined,
            licenseNumber: cp.license_number || undefined,
            avatarUrl: cp.avatar_url || undefined,
            whatsappEnabled: cp.whatsapp_opt_in ?? true,
            createdAt: cp.created_at || new Date().toISOString(),
          });
        }
      }
    } catch {}
  }
  return targetUser;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (!hasAdminPermission(user, "staff.manage")) {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const targetUser = await resolveTargetUser(params.id);
    if (!targetUser) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const properties = dbStore.getPropertiesByAdvertiser(params.id);
    const propIds = new Set(properties.map((p) => p.id));

    const allInquiries = dbStore.getAllInquiriesForAdmin();
    const inquiriesSent = allInquiries.filter(
      (i) =>
        i.seekerId === targetUser.id ||
        (targetUser.phone &&
          i.seekerPhone &&
          normalizeEgyptianPhone(i.seekerPhone) === normalizeEgyptianPhone(targetUser.phone))
    );
    const inquiriesReceived = allInquiries.filter(
      (i) => i.advertiserId === targetUser.id || propIds.has(i.propertyId)
    );

    const allReports = dbStore.getPropertyReports();
    const reports = allReports.filter(
      (r) => r.reporterId === targetUser.id || propIds.has(r.propertyId)
    );

    const auditLogs = dbStore
      .getAuditEvents()
      .filter((ev) => ev.entityId === targetUser.id || ev.userId === targetUser.id);

    return NextResponse.json({
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
        isVerified: !!targetUser.isVerified,
        isSuspended: !!targetUser.isSuspended,
        suspensionReason: targetUser.suspensionReason,
        companyName: targetUser.companyName,
        licenseNumber: targetUser.licenseNumber,
        commercialRegistrationNo: targetUser.commercialRegistrationNo,
        nationalId: targetUser.nationalId,
        bio: targetUser.bio,
        whatsappEnabled: targetUser.whatsappEnabled ?? true,
        createdAt: targetUser.createdAt,
      },
      properties,
      inquiriesSent,
      inquiriesReceived,
      reports,
      auditLogs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب بيانات المستخدم";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (!hasAdminPermission(user, "staff.manage")) {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    await resolveTargetUser(params.id);

    const body = await req.json();
    const {
      isSuspended,
      reason,
      role: newRole,
      roleReason,
      isVerified,
      verificationReason,
      name,
      phone,
      companyName,
      licenseNumber,
      bio,
    } = body;

    let updatedUser = null;

    if (
      name !== undefined ||
      phone !== undefined ||
      companyName !== undefined ||
      licenseNumber !== undefined ||
      bio !== undefined
    ) {
      updatedUser = dbStore.updateUserProfile(params.id, {
        name,
        phone,
        companyName,
        licenseNumber,
        bio,
      });
    }

    if (newRole) {
      if (!["seeker", "buyer", "owner", "broker", "admin"].includes(newRole)) {
        return NextResponse.json({ error: "الدور المختار غير صالح" }, { status: 400 });
      }
      if (!roleReason || !roleReason.trim()) {
        return NextResponse.json({ error: "سبب تغيير الدور إلزامي للتدقيق الإداري والأمني" }, { status: 400 });
      }
      updatedUser = dbStore.changeUserRole(params.id, newRole, user, roleReason);
    }

    if (typeof isVerified === "boolean") {
      updatedUser = dbStore.verifyBrokerOrUser(params.id, isVerified, user, verificationReason || reason);
    }

    if (typeof isSuspended === "boolean") {
      updatedUser = dbStore.suspendUser(params.id, isSuspended, user, reason);
    }

    if (!updatedUser) {
      return NextResponse.json({ error: "لم يتم تحديد أي إجراء لتحديث المستخدم" }, { status: 400 });
    }

    // Cloud synchronization if UUID exists
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
    if (isUuid) {
      try {
        const supabase = createSupabaseServerClient();
        const supaUpdatePayload: Record<string, unknown> = {};
        if (newRole) supaUpdatePayload.role = newRole;
        if (typeof isVerified === "boolean") supaUpdatePayload.is_verified = isVerified;
        if (name !== undefined) supaUpdatePayload.full_name = updatedUser.name;
        if (phone !== undefined) supaUpdatePayload.phone = updatedUser.phone;
        if (companyName !== undefined) supaUpdatePayload.company_name = updatedUser.companyName;
        if (licenseNumber !== undefined) supaUpdatePayload.license_number = updatedUser.licenseNumber;
        if (Object.keys(supaUpdatePayload).length > 0) {
          await supabase.from("profiles").update(supaUpdatePayload).eq("id", params.id);
        }
      } catch (e) {
        console.warn("[AdminUsers] Cloud sync notice:", e);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        isVerified: !!updatedUser.isVerified,
        isSuspended: !!updatedUser.isSuspended,
        suspensionReason: updatedUser.suspensionReason,
        companyName: updatedUser.companyName,
        licenseNumber: updatedUser.licenseNumber,
      },
      message: "تم تحديث بيانات وحالة المستخدم بنجاح",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء تحديث حالة المستخدم";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
