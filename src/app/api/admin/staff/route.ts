import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { dbStore } from "@/lib/db/store";
import { hashPassword, normalizeEmail, normalizeEgyptianPhone, isValidEmail } from "@/lib/auth/security";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const supabase = createSupabaseServerClient();
    const { data: staffProfiles, error } = await supabase
      .from("profiles")
      .select("*")
      .or("role.eq.admin,is_staff.eq.true")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching staff profiles:", error);
      // Fallback to local store
      const localAdmins = dbStore.getAllUsersForAdmin().filter((u) => u.role === "admin");
      return NextResponse.json({ staff: localAdmins });
    }

    const staff = staffProfiles.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      role: p.role,
      adminRole: p.admin_role || (p.role === "admin" ? "superadmin" : "moderator"),
      adminPermissions: p.admin_permissions || ["all"],
      isStaff: Boolean(p.is_staff || p.role === "admin"),
      isSuspended: Boolean(p.is_suspended),
      createdAt: p.created_at,
    }));

    return NextResponse.json({ staff });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب قائمة الموظفين";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول أولاً" }, { status: 401 });
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية الإدارة العليا" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      email: rawEmail,
      phone: rawPhone,
      password,
      adminRole = "moderator",
      adminPermissions = ["properties.review"],
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "اسم الموظف مطلوب" }, { status: 400 });
    }

    if (!rawEmail || !isValidEmail(rawEmail)) {
      return NextResponse.json({ error: "بريد إلكتروني صالح للموظف مطلوب" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن لا تقل عن 8 أحرف" },
        { status: 400 }
      );
    }

    const email = normalizeEmail(rawEmail);
    const phone = rawPhone ? normalizeEgyptianPhone(rawPhone) : "+201000000000";

    const supabase = createSupabaseServerClient();

    // 1. Check if email already registered in profiles
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, email, role")
      .ilike("email", email)
      .maybeSingle();

    let targetUserId = existingProfile?.id;

    if (existingProfile) {
      // User exists -> upgrade them to staff & admin
      await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          phone,
          role: "admin",
          admin_role: adminRole,
          admin_permissions: adminPermissions,
          is_staff: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id);

      // Update password via direct RPC
      await supabase.rpc("update_user_password_direct", {
        target_user_id: existingProfile.id,
        new_password_text: password,
      });
    } else {
      // 2. Sign up / Create in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name.trim(),
            role: "admin",
            admin_role: adminRole,
            admin_permissions: adminPermissions,
          },
        },
      });

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: authError?.message || "فشل إنشاء حساب الموظف في نظام المصادقة" },
          { status: 400 }
        );
      }

      targetUserId = authData.user.id;

      // Ensure profile is marked as admin and staff
      await supabase
        .from("profiles")
        .upsert({
          id: targetUserId,
          name: name.trim(),
          email,
          phone,
          role: "admin",
          admin_role: adminRole,
          admin_permissions: adminPermissions,
          is_staff: true,
          is_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    // 3. Register in local dbStore
    const { hash, salt } = hashPassword(password);
    const staffUser = dbStore.ensureUser({
      id: targetUserId!,
      name: name.trim(),
      email,
      phone,
      role: "admin",
      adminRole,
      adminPermissions,
      isStaff: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
    });
    dbStore.updateUserPassword(targetUserId!, hash, salt);

    // 4. Record Audit Event
    dbStore.recordAuditEvent(currentUser.id, "STAFF_MEMBER_CREATED", "admin", targetUserId!, {
      createdStaffEmail: email,
      adminRole,
      permissionsCount: adminPermissions.length,
    });

    return NextResponse.json({
      success: true,
      message: `تم إضافة الموظف (${name.trim()}) بنجاح وتعيين صلاحياته`,
      staff: staffUser,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء إضافة الموظف";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
