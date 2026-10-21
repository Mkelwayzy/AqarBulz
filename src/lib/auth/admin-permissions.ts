import type { User } from "@/lib/db/types";

export const ADMIN_PERMISSION_IDS = [
  "projects.review",
  "projects.delete",
  "messages.read",
  "cms.edit",
  "support.manage",
  "ratings.manage",
  "staff.manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_IDS)[number];

const ROOT_ADMIN_EMAIL = "mkelwayzy@gmail.com";

export function hasUnrestrictedAdminAccess(user: User | null | undefined): boolean {
  if (!user || user.role !== "admin") return false;
  return (
    user.email?.trim().toLowerCase() === ROOT_ADMIN_EMAIL ||
    !user.isStaff ||
    user.adminRole === "superadmin" ||
    Boolean(user.adminPermissions?.includes("all"))
  );
}

export function hasAdminPermission(
  user: User | null | undefined,
  permission: AdminPermission
): boolean {
  if (!user || user.role !== "admin") return false;
  return hasUnrestrictedAdminAccess(user) || Boolean(user.adminPermissions?.includes(permission));
}

export function canGrantAdminPermissions(
  actor: User,
  permissions: readonly string[]
): boolean {
  if (hasUnrestrictedAdminAccess(actor)) return true;
  return permissions.every(
    (permission) =>
      ADMIN_PERMISSION_IDS.includes(permission as AdminPermission) &&
      hasAdminPermission(actor, permission as AdminPermission)
  );
}

export function getPublishingCategory(publishedCount: number): "visitor" | "publisher" {
  return publishedCount > 0 ? "publisher" : "visitor";
}
