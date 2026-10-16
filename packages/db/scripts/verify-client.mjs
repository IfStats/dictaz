
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

import { createDatabase, users } from '../dist/index.js';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

const databaseUrl = process.env.DICTAZ_DATABASE_URL_DEV;

assert.ok(
  databaseUrl,
  'DICTAZ_DATABASE_URL_DEV is not configured',
);

assert.throws(
  () => createDatabase(''),
  /PostgreSQL connection string is required/,
);

const { db, client } = createDatabase(databaseUrl);

try {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .limit(1);

  assert.ok(Array.isArray(result));

  console.log('PASS: Database client initialized');
  console.log('PASS: Drizzle query executed');
  console.log('PASS: PostgreSQL connection operational');
} finally {
  await client.end();
}
