import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../api/client';
import { useFreeTextAnalysis } from './useFreeTextAnalysis';

vi.mock('../../../../api/client', () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn() },
}));

const getMock = apiClient.GET as unknown as ReturnType<typeof vi.fn>;
const postMock = apiClient.POST as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  getMock.mockResolvedValue({ data: null, error: undefined });
});

afterEach(() => {
  postMock.mockReset();
  getMock.mockReset();
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

  it('auto-loads a cached analysis on mount', async () => {
    getMock.mockResolvedValueOnce({
      data: { summary: 'cached', sentiment: { positive: 0, neutral: 100, negative: 0 }, themes: [], generatedAt: '2026-05-01T00:00:00.000Z', stale: false },
      error: undefined,
    });
    const { result } = renderHook(() => useFreeTextAnalysis('p1', 'q1'));
    await waitFor(() => expect(result.current.analysis?.summary).toBe('cached'));
  });
});
