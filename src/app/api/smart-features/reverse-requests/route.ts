import { NextRequest, NextResponse } from "next/server";
import { smartFeaturesStore } from "@/lib/db/smartFeaturesStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get("cityId");
    let requests = smartFeaturesStore.getReverseRequests();

    if (cityId) {
      requests = requests.filter((r) => r.cityId === cityId);
    }

    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      districtNameAr,
      cityId,
      districtId,
      category,
      transactionType,
      minBudget,
      maxBudget,
      minArea,
      maxArea,
      bedrooms,
      notes,
      userName,
      userPhone,
    } = body;

    if (!title || !minBudget || !maxBudget || !userName || !userPhone) {
      return NextResponse.json(
        { success: false, error: "جميع الحقول الإلزامية مطلوبة (العنوان، الميزانية، بيانات التواصل)" },
        { status: 400 }
      );
    }

    const created = smartFeaturesStore.addReverseRequest({
      userId: `usr-${Date.now()}`,
      userName,
      userPhone,
      title,
      cityId: cityId || "cairo",
      districtId: districtId || "new-cairo",
      districtNameAr: districtNameAr || "التجمع الخامس",
      category: category || "apartment",
      transactionType: transactionType || "sale",
      minBudget: Number(minBudget),
      maxBudget: Number(maxBudget),
      minArea: Number(minArea || 100),
      maxArea: maxArea ? Number(maxArea) : undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      notes: notes || "",
      urgency: "flexible",
    });

    return NextResponse.json({
      success: true,
      message: "تم نشر طلبك العقاري بنجاح! سيتنافس الوسطاء والملاك لتقديم العروض المناسبة.",
      request: created,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
