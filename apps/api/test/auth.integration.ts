
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  authCredentials,
  authSessions,
  createDatabase,
  users,
} from '@dictaz/db';

import { eq, sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { AuthService } from '../src/auth/auth.service.js';
import { hashSecureToken } from '../src/auth/tokens.js';
import { DatabaseService } from '../src/database/database.service.js';

const envPath = resolve(
  process.cwd(),
  '../../packages/db/.env',
);

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'Authentication integration tests cannot run in production mode',
  );
}

const url = process.env.DICTAZ_DATABASE_URL_DEV;

if (!url) {
  throw new Error(
    'DICTAZ_DATABASE_URL_DEV is required for integration tests',
  );
}

const connection = createDatabase(url);

class ExpectedRollback extends Error {}

describe('AuthService PostgreSQL integration', () => {
  afterAll(async () => {
    await connection.client.end();
  });

  it('validates the authentication lifecycle', async () => {
    const email = `dictaz-auth-${randomUUID()}@example.com`;
    const password = 'DictazIntegrationPassword2026!';

    let completed = false;

    try {
      // All test changes must be rolled back.
      await connection.db.transaction(async (tx) => {
        const service = new AuthService({
          db: tx,
        } as unknown as DatabaseService);

        // 1. Registration
        const registered = await service.register({
          email,
          password,
          displayName: 'Integration Tester',
        });

        expect(registered.email).toBe(email);
        expect(registered.emailVerified).toBe(false);

        // 2. Password is stored as Argon2id.
        const [credential] = await tx
          .select({
            hash: authCredentials.passwordHash,
          })
          .from(authCredentials)
          .where(
            eq(authCredentials.userId, registered.id),
          );

        expect(credential?.hash).toMatch(/^\$argon2id\$/);
        expect(credential?.hash).not.toBe(password);

        // 3. Reject duplicate registration.
        await expect(
          service.register({
            email: email.toUpperCase(),
            password,
          }),
        ).rejects.toBeInstanceOf(ConflictException);

        const matchingUsers = await tx
          .select({ id: users.id })
          .from(users)
          .where(sql`lower(${users.email}) = ${email}`);

        expect(matchingUsers).toHaveLength(1);

        // 4. Unverified accounts cannot log in.
        await expect(
          service.login({ email, password }),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        // Simulate successful email verification.
        await tx
          .update(users)
          .set({ emailVerifiedAt: new Date() })
          .where(eq(users.id, registered.id));

        // 5. Reject incorrect passwords.
        await expect(
          service.login({
            email,
            password: 'IncorrectPassword2026!',
          }),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        // 6. Create a valid session.
        const login = await service.login({
          email,
          password,
        });

        expect(login.token).toMatch(
          /^[A-Za-z0-9_-]{43}$/,
        );

        // 7. Resolve the current user and roles.
        const currentUser = await service.getSessionUser(
          login.token,
        );

        expect(currentUser.id).toBe(registered.id);
        expect(currentUser.roles).toEqual(['SUBSCRIBER']);

        // 8. Logout revokes the session.
        await service.logout(login.token);

        await expect(
          service.getSessionUser(login.token),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        // 9. Expired sessions are rejected.
        const secondLogin = await service.login({
          email,
          password,
        });

        await tx
          .update(authSessions)
          .set({ expiresAt: new Date(0) })
          .where(
            eq(
              authSessions.tokenHash,
              hashSecureToken(secondLogin.token),
            ),
          );

        await expect(
          service.getSessionUser(secondLogin.token),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        // 10. Deactivated accounts lose access.
        const thirdLogin = await service.login({
          email,
          password,
        });

        await tx
          .update(users)
          .set({ isActive: false })
          .where(eq(users.id, registered.id));

        await expect(
          service.getSessionUser(thirdLogin.token),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        await expect(
          service.login({ email, password }),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        completed = true;

        // Intentional rollback: no test account persists.
        throw new ExpectedRollback();
      });
    } catch (error) {
      if (!(error instanceof ExpectedRollback)) {
        throw error;
      }
    }

    expect(completed).toBe(true);
  });
});
