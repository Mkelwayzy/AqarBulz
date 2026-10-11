import { NextResponse } from "next/server";
import { requireAuth, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { dbStore } from "@/lib/db/store";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { targetRole, companyName, licenseNumber, nationalId } = body;

    // Validation: Only owner and broker are allowed target roles
    if (targetRole !== "owner" && targetRole !== "broker") {
      return NextResponse.json(
        { error: "نوع الحساب المطلوب غير صالح. الخيارات المتاحة: مالك عقار أو وسيط عقاري." },
        { status: 400 }
      );
    }

    // Safety: Admin accounts should not be accidentally converted via this endpoint
    if (user.role === "admin") {
      return NextResponse.json(
        { error: "لا يمكن تعديل حساب مدير النظام عبر هذا النموذج" },
        { status: 403 }
      );
    }

    // 1. Upgrade user in local store
    const updatedUser = dbStore.upgradeUserRole(user.id, targetRole, {
      companyName: typeof companyName === "string" ? companyName.trim() : undefined,
      licenseNumber: typeof licenseNumber === "string" ? licenseNumber.trim() : undefined,
      nationalId: typeof nationalId === "string" ? nationalId.trim() : undefined,
    });

    // 2. Cloud synchronization with Supabase if active and valid UUID
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      if (isUuid) {
        const supabase = createSupabaseServerClient();
        await supabase
          .from("users")
          .update({
            role: targetRole,
            company_name: targetRole === "broker" && companyName ? companyName.trim() : null,
            license_number: targetRole === "broker" && licenseNumber ? licenseNumber.trim() : null,
          })
          .eq("id", user.id);
      }
    } catch (syncErr) {
      console.warn("[UpgradeRole] Supabase cloud sync notice:", syncErr);
    }

    // 3. Issue fresh session cookie with upgraded role payload
    const token = createSessionToken(updatedUser);
    const roleLabelAr = targetRole === "owner" ? "مالك عقار" : "وسيط عقاري معتمد";

    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      message: `تم تحويل حسابك بنجاح إلى (${roleLabelAr}). يمكنك الآن إضافة وإدارة العقارات والمشاريع فوراً.`,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء تحويل نوع الحساب";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
