# Dairy ERP Context

Last updated: 2026-03-31

## Repo Layout
- `backend/`: Express + Mongoose API
- `Dairy-Management-Collection-Boy-main/`: React + TypeScript + Vite frontend

## Current Phase Status
- Phase 1 complete: centre-aware schema foundations, auth middleware, route protection, audit hooks, billing/payment fixes
- Phase 2 complete: superadmin centre management, admin management, bootstrap-safe auth flow, role-aware frontend navigation
- Phase 3 complete: farmer transfer workflow, centre backfill API, superadmin farmer transfer UI, centre-aware farmer creation/filtering
- Phase 4 complete: reporting API expansion and new report pages for farmer payments, milk quality, and audit trail
- Phase 5 complete for current target scope: offline-first milk collection, cached inventory flows, queued inventory create/update/delete, queued inventory farmer sales, reconnect sync, sync diagnostics, and dashboard/settings visibility
- Phase 6 complete for current target scope: module scaffolding, standalone Payments page with payout initiation, real Settings page, shared UI wrappers, and stronger payment/settings flows

## Backend Additions
- Models already in repo: `Centre`, `AuditLog`, `FarmerTransfer`
- Utilities added for hardening/testability:
  - `backend/utils/farmerTransfer.js`
  - `backend/utils/paymentStatus.js`
  - `backend/utils/reportFilters.js`
  - `backend/utils/syncQueue.js`
- Test files:
  - `backend/tests/access.test.js`
  - `backend/tests/hardening-utils.test.js`
  - `backend/tests/run.js`

## Important Backend APIs
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `PUT /api/auth/me`
  - `PUT /api/auth/change-password`
- Superadmin:
  - `GET/POST /api/centres`
  - `POST /api/centres/backfill`
  - `GET/PUT /api/centres/:id`
  - `GET/POST /api/admins`
  - `GET/PUT /api/admins/:id`
  - `GET /api/dashboard/global`
  - `POST /api/farmers/:id/transfer`
  - `GET /api/farmers/:id/transfers`
- Reports:
  - `GET /api/reports/daily-milk`
  - `GET /api/reports/monthly-milk`
  - `GET /api/reports/milk-type`
  - `GET /api/reports/billing`
  - `GET /api/reports/farmer-payments`
  - `GET /api/reports/inventory`
  - `GET /api/reports/milk-quality`
  - `GET /api/reports/audit-trail`
- Sync:
  - `GET /api/sync/status`
  - `GET /api/sync/pull`
  - `POST /api/sync/push`

## Frontend State
- Role-aware protected routes are active for centres, admins, payments, settings, reports, and operational pages
- Settings now supports:
  - profile update
  - password change
  - offline sync health
  - role-based quick links
- Payments now supports:
  - ledger/history filtering
  - centre-aware pending bill payout initiation
  - existing payout modal reuse from the standalone module
- Audit trail report includes CSV export
- Dashboard and navbar show sync status, pending count, failed sync count, and last sync timing
- Billing PDF assets are lazy-loaded so the route bundle is now small and the heavy font payload is isolated into its own on-demand chunk

## IndexedDB Stores
- `farmers`
- `milkEntries`
- `inventory`
- `syncQueue`
- `syncMeta`

## Known Product State
- Offline queueing now covers milk entry creation plus inventory master changes and inventory sales, but installment repayments and some other transactional modules are still online-first
- Legacy `pages/` structure still exists for many screens; modules are being introduced incrementally rather than via a destabilizing rewrite
- The Marathi font asset remains large by nature, but it is no longer inflating the main billing route bundle

## Verification
- Backend import smoke check passed on 2026-03-31
- Backend utility tests passed via `node .\\tests\\run.js` on 2026-03-31
- Frontend `npm run build` passed on 2026-03-31 without the previous large billing-route warning
- In this sandbox, `npm test` in `backend/` still hits an environment-level `EPERM` before invoking the script, so direct `node .\\tests\\run.js` was used for verification
