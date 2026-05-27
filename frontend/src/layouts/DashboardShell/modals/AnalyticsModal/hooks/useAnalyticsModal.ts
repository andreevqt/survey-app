import { usePollAnalytics } from '../../../../../api/queries/analytics';
import { usePoll } from '../../../../../api/queries/polls';

export function useAnalyticsModal(id: string) {
  const analytics = usePollAnalytics(id);
  const pollDetails = usePoll(id);
  return {
    isLoading: analytics.isLoading || pollDetails.isLoading,
    isError: analytics.isError || pollDetails.isError,
    analytics: analytics.data,
    poll: pollDetails.data,
  };
}
