import assert from "node:assert/strict";
import { test } from "node:test";
import type { User } from "@/lib/db/types";
import {
  canGrantAdminPermissions,
  getPublishingCategory,
  hasAdminPermission,
} from "./admin-permissions";

const staff: User = {
  id: "staff-1",
  name: "موظف",
  email: "staff@example.com",
  phone: "",
  role: "admin",
  isVerified: true,
  isStaff: true,
  adminRole: "moderator",
  adminPermissions: ["projects.review", "staff.manage"],
  createdAt: new Date(0).toISOString(),
};

test("admin permissions enforce explicit staff grants and prevent privilege escalation", () => {
  assert.equal(hasAdminPermission(staff, "projects.review"), true);
  assert.equal(hasAdminPermission(staff, "cms.edit"), false);
  assert.equal(canGrantAdminPermissions(staff, ["projects.review"]), true);
  assert.equal(canGrantAdminPermissions(staff, ["cms.edit"]), false);
});

test("unrestricted administrators retain full access and can delegate permissions", () => {
  const root: User = {
    ...staff,
    email: "mkelwayzy@gmail.com",
    adminPermissions: [],
  };
  assert.equal(hasAdminPermission(root, "cms.edit"), true);
  assert.equal(canGrantAdminPermissions(root, ["cms.edit", "projects.delete"]), true);
});

test("publishing classification changes only after an approved listing exists", () => {
  assert.equal(getPublishingCategory(0), "visitor");
  assert.equal(getPublishingCategory(1), "publisher");
});
