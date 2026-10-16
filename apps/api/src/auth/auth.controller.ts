
import {
  BadRequestException,
  Body,
  ConflictException,
  Logger,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  Throttle,
  ThrottlerGuard,
} from '@nestjs/throttler';

import { AuthService } from './auth.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { VerificationDispatchService } from './verification-dispatch.service.js';

const REGISTRATION_RESPONSE = {
  message:
    'If your email is eligible, check your inbox for verification instructions.',
};

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly verification: EmailVerificationService,
    private readonly dispatch: VerificationDispatchService,
  ) {}

  @Post('register')
  @HttpCode(202)
  @Throttle({
    default: { limit: 3, ttl: 60_000 },
  })
  async register(@Body() body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Invalid registration request');
    }

    const input = body as Record<string, unknown>;

    if (
      typeof input.email !== 'string' ||
      typeof input.password !== 'string' ||
      (
        input.displayName !== undefined &&
        typeof input.displayName !== 'string'
      )
    ) {
      throw new BadRequestException('Invalid registration fields');
    }

    try {
      const account = await this.auth.register({
        email: input.email,
        password: input.password,
        displayName: input.displayName as string | undefined,
      });

      await this.dispatch.sendForUser(account.id);
    } catch (error) {
      // Duplicate accounts receive the same response shape.
      if (!(error instanceof ConflictException)) {
        throw error;
      }
    }

    return REGISTRATION_RESPONSE;
  }

  @Post('verify-email')
  @HttpCode(200)
  @Throttle({
    default: { limit: 10, ttl: 60_000 },
  })
  async verifyEmail(@Body() body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Invalid verification request');
    }

    const input = body as Record<string, unknown>;

    if (typeof input.token !== 'string') {
      throw new BadRequestException('Invalid verification token');
    }

    await this.verification.redeem(input.token);

    return {
      verified: true,
      message: 'Email verified successfully',
    };
  }

private readonly logger = new Logger(AuthController.name);

@Post('resend-verification')
@HttpCode(202)
@Throttle({
  default: { limit: 3, ttl: 900_000 },
})
async resendVerification(@Body() body: unknown) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    throw new BadRequestException('Invalid request');
  }

  const input = body as Record<string, unknown>;

  if (typeof input.email !== 'string') {
    throw new BadRequestException('Invalid email address');
  }

  const email = input.email.trim().toLowerCase();

  if (
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new BadRequestException('Invalid email address');
  }

  try {
    await this.dispatch.resendForEmail(email);
  } catch {
    // Preserve the public response regardless of
    // account existence or provider availability.
    // Log no email addresses, tokens or provider secrets.
    this.logger.error('Verification resend failed');
  }

  return {
    message:
      'If your email is eligible, check your inbox for verification instructions.',
  };
}

}
