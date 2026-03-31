# Dairy ERP Remaining Tasks

Last updated: 2026-03-31

## Highest Priority
- Extend offline queueing beyond current milk and inventory coverage to installment collections, deduction workflows, and other transactional centre operations if field teams need them offline
- Add richer backend and UI tests around real controller flows once a broader integration-test harness is introduced

## Frontend Structure
- Move more legacy operational screens into `modules/moduleName/pages/components/api/types` instead of only using wrapper exports
- Continue migrating older pages to shared UI wrappers where it reduces duplication without destabilizing working flows

## Optional Product Enhancements
- Add deeper audit analytics or downloadable audit exports beyond the current CSV report
- Expand the Payments module further if product owners want bulk payout approval and reconciliation fully moved out of Bills
- Add more profile/security settings such as session/device history if governance requirements grow

## Monitoring
- Revisit the lazy Marathi font chunk if PDF assets need further compression, although the heavy billing route bundle warning has already been resolved through code-splitting
