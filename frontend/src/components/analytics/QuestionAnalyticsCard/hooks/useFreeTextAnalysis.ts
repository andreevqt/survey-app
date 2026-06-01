import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../../api/client';
import type { components } from '../../../../api/schema';

export type AiAnalysis = components['schemas']['AiAnalysisDto'];
type CachedAiAnalysis = components['schemas']['CachedAiAnalysisDto'];

export interface FreeTextAnalysisViewModel {
  analysis: AiAnalysis | null;
  loading: boolean;
  error: string | null;
  stale: boolean;
  generatedAt: string | null;
  analyze: () => Promise<void>;
}

export function useFreeTextAnalysis(pollId: string, questionId: string): FreeTextAnalysisViewModel {
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // Auto-load the cached analysis (if any) without spending an LLM call.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error: apiError } = await apiClient.GET(
        '/polls/{pollId}/questions/{questionId}/analysis',
        { params: { path: { pollId, questionId } } },
      );
      if (cancelled || apiError || !data) return; // null body or failure → button-only flow
      const cached = data as CachedAiAnalysis;
      setAnalysis({ summary: cached.summary, sentiment: cached.sentiment, themes: cached.themes });
      setStale(cached.stale);
      setGeneratedAt(cached.generatedAt);
    })();
    return () => {
      cancelled = true;
    };
  }, [pollId, questionId]);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await apiClient.POST(
      '/polls/{pollId}/questions/{questionId}/analyze',
      { params: { path: { pollId, questionId } } },
    );
    if (apiError || !data) {
      setError('Could not analyze responses. Try again.');
      setLoading(false);
      return;
    }
    setAnalysis(data as AiAnalysis);
    setStale(false);
    setGeneratedAt(new Date().toISOString());
    setLoading(false);
  }, [pollId, questionId]);

  return { analysis, loading, error, stale, generatedAt, analyze };
}
