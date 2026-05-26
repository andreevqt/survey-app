import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import createClient, { Middleware } from 'openapi-fetch';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createRefreshMiddleware } from '../refresh-middleware';

interface FakePaths {
  '/protected': { get: { responses: { 200: { content: { 'application/json': { ok: true } } }; 401: { content: { 'application/json': { code: 'UNAUTHENTICATED' } } } } } };
  '/auth/refresh': { post: { responses: { 200: { content: { 'application/json': { ok: true } } }; 401: { content: { 'application/json': { code: 'REFRESH_INVALID' } } } } } };
}

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeClient(onForceLogout: () => void) {
  const client = createClient<FakePaths>({ baseUrl: 'http://api.test' });
  client.use(createRefreshMiddleware(client, { onForceLogout }) as Middleware);
  return client;
}

describe('refresh middleware', () => {
  it('on 401, calls /auth/refresh once and retries the original request', async () => {
    let refreshCalls = 0;
    let protectedCalls = 0;
    server.use(
      http.get('http://api.test/protected', () => {
        protectedCalls++;
        if (protectedCalls === 1) return new HttpResponse(JSON.stringify({ code: 'UNAUTHENTICATED' }), { status: 401 });
        return HttpResponse.json({ ok: true });
      }),
      http.post('http://api.test/auth/refresh', () => {
        refreshCalls++;
        return HttpResponse.json({ ok: true });
      }),
    );

    const c = makeClient(() => {});
    const r = await c.GET('/protected');
    expect(r.response.status).toBe(200);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2);
  });

  it('on refresh failure, calls onForceLogout and surfaces the original 401', async () => {
    const onForceLogout = vi.fn();
    server.use(
      http.get('http://api.test/protected', () => new HttpResponse(null, { status: 401 })),
      http.post('http://api.test/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    );

    const c = makeClient(onForceLogout);
    const r = await c.GET('/protected');
    expect(r.response.status).toBe(401);
    expect(onForceLogout).toHaveBeenCalledTimes(1);
  });
});
