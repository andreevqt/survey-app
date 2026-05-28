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

export function useUpdateMeMutation() {
  return useMutation({
    mutationFn: async (input: { name?: string; email?: string }) => {
      const r = await apiClient.PATCH('/auth/me', { body: input });
      if (!r.response.ok) throw r.error ?? new Error('Update failed');
      return (r.data as AuthUser);
    },
    onSuccess: (user) => setMeInCache(user),
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
      const r = await apiClient.POST('/auth/change-password', { body: input });
      if (!r.response.ok) throw r.error ?? new Error('Password change failed');
    },
  });
}
