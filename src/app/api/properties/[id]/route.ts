import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { propertyService } from "@/lib/services/propertyService";
import { dbStore } from "@/lib/db/store";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const viewer = await getCurrentUser();
    const prop = await propertyService.getPublicPropertyBySlugOrId(params.id, viewer || undefined);

    if (!prop) {
      return NextResponse.json({ error: "العقار غير موجود أو غير متاح للعرض" }, { status: 404 });
    }

    return NextResponse.json({ property: prop });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب بيانات العقار";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول للتعديل" }, { status: 401 });
    }

    const updates = await req.json();
    const supabase = createSupabaseServerClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);

    // 1. Check ownership in Supabase
    let query = supabase.from("properties").select("id, advertiser_id, status");
    if (isUuid) {
      query = query.eq("id", params.id);
    } else {
      query = query.eq("slug", params.id);
    }
    const { data: cloudProp, error: fetchErr } = await query.single();

    if (cloudProp) {
      let isOwner = cloudProp.advertiser_id === user.id;
      if (!isOwner && user.email) {
        const { data: advUser } = await supabase.from("profiles").select("id").eq("email", user.email).single();
        if (advUser && advUser.id === cloudProp.advertiser_id) {
          isOwner = true;
        }
      }
      const isAdmin = user.role === "admin";

      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "غير مصرح لك بتعديل عقار يملكه مستخدم آخر" }, { status: 403 });
      }

      // Ordinary owner cannot force "published"
      let targetStatus = updates.status;
      if (!isAdmin && targetStatus === "published") {
        targetStatus = "pending_review";
      }



      // Update in Supabase
      const cloudUpdatePayload: any = {
        title: updates.title,
        description: updates.description,
        price: updates.price ? Number(updates.price) : undefined,
        area_sqm: updates.areaSqM ? Number(updates.areaSqM) : undefined,
        bedrooms: updates.bedrooms !== undefined ? Number(updates.bedrooms) : undefined,
        bathrooms: updates.bathrooms !== undefined ? Number(updates.bathrooms) : undefined,
        address_details: updates.addressDetails,
        updated_at: new Date().toISOString(),
      };
      if (targetStatus) {
        cloudUpdatePayload.status = targetStatus;
      }

      const { data: updatedCloud, error: updateErr } = await supabase
        .from("properties")
        .update(cloudUpdatePayload)
        .eq("id", cloudProp.id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: `فشل تحديث العقار سحابياً: ${updateErr.message}` }, { status: 500 });
      }

      // Also keep local store in sync if present
      try {
        dbStore.updateProperty(cloudProp.id, updates, user);
        if (targetStatus) {
          dbStore.updatePropertyStatus(cloudProp.id, targetStatus, user);
        }
      } catch {}

      return NextResponse.json({ success: true, property: updatedCloud, source: "supabase" });
    }

    // Fallback to local store if not found in cloud
    const localProp = dbStore.getRawPropertyById(params.id);
    if (!localProp) {
      return NextResponse.json({ error: "العقار غير موجود" }, { status: 404 });
    }
    if (localProp.advertiserId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح لك بتعديل عقار يملكه مستخدم آخر" }, { status: 403 });
    }

    const updated = dbStore.updateProperty(params.id, updates, user);
    if (updates.status) {
      try {
        dbStore.updatePropertyStatus(params.id, updates.status, user);
      } catch {}
    }
    return NextResponse.json({ success: true, property: updated, source: "local" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء تحديث العقار";
    const status = message.includes("غير مصرح") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const { status, reason } = body;

    if (!status) {
      return NextResponse.json({ error: "الحالة الجديدة مطلوبة" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);

    let query = supabase.from("properties").select("id, advertiser_id, status");
    if (isUuid) {
      query = query.eq("id", params.id);
    } else {
      query = query.eq("slug", params.id);
    }
    const { data: cloudProp } = await query.single();

    if (cloudProp) {
      let isOwner = cloudProp.advertiser_id === user.id;
      if (!isOwner && user.email) {
        const { data: advUser } = await supabase.from("profiles").select("id").eq("email", user.email).single();
        if (advUser && advUser.id === cloudProp.advertiser_id) {
          isOwner = true;
        }
      }
      const isAdmin = user.role === "admin";

      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "غير مصرح لك بتغيير حالة هذا العقار" }, { status: 403 });
      }

      // Ordinary owner cannot force "published"
      let newStatus = status;
      if (!isAdmin && newStatus === "published") {
        newStatus = "pending_review";
      }



      const { data: updatedCloud, error: patchErr } = await supabase
        .from("properties")
        .update({
          status: newStatus,
          moderation_notes: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cloudProp.id)
        .select()
        .single();

      if (patchErr) {
        return NextResponse.json({ error: `فشل تحديث حالة العقار سحابياً: ${patchErr.message}` }, { status: 500 });
      }

      // Also keep local store in sync
      try {
        dbStore.updatePropertyStatus(cloudProp.id, newStatus, user, reason);
      } catch {}

      return NextResponse.json({ success: true, property: updatedCloud, source: "supabase" });
    }

    const localProp = dbStore.getRawPropertyById(params.id);
    if (!localProp) {
      return NextResponse.json({ error: "العقار غير موجود" }, { status: 404 });
    }

    if (localProp.advertiserId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح لك بتغيير حالة هذا العقار" }, { status: 403 });
    }



    const updated = dbStore.updatePropertyStatus(params.id, status, user, reason);
    return NextResponse.json({ success: true, property: updated, source: "local" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء تغيير حالة العقار";
    const isPermissionError =
      message.includes("غير مصرح") ||
      message.includes("موافقة الإدارة") ||
      message.includes("مشرفي المنصة") ||
      message.includes("غير معتمد");
    const status = isPermissionError ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const supabase = createSupabaseServerClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);

    let query = supabase.from("properties").select("id, advertiser_id, status");
    if (isUuid) {
      query = query.eq("id", params.id);
    } else {
      query = query.eq("slug", params.id);
    }
    const { data: cloudProp } = await query.single();

    if (cloudProp) {
      let isOwner = cloudProp.advertiser_id === user.id;
      if (!isOwner && user.email) {
        const { data: advUser } = await supabase.from("profiles").select("id").eq("email", user.email).single();
        if (advUser && advUser.id === cloudProp.advertiser_id) {
          isOwner = true;
        }
      }
      const isAdmin = user.role === "admin";

      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "غير مصرح لك بحذف عقار لا تملكه" }, { status: 403 });
      }

      // Diagram rule: "يحق للمالك أو الوسيط حذف المشروع وهوا قيد المراجعة، إذا قُبل المشروع لا يحق له حذفه"
      if (cloudProp.status === "published" && !isAdmin) {
        return NextResponse.json(
          {
            error:
              "لا يمكن للمعلن حذف العقار بعد اعتماده ونشره من قبل الإدارة. يمكنك وسمه كـ (تم البيع / إيقاف العرض) أو تقديم طلب حذف رسمي للإدارة.",
          },
          { status: 403 }
        );
      }

      const { error: deleteErr } = await supabase
        .from("properties")
        .delete()
        .eq("id", cloudProp.id);

      if (deleteErr) {
        return NextResponse.json({ error: `فشل حذف العقار من السحابة: ${deleteErr.message}` }, { status: 500 });
      }

      try {
        dbStore.deleteProperty(cloudProp.id, user);
      } catch {}

      return NextResponse.json({ success: true, message: "تم حذف العقار بنجاح" });
    }

    const localProp = dbStore.getRawPropertyById(params.id);
    if (!localProp) {
      return NextResponse.json({ error: "العقار غير موجود" }, { status: 404 });
    }
    if (localProp.advertiserId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح لك بحذف عقار لا تملكه" }, { status: 403 });
    }
    dbStore.deleteProperty(params.id, user);
    return NextResponse.json({ success: true, message: "تم حذف العقار بنجاح" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء حذف العقار";
    const status = message.includes("غير مصرح") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
