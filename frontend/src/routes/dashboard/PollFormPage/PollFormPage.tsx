import { Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../../components/primitives/Card';
import { Button } from '../../../components/primitives/Button';
import { SectionSpinner } from '../../../components/feedback/SectionSpinner';
import { ErrorBoundary, SectionError } from '../../../components/feedback/ErrorBoundary';
import { PollForm } from '../PollForm';
import { usePollForm } from '../PollForm/hooks/usePollForm';
import { usePollSuspense } from '../../../api/queries/polls';
import type { PollFormPageContext, PollFormPageProps } from './types';

const FORM_ID = 'poll-form';

export function PollFormPage({ mode, context = 'owner' }: PollFormPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const close = () => navigate(context === 'admin' ? '/dashboard/all-polls' : '/dashboard');

  if (mode === 'edit' && id) {
    return (
      <div className="mt-8 px-8">
        <ErrorBoundary
          resetKeys={[id, context]}
          fallback={(p) => (
            <Card className="max-w-3xl mx-auto">
              <SectionError {...p} message="Could not load this poll." />
            </Card>
          )}
        >
          <Suspense fallback={<SectionSpinner />}>
            <PollFormEditView id={id} context={context} onClose={close} />
          </Suspense>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="mt-8 px-8">
      <PollFormView context={context} onClose={close} />
    </div>
  );
}

function PollFormEditView({
  id,
  context,
  onClose,
}: {
  id: string;
  context: PollFormPageContext;
  onClose: () => void;
}) {
  const { data: poll } = usePollSuspense(id, context);
  return <PollFormView id={id} context={context} poll={poll} onClose={onClose} />;
}

function PollFormView({
  id,
  context,
  poll,
  onClose,
}: {
  id?: string;
  context: PollFormPageContext;
  poll?: Parameters<typeof usePollForm>[0]['poll'];
  onClose: () => void;
}) {
  const vm = usePollForm({ id, context, poll, onSuccess: onClose });

  return (
    <Card className="max-w-3xl mx-auto">
      <PollForm vm={vm} formId={FORM_ID} />
      <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-5">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" form={FORM_ID} isLoading={vm.isSubmitting}>
          {vm.isEdit ? 'Save changes' : 'Create poll'}
        </Button>
      </div>
    </Card>
  );
}
