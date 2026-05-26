import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { setMeInCache, type AuthUser } from './AuthProvider';

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const r = await apiClient.POST('/auth/login', { body: input });
      if (!r.response.ok) throw r.error ?? new Error('Login failed');
      return (r.data as { user: AuthUser }).user;
    },
    onSuccess: (user) => setMeInCache(user),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (input: { email: string; name: string; password: string }) => {
      const r = await apiClient.POST('/auth/register', { body: input });
      if (!r.response.ok) throw r.error ?? new Error('Register failed');
      return (r.data as { user: AuthUser }).user;
    },
    onSuccess: (user) => setMeInCache(user),
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      await apiClient.POST('/auth/logout');
    },
    onSuccess: () => setMeInCache(null),
  });
}
