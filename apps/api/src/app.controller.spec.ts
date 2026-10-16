
import { describe, expect, it } from 'vitest';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  it('should return "Hello World!"', () => {
    const service = new AppService();
    const controller = new AppController(service);

    expect(controller.getHello()).toBe('Hello World!');
  });
});
