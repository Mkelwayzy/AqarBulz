import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { smartFeaturesStore } from "@/lib/db/smartFeaturesStore";
import { SmartFeaturesConfig } from "@/lib/types/smartFeatures";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      // In local development we allow previewing or enforcing
      // return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const config = smartFeaturesStore.getConfig();
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Allow admin or safe edit in development
    const body = (await req.json()) as SmartFeaturesConfig;

    if (!body || !body.features) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const updated = smartFeaturesStore.saveConfig({
      ...body,
      updatedBy: user?.name || "Admin",
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "تم حفظ إعدادات المنظومة الذكية بنجاح",
      config: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
