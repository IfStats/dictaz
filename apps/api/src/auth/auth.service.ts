
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  and,
  eq,
  gt,
  isNotNull,
  isNull,
  sql,
} from 'drizzle-orm';

import {
  authCredentials,
  authSessions,
  userRoles,
  users,
} from '@dictaz/db';

import { DatabaseService } from '../database/database.service.js';
import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from './password.js';

import {
  createExpirationDate,
  generateSecureToken,
  hashSecureToken,
  SESSION_DURATION_MS,
} from './tokens.js';

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();

  if (
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new BadRequestException('Invalid email address');
  }

  return email;
}

function isUniqueViolation(error: unknown): boolean {
  let current = error;

  for (let i = 0; i < 4; i++) {
    if (!current || typeof current !== 'object') {
      break;
    }

    const detail = current as {
      code?: unknown;
      cause?: unknown;
    };

    if (detail.code === '23505') {
      return true;
    }

    current = detail.cause;
  }

  return false;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
  ) {}

  async register(input: RegisterInput) {
    const email = normalizeEmail(input.email);

    try {
      validatePassword(input.password);
    } catch {
      throw new BadRequestException(
        'Password must contain 15–128 characters',
      );
    }

    const displayName = input.displayName?.trim() || null;

    if (displayName && displayName.length > 160) {
      throw new BadRequestException(
        'Display name is too long',
      );
    }

    const passwordHash = await hashPassword(input.password);

    try {
      return await this.database.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(users)
          .values({
            email,
            displayName,
          })
          .returning({
            id: users.id,
            email: users.email,
          });

        if (!created) {
          throw new Error('Could not create user');
        }

        await tx.insert(authCredentials).values({
          userId: created.id,
          passwordHash,
        });

        // Public registration never grants editorial privileges.
        await tx.insert(userRoles).values({
          userId: created.id,
          role: 'SUBSCRIBER',
        });

        return {
          id: created.id,
          email: created.email,
          emailVerified: false,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Account already exists',
        );
      }

      throw error;
    }
  }

  async login(input: LoginInput) {
    const email = normalizeEmail(input.email);

    const [account] = await this.database.db
      .select({
        id: users.id,
        email: users.email,
        isActive: users.isActive,
        emailVerifiedAt: users.emailVerifiedAt,
        passwordHash: authCredentials.passwordHash,
      })
      .from(users)
      .innerJoin(
        authCredentials,
        eq(authCredentials.userId, users.id),
      )
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    const invalid = new UnauthorizedException(
      'Invalid credentials or account unavailable',
    );

    if (!account) {
      throw invalid;
    }

    const passwordValid = await verifyPassword(
      account.passwordHash,
      input.password,
    );

    if (
      !passwordValid ||
      !account.isActive ||
      !account.emailVerifiedAt
    ) {
      throw invalid;
    }

    const token = generateSecureToken();
    const expiresAt = createExpirationDate(
      SESSION_DURATION_MS,
    );

    await this.database.db.insert(authSessions).values({
      userId: account.id,
      tokenHash: hashSecureToken(token),
      expiresAt,
    });

    // Internal result only. Future HTTP controllers must
    // deliver this through an HttpOnly secure cookie.
    return {
      token,
      expiresAt,
      user: {
        id: account.id,
        email: account.email,
      },
    };
  }

  async getSessionUser(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new UnauthorizedException();
    }

    const [session] = await this.database.db
      .select({
        userId: users.id,
        email: users.email,
      })
      .from(authSessions)
      .innerJoin(
        users,
        eq(authSessions.userId, users.id),
      )
      .where(
        and(
          eq(authSessions.tokenHash, hashSecureToken(token)),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
          eq(users.isActive, true),
          isNotNull(users.emailVerifiedAt),
        ),
      )
      .limit(1);

    if (!session) {
      throw new UnauthorizedException();
    }

    const assignedRoles = await this.database.db
      .select({
        role: userRoles.role,
      })
      .from(userRoles)
      .where(eq(userRoles.userId, session.userId));

    return {
      id: session.userId,
      email: session.email,
      roles: assignedRoles.map((entry) => entry.role),
    };
  }

  async logout(token: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      return;
    }

    await this.database.db
      .update(authSessions)
      .set({
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(authSessions.tokenHash, hashSecureToken(token)),
          isNull(authSessions.revokedAt),
        ),
      );
  }
}
