import { useCallback, useState } from 'react';
import { apiClient } from '../../../../api/client';
import type { components } from '../../../../api/schema';

export type AiAnalysis = components['schemas']['AiAnalysisDto'];

export interface FreeTextAnalysisViewModel {
  analysis: AiAnalysis | null;
  loading: boolean;
  error: string | null;
  analyze: () => Promise<void>;
}

export function useFreeTextAnalysis(pollId: string, questionId: string): FreeTextAnalysisViewModel {
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(false);
  }, [pollId, questionId]);

  return { analysis, loading, error, analyze };
}
