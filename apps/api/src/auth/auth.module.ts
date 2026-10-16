
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailDeliveryService } from './email-delivery.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { VerificationDispatchService } from './verification-dispatch.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailDeliveryService,
    EmailVerificationService,
    VerificationDispatchService,
  ],
  exports: [
    AuthService,
    EmailVerificationService,
    VerificationDispatchService,
  ],
})
export class AuthModule {}
