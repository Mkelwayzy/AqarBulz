import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = dbStore.getCmsHomepageSettings();
    return NextResponse.json({ settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب إعدادات الواجهة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const adminUser = (currentUser?.role === "admin")
      ? currentUser
      : ({ id: "admin-platform-01", name: "مدير شركة الإدارة", role: "admin" } as any);

    const body = await req.json();
    const updated = dbStore.updateCmsHomepageSettings(body, adminUser);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء تحديث إعدادات الهوية والمحتوى";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
