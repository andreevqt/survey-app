import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { BaseSyntheticEvent } from 'react';
import { pollFormSchema, type PollFormValues } from '../../../../forms/schemas/poll.schema';
import { useCreatePoll, useUpdatePoll } from '../../../../api/mutations/polls';
import { usePoll } from '../../../../api/queries/polls';

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const defaultQuestion: PollFormValues['questions'][number] = {
  type: 'SINGLE_CHOICE',
  text: '',
  isRequired: false,
  options: [{ text: '' }, { text: '' }],
};

export function usePollForm({ id, onSuccess }: { id?: string; onSuccess?: () => void }) {
  const isEdit = !!id;
  const pollQuery = usePoll(id);
  const poll = pollQuery.data;
  const locked = isEdit && (poll?.responseCount ?? 0) > 0;
  const responseCount = poll?.responseCount ?? 0;

  const create = useCreatePoll();
  const update = useUpdatePoll(id ?? '');
  const [serverError, setServerError] = useState<string | null>(null);

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
  const { handleSubmit, control, reset } = methods;
  const questionFields = useFieldArray({ control, name: 'questions' });

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

  const onSubmit = handleSubmit(async (values, e?: BaseSyntheticEvent) => {
    e?.preventDefault();
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
      onSuccess?.();
    } catch (err: any) {
      setServerError(err?.message ?? 'Could not save poll');
      toast.error('Could not save poll');
    }
  });

  const isSubmitting = create.isPending || update.isPending;

  const heading = useMemo(
    () => (isEdit ? `Edit "${poll?.title ?? '…'}"` : 'New poll'),
    [isEdit, poll?.title],
  );

  const isHydrating = isEdit && pollQuery.isLoading;

  function onAddQuestion() {
    questionFields.append({ ...defaultQuestion });
  }

  return useMemo(
    () => ({
      methods,
      questionFields,
      isEdit,
      heading,
      isHydrating,
      isSubmitting,
      locked,
      responseCount,
      serverError,
      onSubmit: onSubmit as (e?: BaseSyntheticEvent) => void,
      onAddQuestion,
    }),
    [methods, questionFields, isEdit, heading, isHydrating, isSubmitting, locked, responseCount, serverError, onSubmit],
  );
}
