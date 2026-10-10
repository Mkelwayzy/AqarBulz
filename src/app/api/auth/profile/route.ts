import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { dbStore } from "@/lib/db/store";
import { isValidPhone } from "@/lib/auth/security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json({ user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNAUTHORIZED";
    const status = message === "ACCOUNT_SUSPENDED" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { name, phone, avatarUrl, whatsappEnabled, licenseNumber, companyName } = body;

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json(
        { error: "رقم الهاتف غير صالح، يرجى كتابة رقم صحيح" },
        { status: 400 }
      );
    }

    const updatedUser = dbStore.updateUserProfile(user.id, {
      name: typeof name === "string" ? name.trim() : undefined,
      phone: typeof phone === "string" ? phone.trim() : undefined,
      avatarUrl: typeof avatarUrl === "string" ? avatarUrl.trim() : undefined,
      whatsappEnabled: typeof whatsappEnabled === "boolean" ? whatsappEnabled : undefined,
      licenseNumber: typeof licenseNumber === "string" ? licenseNumber.trim() : undefined,
      companyName: typeof companyName === "string" ? companyName.trim() : undefined,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء تحديث الملف الشخصي";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
