import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { components } from '../schema';

type SubmitBody = components['schemas']['SubmitResponseDto'];

export function useSubmitResponse(slug: string) {
  return useMutation({
    mutationFn: async (body: SubmitBody) => {
      const r = await apiClient.POST('/public/polls/{slug}/responses', {
        params: { path: { slug } },
        body,
      });
      if (!r.response.ok) {
        const code = (r.error as any)?.code;
        throw Object.assign(new Error('Submit failed'), { code });
      }
      return r.data!;
    },
  });
}
