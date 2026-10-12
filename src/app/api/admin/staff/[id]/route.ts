import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { dbStore } from "@/lib/db/store";
import { hashPassword } from "@/lib/auth/security";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول أولاً" }, { status: 401 });
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية الإدارة العليا" }, { status: 403 });
    }

    const targetStaffId = params.id;
    const body = await req.json();
    const {
      adminRole,
      adminPermissions,
      isSuspended,
      newPassword,
      name,
      phone,
    } = body;

    const supabase = createSupabaseServerClient();

    // 1. Fetch current profile
    const { data: targetProfile, error: fetchErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", targetStaffId)
      .single();

    if (fetchErr || !targetProfile) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
    }

    // Protection: Prevent suspending the primary owner
    if (targetProfile.email === "mkelwayzy@gmail.com" && isSuspended === true) {
      return NextResponse.json(
        { error: "لا يمكن تعليق أو تعطيل حساب مالك المنصة الرئيسي" },
        { status: 400 }
      );
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (adminRole !== undefined) updates.admin_role = adminRole;
    if (adminPermissions !== undefined) updates.admin_permissions = adminPermissions;
    if (isSuspended !== undefined) updates.is_suspended = isSuspended;
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();

    // 2. Update profile
    const { error: updateErr } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", targetStaffId);

    if (updateErr) {
      return NextResponse.json({ error: "فشل تحديث بيانات الموظف في قاعدة البيانات" }, { status: 500 });
    }

    // 3. Password reset if requested
    if (newPassword && typeof newPassword === "string" && newPassword.length >= 8) {
      await supabase.rpc("update_user_password_direct", {
        target_user_id: targetStaffId,
        new_password_text: newPassword,
      });

      const { hash, salt } = hashPassword(newPassword);
      dbStore.updateUserPassword(targetStaffId, hash, salt);

      dbStore.recordAuditEvent(currentUser.id, "STAFF_PASSWORD_RESET", "admin", targetStaffId, {
        targetEmail: targetProfile.email,
        resetBy: currentUser.email,
      });
    }

    // 4. Update in local dbStore
    dbStore.recordAuditEvent(currentUser.id, "STAFF_MEMBER_UPDATED", "admin", targetStaffId, {
      targetEmail: targetProfile.email,
      updates,
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث بيانات وصلاحيات الموظف بنجاح",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء تعديل بيانات الموظف";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول أولاً" }, { status: 401 });
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية الإدارة العليا" }, { status: 403 });
    }

    const targetStaffId = params.id;
    const supabase = createSupabaseServerClient();

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", targetStaffId)
      .single();

    if (targetProfile?.email === "mkelwayzy@gmail.com") {
      return NextResponse.json(
        { error: "لا يمكن حذف أو إزالة صلاحية مالك المنصة الرئيسي" },
        { status: 400 }
      );
    }

    // Revoke staff privileges
    await supabase
      .from("profiles")
      .update({
        role: "seeker",
        admin_role: null,
        admin_permissions: [],
        is_staff: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetStaffId);

    dbStore.recordAuditEvent(currentUser.id, "STAFF_PRIVILEGES_REVOKED", "admin", targetStaffId, {
      revokedEmail: targetProfile?.email,
      revokedBy: currentUser.email,
    });

    return NextResponse.json({
      success: true,
      message: "تم إلغاء صلاحيات الموظف الإدارية بنجاح",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء إزالة الموظف";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
