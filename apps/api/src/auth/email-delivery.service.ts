
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

const SEND_ENDPOINT = 'https://api.resend.com/emails';
const DELIVERY_ERROR = 'Verification email could not be sent';

@Injectable()
export class EmailDeliveryService {
  async sendVerification(
    recipient: string,
    token: string,
  ): Promise<void> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new BadRequestException('Invalid verification token');
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    const destination =
      process.env.DICTAZ_VERIFY_EMAIL_URL?.trim();

    if (!apiKey || !from || !destination) {
      throw new ServiceUnavailableException(
        'Verification email is not configured',
      );
    }

    let verificationUrl: URL;

    try {
      verificationUrl = new URL(destination);

      if (
        verificationUrl.protocol !== 'https:' ||
        verificationUrl.username ||
        verificationUrl.password ||
        verificationUrl.search ||
        verificationUrl.hash
      ) {
        throw new Error('Invalid verification URL');
      }

      verificationUrl.hash = new URLSearchParams({
  token,
}).toString();
    } catch {
      throw new ServiceUnavailableException(
        'Verification URL is not configured correctly',
      );
    }

    const text = [
      'Verify your Dictaz email address',
      '',
      'Open this link to verify your email:',
      verificationUrl.toString(),
      '',
      'This link expires in 10 minutes.',
      'If you did not create a Dictaz account, ignore this message.',
    ].join('\n');

    try {
      const response = await fetch(SEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [recipient],
          subject: 'Verify your Dictaz email address',
          text,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error('Email provider rejected request');
      }
    } catch {
      // Never expose provider responses, credentials,
      // or verification tokens in public errors.
      throw new ServiceUnavailableException(DELIVERY_ERROR);
    }
  }
}
