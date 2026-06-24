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
      return r.data as { status: 'verified' | 'verification_required'; email: string; user?: AuthUser };
    },
    onSuccess: (data) => {
      if (data.status === 'verified' && data.user) setMeInCache(data.user);
    },
  });
}

export function useVerifyEmailMutation() {
  return useMutation({
    mutationFn: async (input: { token: string }) => {
      const r = await apiClient.POST('/auth/verify-email', { body: input });
      if (!r.response.ok) throw r.error ?? new Error('Verification failed');
      return (r.data as { user: AuthUser }).user;
    },
    onSuccess: (user) => setMeInCache(user),
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: async (input: { email: string }) => {
      await apiClient.POST('/auth/resend-verification', { body: input });
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (input: { email: string }) => {
      await apiClient.POST('/auth/forgot-password', { body: input });
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (input: { token: string; newPassword: string }) => {
      const r = await apiClient.POST('/auth/reset-password', { body: input });
      if (!r.response.ok) throw r.error ?? new Error('Reset failed');
    },
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
