
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { VerificationDispatchService } from './verification-dispatch.service.js';

describe('AuthController', () => {
  const auth = {
    register: vi.fn(),
  };

  const verification = {
    redeem: vi.fn(),
  };

  const dispatch = {
  sendForUser: vi.fn(),
  resendForEmail: vi.fn(),
};

  const controller = new AuthController(
    auth as unknown as AuthService,
    verification as unknown as EmailVerificationService,
    dispatch as unknown as VerificationDispatchService,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('registers a subscriber and dispatches verification', async () => {
    auth.register.mockResolvedValue({
      id: 'user-123',
      email: 'reader@example.com',
    });

    dispatch.sendForUser.mockResolvedValue(undefined);

    const result = await controller.register({
      email: 'reader@example.com',
      password: 'SecureDictazPassword2026!',
    });

    expect(auth.register).toHaveBeenCalledTimes(1);
    expect(dispatch.sendForUser).toHaveBeenCalledWith('user-123');
    expect(result).not.toHaveProperty('token');
  });

  it('uses a generic response for duplicate accounts', async () => {
    auth.register.mockRejectedValue(
      new ConflictException('Account already exists'),
    );

    const result = await controller.register({
      email: 'reader@example.com',
      password: 'SecureDictazPassword2026!',
    });

    expect(result.message).toContain('check your inbox');
    expect(dispatch.sendForUser).not.toHaveBeenCalled();
  });

  it('rejects malformed registration requests', async () => {
    await expect(
      controller.register({ email: 123 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('redeems a verification token', async () => {
    verification.redeem.mockResolvedValue({
      verified: true,
    });

    const result = await controller.verifyEmail({
      token: 'a'.repeat(43),
    });

    expect(result.verified).toBe(true);
    expect(verification.redeem).toHaveBeenCalledWith(
      'a'.repeat(43),
    );
  });

  it('rejects malformed verification requests', async () => {
    await expect(
      controller.verifyEmail({}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

it('accepts a valid verification resend request', async () => {
  dispatch.resendForEmail.mockResolvedValue(undefined);

  const result = await controller.resendVerification({
    email: ' READER@example.com ',
  });

  expect(dispatch.resendForEmail).toHaveBeenCalledWith(
    'reader@example.com',
  );

  expect(result.message).toContain('check your inbox');
});

it('keeps a generic response when dispatch fails', async () => {
  dispatch.resendForEmail.mockRejectedValue(
    new Error('Provider unavailable'),
  );

  const result = await controller.resendVerification({
    email: 'reader@example.com',
  });

  expect(result.message).toContain('check your inbox');
  expect(result).not.toHaveProperty('token');
});

it('rejects invalid resend email addresses', async () => {
  await expect(
    controller.resendVerification({
      email: 'invalid',
    }),
  ).rejects.toBeInstanceOf(BadRequestException);
});

});
