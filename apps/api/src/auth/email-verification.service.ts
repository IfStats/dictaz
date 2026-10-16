
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { TooManyRequestsException } from './too-many-requests.exception.js';

import {
  and,
  desc,
  gte,
  eq,
  gt,
  isNull,
} from 'drizzle-orm';

import {
  emailVerificationTokens,
  users,
} from '@dictaz/db';

import { DatabaseService } from '../database/database.service.js';

import {
  EMAIL_VERIFICATION_DURATION_MS,
  createExpirationDate,
  generateSecureToken,
  hashSecureToken,
} from './tokens.js';

const INVALID_TOKEN_MESSAGE =
  'Invalid or expired verification token';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly database: DatabaseService,
  ) {}

  /**
   * Internal use only.
   * The raw token must be delivered by a trusted email
   * service and never returned by a public API endpoint.
   */
  async issueForUser(userId: string) {
    return this.database.db.transaction(async (tx) => {
      const [account] = await tx
        .select({
          id: users.id,
          email: users.email,
        })
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            eq(users.isActive, true),
            isNull(users.emailVerifiedAt),
          ),
        )
        .limit(1)
.for('update');

      if (!account) {
        throw new BadRequestException(
          'Email verification is unavailable',
        );
      }

      
const now = new Date();

const [latest] = await tx
  .select({
    createdAt: emailVerificationTokens.createdAt,
  })
  .from(emailVerificationTokens)
  .where(eq(emailVerificationTokens.userId, userId))
  .orderBy(desc(emailVerificationTokens.createdAt))
  .limit(1);

if (
  latest &&
  now.getTime() - latest.createdAt.getTime() < 60_000
) {
  throw new TooManyRequestsException(
    'Please wait before requesting another verification email',
  );
}

const issuedInLastDay = await tx
  .select({ id: emailVerificationTokens.id })
  .from(emailVerificationTokens)
  .where(
    and(
      eq(emailVerificationTokens.userId, userId),
      gte(
        emailVerificationTokens.createdAt,
        new Date(now.getTime() - 24 * 60 * 60 * 1000),
      ),
    ),
  )
  .limit(5);

if (issuedInLastDay.length >= 5) {
  throw new TooManyRequestsException(
    'Verification request limit reached',
  );
}


      // Invalidate previously issued, unused tokens.
      await tx
        .update(emailVerificationTokens)
        .set({ consumedAt: now })
        .where(
          and(
            eq(emailVerificationTokens.userId, userId),
            isNull(emailVerificationTokens.consumedAt),
          ),
        );

      const token = generateSecureToken();
      const expiresAt = createExpirationDate(
        EMAIL_VERIFICATION_DURATION_MS,
      );

      await tx.insert(emailVerificationTokens).values({
        userId,
        tokenHash: hashSecureToken(token),
        expiresAt,
      });

      return {
        email: account.email,
        token,
        expiresAt,
      };
    });
  }

  async redeem(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new BadRequestException(
        INVALID_TOKEN_MESSAGE,
      );
    }

    return this.database.db.transaction(async (tx) => {
      const now = new Date();

      // Atomic consumption prevents token replay.
      const [consumed] = await tx
        .update(emailVerificationTokens)
        .set({ consumedAt: now })
        .where(
          and(
            eq(
              emailVerificationTokens.tokenHash,
              hashSecureToken(token),
            ),
            isNull(emailVerificationTokens.consumedAt),
            gt(emailVerificationTokens.expiresAt, now),
          ),
        )
        .returning({
          userId: emailVerificationTokens.userId,
        });

      if (!consumed) {
        throw new BadRequestException(
          INVALID_TOKEN_MESSAGE,
        );
      }

      const [account] = await tx
        .update(users)
        .set({
          emailVerifiedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(users.id, consumed.userId),
            eq(users.isActive, true),
            isNull(users.emailVerifiedAt),
          ),
        )
        .returning({
          id: users.id,
          email: users.email,
        });

      if (!account) {
        // Transaction rollback also reverses token
        // consumption if account verification fails.
        throw new BadRequestException(
          INVALID_TOKEN_MESSAGE,
        );
      }

      // Invalidate any remaining verification tokens.
      await tx
        .update(emailVerificationTokens)
        .set({ consumedAt: now })
        .where(
          and(
            eq(emailVerificationTokens.userId, account.id),
            isNull(emailVerificationTokens.consumedAt),
          ),
        );

      return {
        verified: true as const,
        userId: account.id,
      };
    });
  }
}
