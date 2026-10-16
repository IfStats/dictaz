
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { TooManyRequestsException } from './too-many-requests.exception.js';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { users } from '@dictaz/db';

import { DatabaseService } from '../database/database.service.js';
import { EmailDeliveryService } from './email-delivery.service.js';
import { EmailVerificationService } from './email-verification.service.js';

@Injectable()
export class VerificationDispatchService {
  constructor(
    private readonly verification: EmailVerificationService,
    private readonly delivery: EmailDeliveryService,
    private readonly database: DatabaseService,
  ) {}

  async sendForUser(userId: string): Promise<void> {
    const issued = await this.verification.issueForUser(userId);

    await this.delivery.sendVerification(
      issued.email,
      issued.token,
    );
  }

  async resendForEmail(inputEmail: string): Promise<void> {
    const email = inputEmail.trim().toLowerCase();

    const [account] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          sql`lower(${users.email}) = ${email}`,
          eq(users.isActive, true),
          isNull(users.emailVerifiedAt),
        ),
      )
      .limit(1);

    // Unknown, inactive, and already verified accounts
    // all receive the same public response.
    if (!account) return;

    try {
      await this.sendForUser(account.id);
    } catch (error) {
      if (
        error instanceof TooManyRequestsException ||
        error instanceof BadRequestException
      ) {
        return;
      }

      throw error;
    }
  }
}
