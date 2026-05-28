import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../../components/primitives/Modal';
import { PollForm } from '../../../../routes/dashboard/PollForm';
import type { PollFormModalProps } from './types';

export function PollFormModal({ mode, context = 'owner', id }: PollFormModalProps) {
  const navigate = useNavigate();
  const close = () => navigate(context === 'admin' ? '/dashboard/all-polls' : '/dashboard');

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title={mode === 'edit' ? 'Edit poll' : 'New poll'}
      subtitle={mode === 'edit' ? undefined : 'Build your poll and publish when ready.'}
    >
      <PollForm id={id} context={context} onSuccess={close} onCancel={close} />
    </Modal>
  );
}
