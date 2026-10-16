
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import postgres from 'postgres';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

const databaseUrl = process.env.DICTAZ_DATABASE_URL_DEV;

assert.ok(
  databaseUrl,
  'DICTAZ_DATABASE_URL_DEV is not configured',
);

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
});

try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'users',
        'user_roles',
        'categories',
        'articles'
      )
  `;

  const tableNames = new Set(
    tables.map((row) => row.table_name),
  );

  for (const name of [
    'users',
    'user_roles',
    'categories',
    'articles',
  ]) {
    assert.ok(tableNames.has(name), `Missing table: ${name}`);
  }

  const constraints = await sql`
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class tab ON tab.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = tab.relnamespace
    WHERE ns.nspname = 'public'
      AND tab.relname = 'articles'
      AND con.contype = 'c'
  `;

  const constraintNames = new Set(
    constraints.map((row) => row.conname),
  );

  for (const name of [
    'articles_approval_required',
    'articles_publication_date_required',
    'articles_schedule_date_required',
  ]) {
    assert.ok(
      constraintNames.has(name),
      `Missing constraint: ${name}`,
    );
  }

  const indexes = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND indexname = 'users_email_lower_unique'
  `;

  assert.equal(
    indexes.length,
    1,
    'Case-insensitive email index is missing',
  );

  console.log('PASS: Four core database tables exist');
  console.log('PASS: Editorial constraints exist');
  console.log('PASS: Email uniqueness index exists');
  console.log('PASS: Live PostgreSQL schema verified');
} finally {
  await sql.end();
}
