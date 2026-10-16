
import { describe, expect, it } from 'vitest';

import {
  createExpirationDate,
  generateSecureToken,
  hashSecureToken,
  SESSION_DURATION_MS,
} from './tokens.js';

describe('Authentication tokens', () => {
  it('generates unique random tokens', () => {
    const first = generateSecureToken();
    const second = generateSecureToken();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('generates SHA-256 token hashes', () => {
    const token = generateSecureToken();
    const hash = hashSecureToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(token);
  });

  it('generates future expiration dates', () => {
    const expiresAt = createExpirationDate(
      SESSION_DURATION_MS,
    );

    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects invalid durations', () => {
    expect(() => createExpirationDate(0)).toThrow();
    expect(() => createExpirationDate(-100)).toThrow();
  });
});
