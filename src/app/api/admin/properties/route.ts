import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { propertyService } from "@/lib/services/propertyService";

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
    const status = searchParams.get("status");
    const transactionType = searchParams.get("transactionType");
    const category = searchParams.get("category");
    const cityId = searchParams.get("cityId");
    const districtId = searchParams.get("districtId");
    const advertiserId = searchParams.get("advertiserId");
    const search = searchParams.get("search")?.toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

    let properties = await propertyService.getAllPropertiesForAdmin();
    const allUsers = dbStore.getAllUsersForAdmin();

    // Filters
    if (status && status !== "all") {
      properties = properties.filter((p) => p.status === status);
    }
    if (transactionType && transactionType !== "all") {
      properties = properties.filter((p) => p.transactionType === transactionType);
    }
    if (category && category !== "all") {
      properties = properties.filter((p) => p.category === category);
    }
    if (cityId && cityId !== "all") {
      properties = properties.filter((p) => p.cityId === cityId);
    }
    if (districtId && districtId !== "all") {
      properties = properties.filter((p) => p.districtId === districtId);
    }
    if (advertiserId && advertiserId !== "all") {
      properties = properties.filter((p) => p.advertiserId === advertiserId);
    }
    if (search) {
      properties = properties.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.addressDetails.toLowerCase().includes(search) ||
          p.id.toLowerCase().includes(search)
      );
    }

    const total = properties.length;
    const startIndex = (page - 1) * limit;
    const paginated = properties.slice(startIndex, startIndex + limit);

    // Enrich with advertiser and potential duplicate warnings
    const enriched = paginated.map((p) => {
      const adv = allUsers.find((u) => u.id === p.advertiserId);
      const dup = dbStore.checkPotentialDuplicates(p);
      return {
        ...p,
        advertiser: adv
          ? {
              id: adv.id,
              name: adv.name,
              email: adv.email,
              phone: adv.phone,
              role: adv.role,
              isVerified: adv.isVerified,
              isSuspended: adv.isSuspended,
            }
          : undefined,
        potentialDuplicate: dup.hasPotentialDuplicate ? dup : null,
      };
    });

    return NextResponse.json({
      properties: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب قائمة عقارات الإدارة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
