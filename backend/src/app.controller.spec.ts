import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns ok status', async () => {
    const mod = await Test.createTestingModule({ controllers: [AppController] }).compile();
    const ctrl = mod.get(AppController);
    expect(ctrl.health()).toEqual({ status: 'ok' });
  });
});
