import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";

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
    const search = searchParams.get("search")?.toLowerCase();
    const role = searchParams.get("role");
    const status = searchParams.get("status"); // "active" | "suspended"

    const allUsers = dbStore.getAllUsersForAdmin();
    const allProps = dbStore.getAllPropertiesForAdmin();

    let filtered = allUsers;

    if (role && role !== "all") {
      filtered = filtered.filter((u) => u.role === role);
    }

    if (status === "suspended") {
      filtered = filtered.filter((u) => !!u.isSuspended);
    } else if (status === "active") {
      filtered = filtered.filter((u) => !u.isSuspended);
    }

    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          (u.email && u.email.toLowerCase().includes(search)) ||
          (u.phone && u.phone.includes(search)) ||
          (u.companyName && u.companyName.toLowerCase().includes(search))
      );
    }

    // Attach property counts and sanitize user data
    const usersWithStats = filtered.map((u) => {
      const userProps = allProps.filter((p) => p.advertiserId === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isVerified: u.isVerified,
        isSuspended: !!u.isSuspended,
        suspensionReason: u.suspensionReason,
        companyName: u.companyName,
        commercialRegistrationNo: u.commercialRegistrationNo,
        propertiesCount: userProps.length,
        publishedCount: userProps.filter((p) => p.status === "published").length,
        pendingReviewCount: userProps.filter((p) => p.status === "pending_review").length,
        rejectedCount: userProps.filter((p) => p.status === "rejected").length,
        createdAt: u.createdAt,
      };
    });

    return NextResponse.json({ users: usersWithStats });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب قائمة المستخدمين";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
