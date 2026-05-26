import type { Middleware, Client } from 'openapi-fetch';

interface Options {
  onForceLogout: () => void;
}

export function createRefreshMiddleware(client: Client<any>, opts: Options): Middleware {
  let refreshInFlight: Promise<boolean> | null = null;

  function tryRefresh(): Promise<boolean> {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      try {
        const r = await client.POST('/auth/refresh' as any);
        return r.response.ok;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }

  return {
    async onResponse({ request, response }) {
      if (response.status !== 401) return response;
      if (
        request.url.endsWith('/auth/refresh') ||
        request.url.endsWith('/auth/login') ||
        request.url.endsWith('/auth/register')
      ) {
        return response;
      }
      const ok = await tryRefresh();
      if (!ok) {
        opts.onForceLogout();
        return response;
      }
      return fetch(request);
    },
  };
}
