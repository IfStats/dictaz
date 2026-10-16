
import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('live')
  live() {
    return { status: 'ok' as const };
  }

  @Get('ready')
  async ready() {
    try {
      await this.database.ping();
      return { status: 'ok' as const };
    } catch {
      throw new ServiceUnavailableException(
        'Database unavailable',
      );
    }
  }
}
