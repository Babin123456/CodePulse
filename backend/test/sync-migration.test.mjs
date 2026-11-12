import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('differential sync SQL migration (embedded PostgreSQL)', () => {
  it(
    'preserves rows and metadata while enforcing user-scoped external IDs',
    { timeout: 60000 },
    async () => {
      const db = new PGlite();
      const migrations = fileURLToPath(
        new URL('../prisma/migrations/', import.meta.url),
      );
      try {
        await db.exec(
          readFileSync(
            join(migrations, '00000000000000_baseline/migration.sql'),
            'utf8',
          ),
        );
        await db.exec(`INSERT INTO users (id,"githubId",username,"updatedAt") VALUES ('u1','g1','one',now()),('u2','g2','two',now());
        INSERT INTO repositories (id,"githubRepoId","userId",name,"fullName",url,"repoCreatedAt","repoUpdatedAt","updatedAt") VALUES ('r1','shared','u1','demo','owner/demo','https://example.test',now(),now(),now());
        INSERT INTO activities (id,"userId",type,title,description,metadata) VALUES ('a1','u1','COMMIT','old','old','{"saved":true}');`);
        await db.exec(
          readFileSync(
            join(migrations, '20261109110000_differential_sync/migration.sql'),
            'utf8',
          ),
        );
        assert.deepEqual(
          (await db.query(`SELECT id,"archivedAt" FROM repositories`)).rows,
          [{ id: 'r1', archivedAt: null }],
        );
        assert.deepEqual(
          (await db.query(`SELECT id,metadata,"githubEventId" FROM activities`))
            .rows,
          [{ id: 'a1', metadata: { saved: true }, githubEventId: null }],
        );
        await db.exec(
          `INSERT INTO repositories (id,"githubRepoId","userId",name,"fullName",url,"repoCreatedAt","repoUpdatedAt","updatedAt") VALUES ('r2','shared','u2','demo','owner/demo','https://example.test',now(),now(),now());`,
        );
        await assert.rejects(
          db.exec(
            `INSERT INTO repositories (id,"githubRepoId","userId",name,"fullName",url,"repoCreatedAt","repoUpdatedAt","updatedAt") VALUES ('r3','shared','u1','demo','owner/demo','https://example.test',now(),now(),now());`,
          ),
          /unique/,
        );
        await db.exec(
          `INSERT INTO activities (id,"userId",type,title,description,"githubEventId") VALUES ('a2','u1','COMMIT','event','event','github:1'),('a3','u2','COMMIT','event','event','github:1');`,
        );
        await assert.rejects(
          db.exec(
            `INSERT INTO activities (id,"userId",type,title,description,"githubEventId") VALUES ('a4','u1','COMMIT','event','event','github:1');`,
          ),
          /unique/,
        );
        assert.deepEqual(
          (await db.query(`SELECT count(*)::int AS count FROM activities`))
            .rows,
          [{ count: 3 }],
        );
      } finally {
        await db.close();
      }
    },
  );
});
