# Sync schema migrations

The baseline migration represents the schema before differential sync was added.

For an existing database created with `prisma db push`, take a backup and verify
that its schema matches the baseline, then mark the baseline as applied:

```sh
npx prisma migrate resolve --applied 00000000000000_baseline
npx prisma migrate deploy
npx prisma generate
```

For a new empty database, run `npx prisma migrate deploy` then `npx prisma generate`.
Do not mark the baseline applied on an empty database. Run these from `backend/`
with the intended development/deployment database URLs; tests never use those URLs.

The incremental migration adds nullable GitHub event IDs and archive timestamps,
then replaces global repository uniqueness with `(userId, githubRepoId)`. Existing
rows, primary IDs, timestamps and metadata are preserved. NULL event IDs allow
legacy activities to remain; sync adopts one exact legacy tuple when first seen.

Repositories absent from a confirmed complete GitHub page are marked archived,
not deleted. A partial or unknown page never archives missing records. Reappearance
clears the archive flag. Repository search excludes archived records. The fetched
repository window is still limited to 100, so this is not full pagination support.

Sync reads both remote responses before an interactive database transaction. A
user-row lock serializes persistence for that user. Failures reject the sync call
and roll back all writes. No production database is migrated automatically by this PR.
