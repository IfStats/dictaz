
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  it,
} from 'vitest';

import { AppModule } from '../src/app.module.js';

describe('Dictaz API (e2e)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const started = performance.now();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    console.info(
      `Nest module compilation: ${Math.round(performance.now() - started)}ms`,
    );

    app = moduleFixture.createNestApplication();
    await app.init();

    console.info(
      `Total Nest E2E initialization: ${Math.round(performance.now() - started)}ms`,
    );
  }, 60_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET / returns the expected response', async () => {
    if (!app) {
      throw new Error('Test application was not initialized');
    }

    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('GET /health/live reports a live API', async () => {
    if (!app) {
      throw new Error('Test application was not initialized');
    }

    await request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
