
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

const databaseUrl = process.env.DICTAZ_DATABASE_URL_DEV;

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  verbose: true,
  strict: true,
  ...(databaseUrl
    ? { dbCredentials: { url: databaseUrl } }
    : {}),
});
