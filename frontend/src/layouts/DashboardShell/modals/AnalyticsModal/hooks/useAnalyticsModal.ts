import { usePollAnalytics } from '../../../../../api/queries/analytics';
import { usePoll } from '../../../../../api/queries/polls';
import { useAdminPoll, useAdminPollAnalytics } from '../../../../../api/queries/admin';
import type { AnalyticsModalContext } from '../types';

export function useAnalyticsModal(id: string, context: AnalyticsModalContext = 'owner') {
  const isAdmin = context === 'admin';

  const ownerAnalytics = usePollAnalytics(isAdmin ? undefined : id);
  const adminAnalytics = useAdminPollAnalytics(isAdmin ? id : undefined);
  const analytics = isAdmin ? adminAnalytics : ownerAnalytics;

  const ownerPoll = usePoll(isAdmin ? undefined : id);
  const adminPoll = useAdminPoll(isAdmin ? id : undefined);
  const pollDetails = isAdmin ? adminPoll : ownerPoll;

  return {
    isLoading: analytics.isLoading || pollDetails.isLoading,
    isError: analytics.isError || pollDetails.isError,
    analytics: analytics.data,
    poll: pollDetails.data,
  };
}
