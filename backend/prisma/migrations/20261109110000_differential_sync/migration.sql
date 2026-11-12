-- Incremental migration for an existing schema; preserves all record IDs/data.
ALTER TABLE "repositories" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "activities" ADD COLUMN "githubEventId" TEXT;
DROP INDEX "repositories_githubRepoId_key";
CREATE UNIQUE INDEX "repositories_userId_githubRepoId_key" ON "repositories"("userId", "githubRepoId");
-- PostgreSQL permits multiple NULLs, preserving historical unkeyed activities.
CREATE UNIQUE INDEX "activities_userId_githubEventId_key" ON "activities"("userId", "githubEventId");
