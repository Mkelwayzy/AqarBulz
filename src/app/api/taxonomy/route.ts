import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET() {
  try {
    const cities = dbStore.getCities();
    const districts = dbStore.getDistricts();

    return NextResponse.json({ cities, districts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ في جلب بيانات المناطق";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
