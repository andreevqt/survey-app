import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../../components/primitives/Modal';
import { Button } from '../../../../components/primitives/Button';
import { Spinner } from '../../../../components/primitives/Spinner';
import { PollForm } from '../../../../routes/dashboard/PollForm';
import { usePollForm } from '../../../../routes/dashboard/PollForm/hooks/usePollForm';
import type { PollFormModalProps } from './types';

const FORM_ID = 'poll-form';

export function PollFormModal({ mode, context = 'owner', id }: PollFormModalProps) {
  const navigate = useNavigate();
  const close = () => navigate(context === 'admin' ? '/dashboard/all-polls' : '/dashboard');

  const vm = usePollForm({ id, context, onSuccess: close });

  const footer = vm.isHydrating ? undefined : (
    <div className="flex flex-1 justify-end gap-3">
      <Button variant="secondary" type="button" onClick={close}>Cancel</Button>
      <Button type="submit" form={FORM_ID} isLoading={vm.isSubmitting}>
        {vm.isEdit ? 'Save changes' : 'Create poll'}
      </Button>
    </div>
  );

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title={mode === 'edit' ? 'Edit poll' : 'New poll'}
      subtitle={mode === 'edit' ? undefined : 'Build your poll and publish when ready.'}
      footer={footer}
    >
      {vm.isHydrating ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : (
        <PollForm vm={vm} formId={FORM_ID} />
      )}
    </Modal>
  );
}
