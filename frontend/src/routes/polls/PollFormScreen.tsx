import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { pollFormSchema, type PollFormValues } from '../../forms/schemas/poll.schema';
import { Input } from '../../components/primitives/Input';
import { Textarea } from '../../components/primitives/Textarea';
import { Select } from '../../components/primitives/Select';
import { Button } from '../../components/primitives/Button';
import { Field } from '../../components/primitives/Field';
import { Card } from '../../components/primitives/Card';
import { Spinner } from '../../components/primitives/Spinner';
import { QuestionEditor } from './QuestionEditor';
import { useCreatePoll, useUpdatePoll } from '../../api/mutations/polls';
import { usePoll } from '../../api/queries/polls';

const defaultQuestion: PollFormValues['questions'][number] = {
  type: 'SINGLE_CHOICE',
  text: '',
  isRequired: false,
  options: [{ text: '' }, { text: '' }],
};

export function PollFormScreen() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const pollQuery = usePoll(id);
  const poll = pollQuery.data;
  const locked = isEdit && (poll?.responseCount ?? 0) > 0;

  const create = useCreatePoll();
  const update = useUpdatePoll(id ?? '');

  const methods = useForm<PollFormValues>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: {
      title: '',
      description: '',
      visibility: 'PRIVATE',
      isActive: true,
      expiresAt: '',
      questions: [defaultQuestion],
    },
  });
  const { register, handleSubmit, formState: { errors }, control, reset } = methods;
  const qFA = useFieldArray({ control, name: 'questions' });

  useEffect(() => {
    if (!isEdit || !poll) return;
    reset({
      title: poll.title,
      description: poll.description ?? '',
      visibility: poll.visibility,
      isActive: poll.isActive,
      expiresAt: poll.expiresAt ? toLocalInputValue(poll.expiresAt) : '',
      questions: poll.questions.map((q) => ({
        type: q.type as PollFormValues['questions'][number]['type'],
        text: q.text,
        isRequired: q.isRequired,
        options: q.type === 'TEXT' ? [] : q.options.map((o) => ({ text: o.text })),
      })),
    });
  }, [isEdit, poll, reset]);

  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const payload = {
      title: values.title,
      description: values.description || undefined,
      visibility: values.visibility,
      isActive: values.isActive,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
      questions: values.questions.map((q) => ({
        type: q.type,
        text: q.text,
        isRequired: q.isRequired,
        options: q.type === 'TEXT' ? [] : (q.options ?? []),
      })),
    };
    try {
      if (isEdit) {
        await update.mutateAsync(payload as any);
        toast.success('Poll updated');
      } else {
        await create.mutateAsync(payload as any);
        toast.success('Poll created');
      }
      navigate('/dashboard');
    } catch (err: any) {
      setServerError(err?.message ?? 'Could not save poll');
      toast.error('Could not save poll');
    }
  });

  const heading = useMemo(() => (isEdit ? `Edit "${poll?.title ?? '…'}"` : 'New poll'), [isEdit, poll?.title]);

  if (isEdit && pollQuery.isLoading) {
    return <div className="flex justify-center py-16"><Spinner size={28} /></div>;
  }

  return (
    <section className="max-w-3xl mx-auto py-12 px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
        <Link to="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Cancel</Link>
      </div>

      {locked && (
        <Card className="mb-6 bg-amber-50 border-amber-200 text-amber-900">
          <p className="text-sm">
            🔒 This poll has {poll!.responseCount} response{poll!.responseCount === 1 ? '' : 's'}.
            Title, description, expires-at, visibility, and active toggle can still change.
            Questions and options are locked.
          </p>
        </Card>
      )}

      <FormProvider {...methods}>
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
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
            {qFA.fields.map((f, i) => (
              <QuestionEditor key={f.id} index={i} disabled={locked} onRemove={() => qFA.remove(i)} />
            ))}
          </div>

          {!locked && (
            <Button type="button" variant="secondary" onClick={() => qFA.append({ ...defaultQuestion })}>
              + Add question
            </Button>
          )}

          {errors.questions && typeof errors.questions.message === 'string' && (
            <p className="text-sm text-red-600">{errors.questions.message}</p>
          )}
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <div className="flex justify-end gap-3">
            <Link to="/dashboard"><Button variant="secondary" type="button">Cancel</Button></Link>
            <Button type="submit" isLoading={create.isPending || update.isPending}>
              {isEdit ? 'Save changes' : 'Create poll'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </section>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
