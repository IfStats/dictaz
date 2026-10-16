
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import postgres from 'postgres';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

const url = process.env.DICTAZ_DATABASE_URL_DEV;

assert.ok(url, 'Development database URL is missing');

const sql = postgres(url, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
});

try {
  const expectedTables = [
    'auth_credentials',
    'auth_sessions',
    'email_verification_tokens',
    'password_reset_tokens',
  ];

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;

  const availableTables = new Set(
    tables.map((row) => row.table_name),
  );

  for (const name of expectedTables) {
    assert.ok(
      availableTables.has(name),
      `Missing authentication table: ${name}`,
    );
  }

  console.log('PASS: Four authentication tables exist');

  const columns = await sql`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
  `;

  const verifiedAt = columns.find(
    (row) => row.column_name === 'email_verified_at',
  );

  const isActive = columns.find(
    (row) => row.column_name === 'is_active',
  );

  assert.ok(verifiedAt, 'Missing email verification field');
  assert.ok(isActive, 'Missing account status field');

  assert.equal(isActive.is_nullable, 'NO');

  console.log('PASS: User authentication fields exist');

  const indexes = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
  `;

  const indexNames = new Set(
    indexes.map((row) => row.indexname),
  );

  for (const name of [
    'auth_sessions_token_hash_unique',
    'email_verification_token_hash_unique',
    'password_reset_token_hash_unique',
  ]) {
    assert.ok(indexNames.has(name), `Missing index: ${name}`);
  }

  console.log('PASS: Authentication token indexes exist');

  const foreignKeys = await sql`
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class tab ON tab.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = tab.relnamespace
    WHERE ns.nspname = 'public'
      AND con.contype = 'f'
  `;

  const foreignKeyNames = new Set(
    foreignKeys.map((row) => row.conname),
  );

  for (const name of [
    'auth_credentials_user_id_users_id_fk',
    'auth_sessions_user_id_users_id_fk',
    'email_verification_tokens_user_id_users_id_fk',
    'password_reset_tokens_user_id_users_id_fk',
  ]) {
    assert.ok(
      foreignKeyNames.has(name),
      `Missing foreign key: ${name}`,
    );
  }

  console.log('PASS: Authentication foreign keys exist');
  console.log('PASS: Authentication database verified');
} finally {
  await sql.end();
}
