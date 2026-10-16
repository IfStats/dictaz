
import * as argon2 from 'argon2';

const PASSWORD_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
} as const;

export function validatePassword(password: string): void {
  const length = Array.from(password).length;

  if (length < 15 || length > 128) {
    throw new Error(
      'Password must contain between 15 and 128 characters',
    );
  }
}

export async function hashPassword(
  password: string,
): Promise<string> {
  validatePassword(password);

  return argon2.hash(password, PASSWORD_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(passwordHash, password);
}
