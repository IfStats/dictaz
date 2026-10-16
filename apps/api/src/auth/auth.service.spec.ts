
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { describe, expect, it } from 'vitest';

import { DatabaseService } from '../database/database.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService input security', () => {
  // These cases must fail before database access.
  const service = new AuthService(
    {} as DatabaseService,
  );

  it('rejects invalid registration emails', async () => {
    await expect(
      service.register({
        email: 'invalid',
        password: 'VerySecurePassword2026!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects short registration passwords', async () => {
    await expect(
      service.register({
        email: 'reader@example.com',
        password: 'short',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid session token formats', async () => {
    await expect(
      service.getSessionUser('invalid-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('handles malformed logout tokens safely', async () => {
    await expect(
      service.logout('invalid-token'),
    ).resolves.toBeUndefined();
  });
});
