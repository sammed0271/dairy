import test from "node:test";
import assert from "node:assert/strict";
import { validateFarmerTransferTargets } from "../utils/farmerTransfer.js";
import { resolveBillStatusFromPaymentStatus } from "../utils/paymentStatus.js";
import {
  applyMilkReportFilters,
  normalizeDateRange,
  normalizeOptionalDateRange,
} from "../utils/reportFilters.js";
import { sortSyncQueueItems } from "../utils/syncQueue.js";

test("validateFarmerTransferTargets rejects missing and duplicate centre transfers", () => {
  assert.throws(
    () => validateFarmerTransferTargets({ currentCentreId: null, targetCentreId: "b" }),
    /centre yet/i,
  );
  assert.throws(
    () =>
      validateFarmerTransferTargets({
        currentCentreId: "centre-a",
        targetCentreId: "centre-a",
      }),
    /already assigned/i,
  );
  assert.equal(
    validateFarmerTransferTargets({
      currentCentreId: "centre-a",
      targetCentreId: "centre-b",
    }),
    true,
  );
});

test("report filter helpers normalise date, shift and milk type inputs", () => {
  assert.deepEqual(normalizeDateRange({ from: "2026-03-01", to: "2026-03-31" }), {
    from: "2026-03-01",
    to: "2026-03-31",
  });

  assert.deepEqual(
    applyMilkReportFilters({ centreId: "centre-a" }, { shift: "Evening", milkType: "buffalo" }),
    { centreId: "centre-a", shift: "evening", milkType: "buffalo" },
  );

  const optional = normalizeOptionalDateRange({ from: "2026-03-01" });
  assert.equal(optional.from, "2026-03-01");
  assert.equal(optional.to, null);
  assert.ok(optional.filter.timestamp.$gte instanceof Date);
});

test("resolveBillStatusFromPaymentStatus maps processed payouts to paid bills", () => {
  assert.equal(resolveBillStatusFromPaymentStatus("processed"), "Paid");
  assert.equal(resolveBillStatusFromPaymentStatus("failed"), "Pending");
  assert.equal(resolveBillStatusFromPaymentStatus("reversed"), "Pending");
});

test("sortSyncQueueItems preserves chronological order and action priority", () => {
  const sorted = sortSyncQueueItems([
    {
      id: "delete-late",
      action: "delete",
      createdAt: "2026-03-31T10:00:00.000Z",
    },
    {
      id: "update-same-time",
      action: "update",
      createdAt: "2026-03-31T09:00:00.000Z",
    },
    {
      id: "create-same-time",
      action: "create",
      createdAt: "2026-03-31T09:00:00.000Z",
    },
  ]);

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["create-same-time", "update-same-time", "delete-late"],
  );
});