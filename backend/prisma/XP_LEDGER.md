# XP ledger and level progression

From `backend/`, generate the Prisma client and apply the migrations before running
the updated backend. This repository previously used schema pushes; the baseline
migration records that original schema. For an existing matching database, back it
up, verify its schema, then run:

```sh
npx prisma migrate resolve --applied 00000000000000_baseline
npx prisma migrate deploy
npx prisma generate
```

For an empty database, run migrate deploy and generate without marking the baseline
applied. Do not run these commands against an unintended database. This contribution
has not migrated any shared or production database.

Each XpService award appends a positive amount/source/description record. The same
transaction locks the user row, increments cumulative XP, updates level/tier, and
creates one final-level notification/activity if levels changed. Standalone level
checks use the same lock. Failed ledger/notification writes roll the award back.
No service method updates or deletes existing ledger rows. The user foreign key
retains the project's cascading account-deletion policy.

Progression follows the existing SyncService convention: level is
floor(sqrt(totalXp/100))+1 and the next cumulative threshold is level²*100.
Already-earned levels are not reduced when historical rows contain residual XP.
Tier thresholds match sync: Silver5, Gold10, Platinum20, Diamond30, Master40,
Grandmaster50. XP is no longer consumed by the former example scaling loop.

The ledger covers awards through XpService; direct writes by other services (such
as the existing GitHub sync rating recalculation) are not retroactively audited.
The existing endpoint authorization is outside this issue's scope. Repeated calls
are separate awards: no external-event idempotency contract is added.

Checks: npm test -- --runInBand, npm run test:xp-migration, npm run build.
Migration tests run an isolated embedded PostgreSQL engine, not a shared database.
Prisma service tests use transaction-aware fixtures; network PostgreSQL end-to-end
execution remains a deployment check.
