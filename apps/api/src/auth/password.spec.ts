
import { describe, expect, it } from 'vitest';

import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from './password.js';

describe('Password security', () => {
  const password = 'DictazSecurePassphrase2026!';

  it('rejects short passwords', () => {
    expect(() => {
      validatePassword('short');
    }).toThrow();
  });

  it('creates an Argon2id hash', async () => {
    const hash = await hashPassword(password);

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(password);
  });

  it('verifies the correct password', async () => {
    const hash = await hashPassword(password);

    await expect(
      verifyPassword(hash, password),
    ).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword(password);

    await expect(
      verifyPassword(hash, 'IncorrectPassword2026!'),
    ).resolves.toBe(false);
  });

  it('generates distinct salted hashes', async () => {
    const first = await hashPassword(password);
    const second = await hashPassword(password);

    expect(first).not.toBe(second);
  });
});
