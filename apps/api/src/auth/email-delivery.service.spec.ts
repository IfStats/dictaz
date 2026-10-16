
import {
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { EmailDeliveryService } from './email-delivery.service.js';
import { generateSecureToken } from './tokens.js';

describe('EmailDeliveryService', () => {
  const service = new EmailDeliveryService();

  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv(
      'RESEND_FROM_EMAIL',
      'Dictaz <verify@example.com>',
    );
    vi.stubEnv(
      'DICTAZ_VERIFY_EMAIL_URL',
      'https://dictaz.example/verify-email',
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sends a verification message using the configured provider', async () => {
    const request = vi.fn().mockResolvedValue(
      new Response('{}', { status: 200 }),
    );

    vi.stubGlobal('fetch', request);

    const token = generateSecureToken();

    await service.sendVerification(
      'reader@example.com',
      token,
    );

    expect(request).toHaveBeenCalledTimes(1);

    const [endpoint, init] = request.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(endpoint).toBe('https://api.resend.com/emails');

    const payload = JSON.parse(String(init.body)) as {
      to: string[];
      subject: string;
      text: string;
    };

    expect(payload.to).toEqual(['reader@example.com']);
    expect(payload.subject).toContain('Verify');
    expect(payload.text).toContain(token);

    expect(init.headers).toMatchObject({
      Authorization: 'Bearer re_test_key',
    });
  });

  it('rejects provider failures without exposing details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('Provider internal information', {
          status: 403,
        }),
      ),
    );

    await expect(
      service.sendVerification(
        'reader@example.com',
        generateSecureToken(),
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails closed when credentials are missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    const request = vi.fn();
    vi.stubGlobal('fetch', request);

    await expect(
      service.sendVerification(
        'reader@example.com',
        generateSecureToken(),
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(request).not.toHaveBeenCalled();
  });

  it('rejects insecure verification URLs', async () => {
    vi.stubEnv(
      'DICTAZ_VERIFY_EMAIL_URL',
      'http://dictaz.example/verify-email',
    );

    const request = vi.fn();
    vi.stubGlobal('fetch', request);

    await expect(
      service.sendVerification(
        'reader@example.com',
        generateSecureToken(),
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(request).not.toHaveBeenCalled();
  });
});
