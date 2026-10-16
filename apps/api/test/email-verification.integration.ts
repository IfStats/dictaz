
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

import { BadRequestException,         
} from '@nestjs/common';
import {
  createDatabase,
  emailVerificationTokens,
  users,
} from '@dictaz/db';

import { TooManyRequestsException } from '../src/auth/too-many-requests.exception.js';

import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { DatabaseService } from '../src/database/database.service.js';
import { EmailVerificationService } from '../src/auth/email-verification.service.js';
import { hashSecureToken } from '../src/auth/tokens.js';

const envPath = resolve(
  process.cwd(),
  '../../packages/db/.env',
);

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('Integration tests cannot run in production');
}

const url = process.env.DICTAZ_DATABASE_URL_DEV;

if (!url) {
  throw new Error('Development database URL is missing');
}

const connection = createDatabase(url);

class ExpectedRollback extends Error {}

describe('Email verification integration', () => {
  afterAll(async () => {
    await connection.client.end();
  });

  it('issues, expires and consumes tokens safely', async () => {
    let completed = false;

    try {
      await connection.db.transaction(async (tx) => {
        const service = new EmailVerificationService({
          db: tx,
        } as unknown as DatabaseService);

        const [user] = await tx
          .insert(users)
          .values({
            email: `verify-${randomUUID()}@example.com`,
          })
          .returning({ id: users.id });

        expect(user).toBeDefined();

        const first = await service.issueForUser(user.id);

        expect(first.token).toMatch(
          /^[A-Za-z0-9_-]{43}$/,
        );

        // Reissuing invalidates the previous token.
        
await expect(
  service.issueForUser(user.id),
).rejects.toBeInstanceOf(TooManyRequestsException);

// Move the first token outside the cooldown window.
// This happens only inside the rollback transaction.
await tx
  .update(emailVerificationTokens)
  .set({
    createdAt: new Date(Date.now() - 61_000),
  })
  .where(
    eq(
      emailVerificationTokens.tokenHash,
      hashSecureToken(first.token),
    ),
  );

const second = await service.issueForUser(user.id);


        expect(second.token).not.toBe(first.token);

        await expect(
          service.redeem(first.token),
        ).rejects.toBeInstanceOf(BadRequestException);

        // Verification succeeds with the latest token.
        const result = await service.redeem(second.token);

        expect(result.verified).toBe(true);
        expect(result.userId).toBe(user.id);

        // A consumed token cannot be reused.
        await expect(
          service.redeem(second.token),
        ).rejects.toBeInstanceOf(BadRequestException);

        // Verified accounts cannot receive new tokens.
        await expect(
          service.issueForUser(user.id),
        ).rejects.toBeInstanceOf(BadRequestException);

        const [verifiedUser] = await tx
          .select({
            verifiedAt: users.emailVerifiedAt,
          })
          .from(users)
          .where(eq(users.id, user.id));

        expect(verifiedUser.verifiedAt).toBeInstanceOf(Date);

        // Expired tokens must be rejected.
        const [secondUser] = await tx
          .insert(users)
          .values({
            email: `expired-${randomUUID()}@example.com`,
          })
          .returning({ id: users.id });

        const expired = await service.issueForUser(
          secondUser.id,
        );

        await tx
          .update(emailVerificationTokens)
          .set({ expiresAt: new Date(0) })
          .where(
            eq(
              emailVerificationTokens.tokenHash,
              hashSecureToken(expired.token),
            ),
          );

        await expect(
          service.redeem(expired.token),
        ).rejects.toBeInstanceOf(BadRequestException);

        completed = true;

        // Leave no test users or tokens behind.
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
