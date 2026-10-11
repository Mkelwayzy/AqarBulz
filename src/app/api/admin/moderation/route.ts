import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { PropertyStatus } from "@/lib/db/types";
import { propertyService, mapSupabaseRowToProperty } from "@/lib/services/propertyService";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") as PropertyStatus | null;
    const propertyId = searchParams.get("propertyId");

    if (propertyId) {
      let prop = dbStore.getRawPropertyById(propertyId);
      if (!prop) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);
        if (isUuid) {
          try {
            const supabase = createSupabaseServerClient();
            const { data: cloudRow } = await supabase
              .from("properties")
              .select(`*, property_images (url, alt, is_main, sort_order)`)
              .eq("id", propertyId)
              .single();
            if (cloudRow) {
              prop = mapSupabaseRowToProperty(cloudRow);
            }
          } catch (e) {
            console.warn("Failed to fetch cloud property for moderation:", e);
          }
        }
      }
      if (!prop) {
        return NextResponse.json({ error: "العقار غير موجود" }, { status: 404 });
      }
      const duplicateWarning = dbStore.checkPotentialDuplicates(prop);
      const history = dbStore.getPropertyModerationHistory(propertyId);
      return NextResponse.json({ property: prop, duplicateWarning, history });
    }

    const allProps = await propertyService.getAllPropertiesForAdmin();
    let filtered = allProps;

    if (statusFilter) {
      filtered = allProps.filter((p) => p.status === statusFilter);
    } else {
      // By default return pending_review if no filter given
      filtered = allProps.filter((p) => p.status === "pending_review");
    }

    // Attach duplicate check results to items
    const propertiesWithAnalysis = filtered.map((p) => {
      const dup = dbStore.checkPotentialDuplicates(p);
      return {
        ...p,
        potentialDuplicate: dup.hasPotentialDuplicate ? dup : null,
      };
    });

    return NextResponse.json({ properties: propertiesWithAnalysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب قائمة المراجعة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const body = await req.json();
    const { propertyId, decision, reason } = body;

    if (!propertyId || !decision) {
      return NextResponse.json({ error: "معرف العقار والقرار مطلوبان" }, { status: 400 });
    }

    if (decision === "delete") {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);
      const supabase = createSupabaseServerClient();
      if (isUuid) {
        await supabase.from("properties").delete().eq("id", propertyId);
      }
      try {
        dbStore.deleteProperty(propertyId, user);
      } catch {}
      dbStore.recordAuditEvent(user.id, "ADMIN_DELETE_PROPERTY", "property", propertyId, { reason, adminEmail: user.email });
      return NextResponse.json({ success: true, message: "تم حذف المنشور من قبل الإدارة بنجاح" });
    }

    let targetStatus: PropertyStatus;
    switch (decision) {
      case "approve":
        targetStatus = "published";
        break;
      case "reject":
        if (!reason || !reason.trim()) {
          return NextResponse.json({ error: "سبب الرفض إلزامي" }, { status: 400 });
        }
        targetStatus = "rejected";
        break;
      case "suspend":
        if (!reason || !reason.trim()) {
          return NextResponse.json({ error: "سبب تعليق الإعلان إلزامي" }, { status: 400 });
        }
        targetStatus = "suspended";
        break;
      case "restore":
        targetStatus = "pending_review";
        break;
      default:
        return NextResponse.json({ error: "قرار مراجعة غير صالح" }, { status: 400 });
    }

    // Enforce separation of duties: Owner/broker cannot approve their own listing even if they have admin role
    let propAdvertiserId: string | null = null;
    const supabase = createSupabaseServerClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);

    if (isUuid) {
      const { data: cloudCheck } = await supabase
        .from("properties")
        .select("advertiser_id")
        .eq("id", propertyId)
        .single();
      if (cloudCheck) {
        propAdvertiserId = cloudCheck.advertiser_id;
      }
    } else {
      const localProp = dbStore.getRawPropertyById(propertyId);
      if (localProp) {
        propAdvertiserId = localProp.advertiserId;
      }
    }

    if (decision === "approve" && propAdvertiserId && (propAdvertiserId === user.id || (user.email === "tarek.broker@aqarpulse.eg" && propAdvertiserId === "a0000000-0000-0000-0000-000000000001"))) {
      return NextResponse.json({
        error: "غير مسموح للمعلن أو الوسيط باعتماد عقاره الخاص بنفسه لمنع تضارب المصالح (فصل المهام والصلاحيات)",
      }, { status: 403 });
    }

    let updatedCloudRecord: any = null;
    if (isUuid) {
      const { data: cloudUpdated, error: supaModErr } = await supabase
        .from("properties")
        .update({
          status: targetStatus,
          moderation_notes: reason || null,
          published_at: targetStatus === "published" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", propertyId)
        .select()
        .single();

      if (!supaModErr && cloudUpdated) {
        updatedCloudRecord = cloudUpdated;
      }
    }

    // Also update local store and audit trail
    let updatedLocalRecord = null;
    try {
      updatedLocalRecord = dbStore.updatePropertyStatus(propertyId, targetStatus, user, reason);
    } catch {
      // Local store may not have this cloud ID
    }

    // Record immutable audit event
    dbStore.recordAuditEvent(user.id, "ADMIN_MODERATION_DECISION", "property", propertyId, {
      decision,
      targetStatus,
      reason,
      adminEmail: user.email,
    });

    return NextResponse.json({
      success: true,
      property: updatedCloudRecord || updatedLocalRecord,
      source: updatedCloudRecord ? "supabase" : "local",
      message:
        decision === "approve"
          ? "تمت الموافقة على نشر العقار بنجاح"
          : decision === "reject"
          ? "تم رفض الإعلان وإشعار المعلن بالسبب"
          : decision === "suspend"
          ? "تم تعليق الإعلان بنجاح"
          : "تمت استعادة الإعلان إلى قائمة المراجعة",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء اتخاذ قرار المراجعة";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
