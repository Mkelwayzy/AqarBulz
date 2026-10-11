import { NextRequest, NextResponse } from "next/server";
import { smartFeaturesStore } from "@/lib/db/smartFeaturesStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const config = smartFeaturesStore.getConfig();
    if (!config.features.communityLivabilityGuide) {
      return NextResponse.json(
        { success: false, error: "دليل الأحياء وجودة الحياة معطل حالياً" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const item = smartFeaturesStore.getNeighborhoodBySlug(slug);
      if (!item) {
        return NextResponse.json(
          { success: false, error: "الحي المطلوب غير موجود" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: item });
    }

    const list = smartFeaturesStore.getNeighborhoods();
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("GET /api/smart-features/neighborhoods error:", error);
    return NextResponse.json({ success: false, error: "فشل استرجاع بيانات الأحياء" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const config = smartFeaturesStore.getConfig();
    if (!config.features.communityLivabilityGuide) {
      return NextResponse.json(
        { success: false, error: "دليل الأحياء وجودة الحياة معطل حالياً" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { slug, residentName, yearsOfResidency, rating, comment } = body;

    if (!slug || !residentName || !rating || !comment) {
      return NextResponse.json(
        { success: false, error: "جميع بيانات التقييم واسم المقيم مطلوبة" },
        { status: 400 }
      );
    }

    const ok = smartFeaturesStore.addNeighborhoodReview(slug, {
      residentName,
      yearsOfResidency: Number(yearsOfResidency) || 1,
      rating: Math.min(5, Math.max(1, Number(rating))),
      comment,
    });

    if (!ok) {
      return NextResponse.json({ success: false, error: "الحي غير موجود" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "تم تسجيل تقييمك الحقيقي للحي بنجاح، شكراً لمشاركتك مجتمع نبض العقار!",
    });
  } catch (error) {
    console.error("POST /api/smart-features/neighborhoods error:", error);
    return NextResponse.json({ success: false, error: "فشل إضافة تقييم الحي" }, { status: 500 });
  }
}
