import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../../components/primitives/Modal';
import { PollForm } from '../../../../routes/dashboard/PollForm';
import type { PollFormModalProps } from './types';

export function PollFormModal({ mode, id }: PollFormModalProps) {
  const navigate = useNavigate();
  const close = () => navigate('/dashboard');

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title={mode === 'edit' ? 'Edit poll' : 'New poll'}
      subtitle={mode === 'edit' ? undefined : 'Build your poll and publish when ready.'}
    >
      <PollForm id={id} onSuccess={close} onCancel={close} />
    </Modal>
  );
}
