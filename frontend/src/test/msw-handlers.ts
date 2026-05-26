import { http, HttpResponse } from 'msw';

export const defaultHandlers = [
  http.get('http://localhost/api/v1/auth/me', () =>
    HttpResponse.json({ id: 'u1', email: 'me@example.com', name: 'Me', role: 'USER' }),
  ),
];
