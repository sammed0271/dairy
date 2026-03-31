# Dairy ERP

This repository contains a multi-centre Dairy ERP built with:

- Frontend: React, TypeScript, Vite, TailwindCSS
- Backend: Node.js, Express, MongoDB, Mongoose
- Offline storage: IndexedDB

## Core Modules

- Centre management
- Admin management
- Farmer management
- Milk collection
- Billing and payments
- Inventory and farmer sales
- Reports and audit trail
- Offline sync for collection and inventory master workflows
- Account settings with profile/password management

## Local Run

### Backend

1. Create `backend/.env`
2. Add at least:
   - `PORT`
   - `MONGO_URI`
   - `JWT_SECRET`
   - Razorpay keys if payouts are being tested
3. Run:

```powershell
cd backend
npm install
npm start
```

### Frontend

```powershell
cd Dairy-Management-Collection-Boy-main
npm install
npm run dev
```

## Migration And Backfill Notes

The system was originally single-centre and is now centre-aware.

### Recommended rollout order

1. Create the primary centre records from the superadmin Centres screen.
2. Create or assign centre admins.
3. Run the backfill endpoint for legacy records:
   - `POST /api/centres/backfill`
4. Verify:
   - farmers have `centreId`
   - milk entries have `centreId`
   - inventory has `centreId`
   - bills have `centreId`
   - users have the correct `role` and `centreId`
5. Only after verification, enforce normal centre-scoped operations for admins.

### Backfill intent

Use backfill for legacy data that belonged to one operational centre before the multi-centre rollout. Historical records stay valid, while new operations become properly centre-scoped.

## Offline Sync Notes

IndexedDB stores:

- `farmers`
- `milkEntries`
- `inventory`
- `syncQueue`
- `syncMeta`

Current offline support includes:

- Milk collection create queueing
- Inventory create, update, stock change, and delete queueing
- Inventory farmer-sale queueing with server-side ordered sync handling
- Cached reads for milk collection and inventory screens
- Retry diagnostics for failed sync queue items

Current limitations:

- Inventory installment payments are still online-first
- Some older operational screens are still being migrated into the module-based frontend structure

## Reporting

Available report routes include:

- Daily milk
- Monthly milk
- Billing
- Farmer payments
- Milk quality
- Inventory
- Audit trail with CSV export

## Build Verification

Frontend production build:

```powershell
cd Dairy-Management-Collection-Boy-main
npm run build
```

Backend import smoke checks used during implementation:

```powershell
cd .
node --input-type=module -e "import './backend/controllers/report_controller.js'; console.log('ok');"
```

Backend utility test runner:

```powershell
cd backend
node .\tests\run.js
```
