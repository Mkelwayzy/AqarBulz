import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { isSupabaseDirect, mapSupabaseRowToProperty } from "@/lib/services/propertyService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ favorites: [] });
    }

    if (isSupabaseDirect()) {
      const supabase = createSupabaseServerClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      let userUuid = isUuid ? user.id : null;

      if (!userUuid && user.email) {
        const { data: dbProfile } = await supabase.from("profiles").select("id").eq("email", user.email).single();
        if (dbProfile?.id) userUuid = dbProfile.id;
      }

      if (userUuid) {
        const { data: favRows, error } = await supabase
          .from("favorites")
          .select(`
            property_id,
            created_at,
            properties (
              *,
              property_images (url, alt, is_main, sort_order)
            )
          `)
          .eq("user_id", userUuid);

        if (!error && Array.isArray(favRows)) {
          const favorites = favRows
            .filter((f) => f.properties)
            .map((f: any) => mapSupabaseRowToProperty(f.properties));
          return NextResponse.json({ favorites, source: "supabase" });
        }
      }
      return NextResponse.json({ favorites: [], source: "supabase" });
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

    if (isSupabaseDirect()) {
      const supabase = createSupabaseServerClient();
      const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      let userUuid = isUserUuid ? user.id : null;

      if (!userUuid && user.email) {
        const { data: dbProfile } = await supabase.from("profiles").select("id").eq("email", user.email).single();
        if (dbProfile?.id) userUuid = dbProfile.id;
      }

      const isPropUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);

      if (userUuid && isPropUuid) {
        const { data: existing } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", userUuid)
          .eq("property_id", propertyId)
          .maybeSingle();

        let isFavorited = false;
        if (existing) {
          await supabase.from("favorites").delete().eq("id", existing.id);
          isFavorited = false;
        } else {
          await supabase.from("favorites").insert({ user_id: userUuid, property_id: propertyId });
          isFavorited = true;
        }

        // Keep local mirror if present
        try {
          dbStore.toggleFavorite(user.id, propertyId);
        } catch {}

        return NextResponse.json({ success: true, isFavorited, source: "supabase" });
      }
    }

    const isFavorited = dbStore.toggleFavorite(user.id, propertyId);
    return NextResponse.json({ success: true, isFavorited, source: "local" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ في تعديل المفضلة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
