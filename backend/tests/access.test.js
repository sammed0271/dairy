import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTokenPayload,
  canAccessCentre,
  ensureCentreAccess,
  getScopedFilter,
  isSuperadmin,
} from "../utils/access.js";

test("isSuperadmin recognises superadmin requests", () => {
  assert.equal(isSuperadmin({ user: { role: "superadmin" } }), true);
  assert.equal(isSuperadmin({ user: { role: "admin" } }), false);
});

test("getScopedFilter keeps superadmin queries global", () => {
  const filter = getScopedFilter(
    { user: { role: "superadmin", centreId: "centre-a" } },
    { status: "active" },
  );

  assert.deepEqual(filter, { status: "active" });
});

test("getScopedFilter narrows admin queries to their centre", () => {
  const filter = getScopedFilter(
    { user: { role: "admin", centreId: "centre-a" } },
    { status: "active" },
  );

  assert.deepEqual(filter, { status: "active", centreId: "centre-a" });
});

test("canAccessCentre allows only the assigned admin centre", () => {
  assert.equal(
    canAccessCentre({ user: { role: "admin", centreId: "centre-a" } }, "centre-a"),
    true,
  );
  assert.equal(
    canAccessCentre({ user: { role: "admin", centreId: "centre-a" } }, "centre-b"),
    false,
  );
});

test("ensureCentreAccess throws for unauthorised centre access", () => {
  assert.throws(
    () =>
      ensureCentreAccess(
        { user: { role: "admin", centreId: "centre-a" } },
        "centre-b",
      ),
    (error) => error.statusCode === 403,
  );
});

test("buildTokenPayload includes role and centre scope", () => {
  assert.deepEqual(
    buildTokenPayload({ _id: "user-1", role: "admin", centreId: "centre-a" }),
    { id: "user-1", role: "admin", centreId: "centre-a" },
  );
});