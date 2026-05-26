import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { createRefreshMiddleware } from './refresh-middleware';

export type ApiPaths = paths;

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const apiClient = createClient<ApiPaths>({
  baseUrl,
  credentials: 'include',
});

let forceLogoutHandler: () => void = () => {};
export function setForceLogoutHandler(fn: () => void) {
  forceLogoutHandler = fn;
}

apiClient.use(createRefreshMiddleware(apiClient, {
  onForceLogout: () => forceLogoutHandler(),
}));
