import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/utils/supabase/server";
import { normalizeEmail, normalizeEgyptianPhone } from "@/lib/auth/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim();
    const role = searchParams.get("role");
    const status = searchParams.get("status"); // "active" | "suspended"
    const verified = searchParams.get("verified"); // "verified" | "unverified"

    const localUsers = dbStore.getAllUsersForAdmin();
    const allProps = dbStore.getAllPropertiesForAdmin();
    const allInquiries = dbStore.getAllInquiriesForAdmin();
    const allReports = dbStore.getPropertyReports();

    // Deduplicate and merge users across local store and Supabase profiles
    const userById = new Map<string, any>();
    const emailIndex = new Map<string, string>();
    const phoneIndex = new Map<string, string>();

    for (const u of localUsers) {
      userById.set(u.id, { ...u });
      const normEmail = u.email ? normalizeEmail(u.email) : null;
      const normPhone = u.phone ? normalizeEgyptianPhone(u.phone) : null;
      if (normEmail) emailIndex.set(normEmail, u.id);
      if (normPhone) phoneIndex.set(normPhone, u.id);
    }

    try {
      const supabaseAdmin = createAdminClient();
      const { data: cloudProfiles } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (cloudProfiles && cloudProfiles.length > 0) {
        for (const cp of cloudProfiles) {
          const normEmail = cp.email ? normalizeEmail(cp.email) : null;
          const normPhone = cp.phone ? normalizeEgyptianPhone(cp.phone) : null;
          const existingId =
            (userById.has(cp.id) ? cp.id : null) ||
            (normEmail ? emailIndex.get(normEmail) : null) ||
            (normPhone ? phoneIndex.get(normPhone) : null);

          if (existingId && userById.has(existingId)) {
            const curr = userById.get(existingId);
            userById.set(existingId, {
              ...curr,
              name: curr.name || cp.full_name || "مستخدم المنصة",
              email: curr.email || cp.email || "",
              phone: curr.phone || cp.phone || undefined,
              companyName: curr.companyName || cp.company_name || undefined,
              licenseNumber: curr.licenseNumber || cp.license_number || undefined,
              avatarUrl: curr.avatarUrl || cp.avatar_url || undefined,
              isVerified: curr.isVerified ?? !!cp.is_verified,
            });
          } else {
            const mapped = {
              id: cp.id,
              name: cp.full_name || "مستخدم المنصة",
              email: cp.email || "",
              phone: cp.phone || undefined,
              role: cp.role || "seeker",
              isVerified: !!cp.is_verified,
              isSuspended: false,
              companyName: cp.company_name || undefined,
              licenseNumber: cp.license_number || undefined,
              avatarUrl: cp.avatar_url || undefined,
              whatsappEnabled: cp.whatsapp_opt_in ?? true,
              createdAt: cp.created_at || new Date().toISOString(),
            };
            userById.set(cp.id, mapped);
            if (normEmail) emailIndex.set(normEmail, cp.id);
            if (normPhone) phoneIndex.set(normPhone, cp.id);
          }
        }
      }
    } catch {}

    let filtered = Array.from(userById.values());

    if (role && role !== "all") {
      filtered = filtered.filter((u) => u.role === role);
    }

    if (status === "suspended") {
      filtered = filtered.filter((u) => !!u.isSuspended);
    } else if (status === "active") {
      filtered = filtered.filter((u) => !u.isSuspended);
    }

    if (verified === "verified") {
      filtered = filtered.filter((u) => !!u.isVerified);
    } else if (verified === "unverified") {
      filtered = filtered.filter((u) => !u.isVerified);
    }

    if (search) {
      filtered = filtered.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(search)) ||
          (u.email && u.email.toLowerCase().includes(search)) ||
          (u.phone && u.phone.includes(search)) ||
          (u.companyName && u.companyName.toLowerCase().includes(search)) ||
          (u.licenseNumber && u.licenseNumber.toLowerCase().includes(search))
      );
    }

    // Attach real linked counts for properties, inquiries/conversations, messages, and reports
    const usersWithStats = filtered.map((u) => {
      const userProps = allProps.filter((p) => p.advertiserId === u.id);
      const userPropIds = new Set(userProps.map((p) => p.id));

      const inquiriesSent = allInquiries.filter(
        (i) =>
          i.seekerId === u.id ||
          (u.phone && i.seekerPhone && normalizeEgyptianPhone(i.seekerPhone) === normalizeEgyptianPhone(u.phone))
      );
      const inquiriesReceived = allInquiries.filter(
        (i) => i.advertiserId === u.id || userPropIds.has(i.propertyId)
      );

      // Deduplicate inquiries where user is involved to count total messages
      const involvedInquiries = new Map<string, any>();
      for (const i of inquiriesSent) involvedInquiries.set(i.id, i);
      for (const i of inquiriesReceived) involvedInquiries.set(i.id, i);

      let messagesCount = 0;
      for (const inq of Array.from(involvedInquiries.values())) {
        messagesCount += Array.isArray(inq.messages) ? inq.messages.length : 1;
      }

      const reportsFiledCount = allReports.filter((r) => r.reporterId === u.id).length;
      const reportsAgainstCount = allReports.filter((r) => userPropIds.has(r.propertyId)).length;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isVerified: !!u.isVerified,
        isSuspended: !!u.isSuspended,
        suspensionReason: u.suspensionReason,
        companyName: u.companyName,
        licenseNumber: u.licenseNumber,
        commercialRegistrationNo: u.commercialRegistrationNo,
        nationalId: u.nationalId,
        avatarUrl: u.avatarUrl,
        whatsappEnabled: u.whatsappEnabled ?? true,
        propertiesCount: userProps.length,
        publishedCount: userProps.filter((p) => p.status === "published" || p.status === ("active" as any)).length,
        pendingReviewCount: userProps.filter((p) => p.status === "pending_review").length,
        rejectedCount: userProps.filter((p) => p.status === "rejected").length,
        inquiriesSentCount: inquiriesSent.length,
        inquiriesReceivedCount: inquiriesReceived.length,
        totalConversationsCount: involvedInquiries.size,
        messagesCount,
        reportsFiledCount,
        reportsAgainstCount,
        createdAt: u.createdAt,
      };
    });

    return NextResponse.json({ users: usersWithStats });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب قائمة المستخدمين";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
