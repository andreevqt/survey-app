import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Modal } from '../../../../components/primitives/Modal';
import { Button } from '../../../../components/primitives/Button';
import { Spinner } from '../../../../components/primitives/Spinner';
import { AnalyticsView } from '../../../../components/analytics/AnalyticsView';
import { useAnalyticsModal } from './hooks/useAnalyticsModal';
import type { AnalyticsModalProps } from './types';

export function AnalyticsModal({ id, context = 'owner' }: AnalyticsModalProps) {
  const navigate = useNavigate();
  const close = () => navigate(context === 'admin' ? '/dashboard/all-polls' : '/dashboard');
  const vm = useAnalyticsModal(id, context);

  const subtitle = vm.poll ? (
    <span>For <b>{vm.poll.title}</b> · /{vm.poll.slug}</span>
  ) : undefined;

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title="Analytics"
      subtitle={subtitle}
      footer={
        <>
          <span className="text-sm text-gray-500 mr-auto">
            {vm.analytics ? `${vm.analytics.totalResponses} responses` : ''}
          </span>
          <Button variant="secondary" onClick={() => toast.message('Export CSV — coming soon')}>Export CSV</Button>
          <Button onClick={close}>Done</Button>
        </>
      }
    >
      {vm.isLoading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : vm.isError || !vm.analytics ? (
        <p className="text-sm text-red-600 py-12 text-center">Could not load analytics.</p>
      ) : (
        <AnalyticsView analytics={vm.analytics} />
      )}
    </Modal>
  );
}
