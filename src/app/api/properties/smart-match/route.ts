import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const matches = dbStore.findSmartMatchesForCriteria({
      transactionType: body.transactionType,
      preferredDistrictId: body.preferredDistrictId,
      maxBudget: body.maxBudget ? Number(body.maxBudget) : undefined,
      minArea: body.minArea ? Number(body.minArea) : undefined,
      requiredBedrooms: body.requiredBedrooms ? Number(body.requiredBedrooms) : undefined,
      category: body.category,
    });

    return NextResponse.json({ matches });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء حساب التوافق الذكي";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
