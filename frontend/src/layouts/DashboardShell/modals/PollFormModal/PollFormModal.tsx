import { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../../components/primitives/Modal';
import { Button } from '../../../../components/primitives/Button';
import { Spinner } from '../../../../components/primitives/Spinner';
import { ErrorBoundary, SectionError } from '../../../../components/feedback/ErrorBoundary';
import { PollForm } from '../../../../routes/dashboard/PollForm';
import { usePollForm } from '../../../../routes/dashboard/PollForm/hooks/usePollForm';
import { usePollSuspense } from '../../../../api/queries/polls';
import type { PollFormModalContext, PollFormModalProps } from './types';

const FORM_ID = 'poll-form';

export function PollFormModal({ mode, context = 'owner', id }: PollFormModalProps) {
  const navigate = useNavigate();
  const close = () => navigate(context === 'admin' ? '/dashboard/all-polls' : '/dashboard');
  const title = mode === 'edit' ? 'Edit poll' : 'New poll';

  if (mode === 'edit' && id) {
    return (
      <ErrorBoundary
        resetKeys={[id, context]}
        fallback={(p) => (
          <Modal open onClose={close} size="xl" title={title}>
            <SectionError {...p} message="Could not load this poll." />
          </Modal>
        )}
      >
        <Suspense
          fallback={
            <Modal open onClose={close} size="xl" title={title}>
              <div className="flex justify-center py-16"><Spinner size={28} /></div>
            </Modal>
          }
        >
          <PollFormEditView id={id} context={context} title={title} onClose={close} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <PollFormView
      title={title}
      subtitle="Build your poll and publish when ready."
      context={context}
      onClose={close}
    />
  );
}

function PollFormEditView({
  id,
  context,
  title,
  onClose,
}: {
  id: string;
  context: PollFormModalContext;
  title: string;
  onClose: () => void;
}) {
  const { data: poll } = usePollSuspense(id, context);
  return <PollFormView title={title} id={id} context={context} poll={poll} onClose={onClose} />;
}

function PollFormView({
  title,
  subtitle,
  id,
  context,
  poll,
  onClose,
}: {
  title: string;
  subtitle?: string;
  id?: string;
  context: PollFormModalContext;
  poll?: Parameters<typeof usePollForm>[0]['poll'];
  onClose: () => void;
}) {
  const vm = usePollForm({ id, context, poll, onSuccess: onClose });

  const footer = (
    <div className="flex flex-1 justify-end gap-3">
      <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
      <Button type="submit" form={FORM_ID} isLoading={vm.isSubmitting}>
        {vm.isEdit ? 'Save changes' : 'Create poll'}
      </Button>
    </div>
  );

  return (
    <Modal open onClose={onClose} size="xl" title={title} subtitle={subtitle} footer={footer}>
      <PollForm vm={vm} formId={FORM_ID} />
    </Modal>
  );
}
