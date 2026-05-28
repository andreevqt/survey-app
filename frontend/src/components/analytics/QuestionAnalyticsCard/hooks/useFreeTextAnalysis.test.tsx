import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../api/client';
import { useFreeTextAnalysis } from './useFreeTextAnalysis';

vi.mock('../../../../api/client', () => ({
  apiClient: { POST: vi.fn() },
}));

const postMock = apiClient.POST as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  postMock.mockReset();
});

describe('useFreeTextAnalysis', () => {
  it('stores the analysis returned by the API', async () => {
    const payload = {
      summary: '1 response recorded.',
      sentiment: { positive: 100, neutral: 0, negative: 0 },
      themes: [],
    };
    postMock.mockResolvedValueOnce({ data: payload, error: undefined });

    const { result } = renderHook(() => useFreeTextAnalysis('p1', 'q1'));
    await act(async () => { await result.current.analyze(); });

    expect(result.current.analysis).toEqual(payload);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets an error message on failure', async () => {
    postMock.mockResolvedValueOnce({ data: undefined, error: { code: 'BOOM' } });

    const { result } = renderHook(() => useFreeTextAnalysis('p1', 'q1'));
    await act(async () => { await result.current.analyze(); });

    expect(result.current.analysis).toBeNull();
    expect(result.current.error).toMatch(/try again/i);
  });
});
