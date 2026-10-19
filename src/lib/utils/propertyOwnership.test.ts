import test from "node:test";
import assert from "node:assert/strict";
import { isPropertyOwnedByUser } from "./propertyOwnership";

test("property ownership detection recognizes advertiser, user, and owner IDs", () => {
  assert.equal(isPropertyOwnedByUser({ advertiserId: "user-1" }, "user-1"), true);
  assert.equal(isPropertyOwnedByUser({ advertiser: { id: "user-2" } }, "user-2"), true);
  assert.equal(isPropertyOwnedByUser({ userId: "user-3" }, "user-3"), true);
  assert.equal(isPropertyOwnedByUser({ ownerId: "user-4" }, "user-4"), true);
  assert.equal(isPropertyOwnedByUser({ advertiserId: "user-1" }, "user-2"), false);
  assert.equal(isPropertyOwnedByUser({ advertiserId: "user-1" }, null), false);
});
