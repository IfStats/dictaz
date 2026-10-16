
import {
  createHash,
  randomBytes,
} from 'node:crypto';

export const SESSION_DURATION_MS =
  7 * 24 * 60 * 60 * 1000;

export const EMAIL_VERIFICATION_DURATION_MS =
  10 * 60 * 1000;

export const PASSWORD_RESET_DURATION_MS =
  15 * 60 * 1000;

export function generateSecureToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSecureToken(token: string): string {
  return createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

export function createExpirationDate(
  durationMs: number,
): Date {
  if (
    !Number.isSafeInteger(durationMs) ||
    durationMs <= 0
  ) {
    throw new Error('Invalid token duration');
  }

  return new Date(Date.now() + durationMs);
}
