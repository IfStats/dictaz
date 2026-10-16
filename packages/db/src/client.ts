
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema.js';

export function createDatabase(connectionString: string) {
  if (!connectionString?.trim()) {
    throw new Error('A PostgreSQL connection string is required');
  }

  const client = postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  const db = drizzle({
    client,
    schema,
  });

  return {
    db,
    client,
  };
}

export type Database = ReturnType<typeof createDatabase>['db'];
