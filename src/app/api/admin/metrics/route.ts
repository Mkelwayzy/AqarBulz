import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const stats = { ...dbStore.getAdminStats() };

    // Enrich with Supabase cloud counts if cloud has additional records
    try {
      const supabaseAdmin = createAdminClient();
      const [
        { count: cloudUsersCount },
        { count: cloudPropsCount },
        { count: cloudInquiriesCount },
        { count: cloudMessagesCount },
        { count: cloudReportsCount },
      ] = await Promise.all([
        supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("properties").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("inquiries").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("inquiry_messages").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("property_reports").select("*", { count: "exact", head: true }),
      ]);

      if (typeof cloudUsersCount === "number" && cloudUsersCount > stats.totalUsers) {
        stats.totalUsers = cloudUsersCount;
      }
      if (typeof cloudPropsCount === "number" && cloudPropsCount > stats.totalProperties) {
        stats.totalProperties = cloudPropsCount;
      }
      if (typeof cloudInquiriesCount === "number" && cloudInquiriesCount > stats.totalInquiries) {
        stats.totalInquiries = cloudInquiriesCount;
      }
      if (typeof cloudMessagesCount === "number" && cloudMessagesCount > stats.totalMessagesCount) {
        stats.totalMessagesCount = cloudMessagesCount;
      }
      if (typeof cloudReportsCount === "number" && cloudReportsCount > stats.totalReportsCount) {
        stats.totalReportsCount = cloudReportsCount;
      }
    } catch {}

    return NextResponse.json({ stats });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ في جلب إحصائيات الإدارة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
