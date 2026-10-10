import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const targetUser = dbStore.findUserById(params.id);
    if (!targetUser) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const properties = dbStore.getPropertiesByAdvertiser(params.id);

    return NextResponse.json({
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
        isVerified: targetUser.isVerified,
        isSuspended: !!targetUser.isSuspended,
        suspensionReason: targetUser.suspensionReason,
        companyName: targetUser.companyName,
        commercialRegistrationNo: targetUser.commercialRegistrationNo,
        createdAt: targetUser.createdAt,
      },
      properties,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب بيانات المستخدم";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const body = await req.json();
    const { isSuspended, reason, role: newRole, roleReason } = body;

    let updatedUser = null;

    if (newRole) {
      if (!["seeker", "buyer", "owner", "broker", "admin"].includes(newRole)) {
        return NextResponse.json({ error: "الدور المختار غير صالح" }, { status: 400 });
      }
      if (!roleReason || !roleReason.trim()) {
        return NextResponse.json({ error: "سبب تغيير الدور إلزامي للتدقيق الإداري والأمني" }, { status: 400 });
      }
      updatedUser = dbStore.changeUserRole(params.id, newRole, user, roleReason);
    }

    if (typeof isSuspended === "boolean") {
      updatedUser = dbStore.suspendUser(params.id, isSuspended, user, reason);
    }

    if (!updatedUser) {
      return NextResponse.json({ error: "لم يتم تحديد أي إجراء لتحديث المستخدم" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isSuspended: !!updatedUser.isSuspended,
        suspensionReason: updatedUser.suspensionReason,
      },
      message: "تم تحديث بيانات وحالة المستخدم بنجاح",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء تحديث حالة المستخدم";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
