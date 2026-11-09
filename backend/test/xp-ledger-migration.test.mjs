import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const sql = name => readFileSync(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8');
test('XP ledger migration preserves ratings and enforces positive awards/user ownership', async () => {
  const db = new PGlite();
  try {
    await db.exec(sql('00000000000000_baseline'));
    await db.exec(`INSERT INTO users (id,"githubId",username,"updatedAt") VALUES ('u','g','demo',now());
      INSERT INTO developer_ratings (id,"userId",xp,"updatedAt") VALUES ('r','u',90,now());`);
    await db.exec(sql('20261109120000_xp_ledger'));
    assert.deepEqual((await db.query('SELECT xp FROM developer_ratings')).rows, [{ xp: 90 }]);
    await db.exec(`INSERT INTO xp_transactions (id,"userId",amount,source,description) VALUES ('x','u',10,'CHALLENGE_COMPLETED','Demo award');`);
    await assert.rejects(db.exec(`INSERT INTO xp_transactions (id,"userId",amount,source,description) VALUES ('negative','u',-1,'MANUAL','invalid');`), /check constraint/);
    await assert.rejects(db.exec(`INSERT INTO xp_transactions (id,"userId",amount,source,description) VALUES ('orphan','missing',1,'MANUAL','invalid');`), /foreign key/);
    await assert.rejects(db.transaction(async tx => {
      await tx.exec(`UPDATE developer_ratings SET xp = xp + 20 WHERE id = 'r';
        INSERT INTO xp_transactions (id,"userId",amount,source,description) VALUES ('rollback','u',20,'MANUAL','rollback');`);
      throw new Error('rollback');
    }), /rollback/);
    assert.deepEqual((await db.query('SELECT xp FROM developer_ratings')).rows, [{ xp: 90 }]);
    assert.deepEqual((await db.query('SELECT id FROM xp_transactions')).rows, [{ id: 'x' }]);
  } finally { await db.close(); }
});
