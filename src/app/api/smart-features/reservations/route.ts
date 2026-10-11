import { NextRequest, NextResponse } from "next/server";
import { smartFeaturesStore } from "@/lib/db/smartFeaturesStore";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const config = smartFeaturesStore.getConfig();
    if (!config.features.instantDigitalReservation) {
      return NextResponse.json(
        { success: false, error: "خدمة الحجز الفوري معطلة حالياً" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (code) {
      const item = smartFeaturesStore.getReservationByCode(code);
      if (!item) {
        return NextResponse.json({ success: false, error: "رمز الحجز غير موجود" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: item });
    }

    const user = await getCurrentUser();
    const list = smartFeaturesStore.getReservations(user?.id);
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("GET /api/smart-features/reservations error:", error);
    return NextResponse.json({ success: false, error: "فشل استرجاع الحجوزات" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const config = smartFeaturesStore.getConfig();
    if (!config.features.instantDigitalReservation) {
      return NextResponse.json(
        { success: false, error: "خدمة الحجز الفوري معطلة حالياً" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { propertyId, propertyTitle, propertyPrice, buyerName, buyerPhone, buyerNationalId, notes } = body;

    if (!propertyId || !propertyTitle || !propertyPrice || !buyerName || !buyerPhone) {
      return NextResponse.json(
        { success: false, error: "جميع بيانات الحجز ومقدم الطلب إلزامية" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const reservationCommitment = config.benchmarkParams?.reservationCommitmentEgp || 25000;

    const created = smartFeaturesStore.createReservation({
      propertyId,
      propertyTitle,
      propertyPrice: Number(propertyPrice),
      userId: user?.id,
      buyerName,
      buyerPhone,
      buyerNationalId: buyerNationalId || "",
      frozenPriceEgp: Number(propertyPrice),
      reservationFeeEgp: reservationCommitment,
      notes: notes || "حجز مبدئي رقمي وتجميد السعر وفقاً للضوابط العقارية الرسمية.",
    });

    return NextResponse.json({
      success: true,
      message: "تم إصدار إيصال الحجز وتجميد سعر الوحدة بنجاح لمدة 48 ساعة",
      data: created,
    });
  } catch (error) {
    console.error("POST /api/smart-features/reservations error:", error);
    return NextResponse.json({ success: false, error: "فشل إنشاء طلب الحجز" }, { status: 500 });
  }
}
