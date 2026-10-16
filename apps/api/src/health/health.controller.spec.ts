
import { ServiceUnavailableException } from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const database = {
    ping: vi.fn(),
  };

  const controller = new HealthController(
    database as unknown as DatabaseService,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('reports the API as live', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('reports readiness when PostgreSQL responds', async () => {
    database.ping.mockResolvedValue(undefined);

    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
    });
  });

  it('rejects readiness when PostgreSQL fails', async () => {
    database.ping.mockRejectedValue(
      new Error('Connection failed'),
    );

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
