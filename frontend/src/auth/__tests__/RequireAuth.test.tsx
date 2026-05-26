import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../RequireAuth';

vi.mock('../useAuth', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

it('redirects unauthenticated users to /login', () => {
  render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/secret" element={<RequireAuth><div>Secret</div></RequireAuth>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText('Login')).toBeInTheDocument();
});
