import { FormProvider } from 'react-hook-form';
import { Input } from '../../../components/primitives/Input';
import { Textarea } from '../../../components/primitives/Textarea';
import { Select } from '../../../components/primitives/Select';
import { Button } from '../../../components/primitives/Button';
import { Field } from '../../../components/primitives/Field';
import { Card } from '../../../components/primitives/Card';
import { Spinner } from '../../../components/primitives/Spinner';
import { QuestionEditor } from '../../polls/QuestionEditor';
import { usePollForm } from './hooks/usePollForm';
import type { PollFormProps } from './types';

export function PollForm({ id, context, onSuccess, onCancel }: PollFormProps) {
  const vm = usePollForm({ id, context, onSuccess });

  if (vm.isHydrating) {
    return <div className="flex justify-center py-16"><Spinner size={28} /></div>;
  }

  const { register, formState: { errors } } = vm.methods;

  return (
    <>
      {vm.locked && (
        <Card className="mb-6 bg-amber-50 border-amber-200 text-amber-900">
          <p className="text-sm">
            🔒 This poll has {vm.responseCount} response{vm.responseCount === 1 ? '' : 's'}.
            Title, description, expires-at, visibility, and active toggle can still change.
            Questions and options are locked.
          </p>
        </Card>
      )}

      <FormProvider {...vm.methods}>
        <form onSubmit={vm.onSubmit} className="flex flex-col gap-6">
          <Card>
            <div className="flex flex-col gap-4">
              <Field label="Title" error={errors.title?.message}>
                <Input {...register('title')} placeholder="e.g. Lunch options" />
              </Field>
              <Field label="Description" error={errors.description?.message}>
                <Textarea {...register('description')} placeholder="Optional context for respondents" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Visibility">
                  <Select {...register('visibility')}>
                    <option value="PRIVATE">Private (link only)</option>
                    <option value="PUBLIC">Public</option>
                  </Select>
                </Field>
                <Field label="Expires at (optional)" error={errors.expiresAt?.message}>
                  <Input type="datetime-local" {...register('expiresAt')} />
                </Field>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" className="accent-indigo-600" {...register('isActive')} />
                Active (accepting responses)
              </label>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            {vm.questionFields.fields.map((f, i) => (
              <QuestionEditor
                key={f.id}
                index={i}
                disabled={vm.locked}
                onRemove={() => vm.questionFields.remove(i)}
              />
            ))}
          </div>

          {!vm.locked && (
            <Button type="button" variant="secondary" onClick={vm.onAddQuestion}>
              + Add question
            </Button>
          )}

          {errors.questions && typeof errors.questions.message === 'string' && (
            <p className="text-sm text-red-600">{errors.questions.message}</p>
          )}
          {vm.serverError && <p className="text-sm text-red-600">{vm.serverError}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
            <Button type="submit" isLoading={vm.isSubmitting}>
              {vm.isEdit ? 'Save changes' : 'Create poll'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </>
  );
}
