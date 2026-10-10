import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ favorites: [] });
    }

    const favorites = dbStore.getUserFavorites(user.id);
    return NextResponse.json({ favorites });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب المفضلة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول لإضافة العقار إلى المفضلة" }, { status: 401 });
    }

    const { propertyId } = await req.json();
    if (!propertyId) {
      return NextResponse.json({ error: "معرف العقار مطلوب" }, { status: 400 });
    }

    const isFavorited = dbStore.toggleFavorite(user.id, propertyId);
    return NextResponse.json({ success: true, isFavorited });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ في تعديل المفضلة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
