import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { usePublicPollSuspense } from '../../../../api/queries/public-polls';
import { useSubmitResponse } from '../../../../api/mutations/responses';
import type { PollDto, PollResponseValues } from '../types';

export interface PollScreenViewModel {
  status: 'closed' | 'submitted' | 'ready';
  poll: PollDto;
  values: PollResponseValues;
  errors: Record<string, string>;
  isSubmitting: boolean;
  onChangeValue: (questionId: string, v: string | string[] | undefined) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function usePollScreen(): PollScreenViewModel {
  const { slug } = useParams<{ slug: string }>();
  const { data: poll } = usePublicPollSuspense(slug ?? '');
  const submit = useSubmitResponse(slug ?? '');
  const [values, setValues] = useState<PollResponseValues>({});
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onChangeValue = (questionId: string, v: string | string[] | undefined) => {
    setValues((prev) => ({ ...prev, [questionId]: v }));
  };

  function validate(): boolean {
    const next: Record<string, string> = {};
    for (const question of poll.questions) {
      const v = values[question.id];
      if (question.type === 'TEXT') {
        if (question.isRequired && !(typeof v === 'string' && v.trim())) next[question.id] = 'This answer is required';
      } else if (question.type === 'SINGLE_CHOICE') {
        if (question.isRequired && !v) next[question.id] = 'Pick an option';
      } else {
        if (question.isRequired && (!Array.isArray(v) || v.length === 0)) next[question.id] = 'Pick at least one option';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await submit.mutateAsync({
        answers: poll.questions.map((question) => {
          const v = values[question.id];
          if (question.type === 'TEXT') return { questionId: question.id, textValue: (v as string) ?? '' };
          if (question.type === 'SINGLE_CHOICE') return { questionId: question.id, optionIds: v ? [v as string] : [] };
          return { questionId: question.id, optionIds: (v as string[]) ?? [] };
        }),
      });
      setSubmitted(true);
    } catch (err: any) {
      if (err?.code === 'ALREADY_RESPONDED') toast.error('You have already answered this poll.');
      else if (err?.code === 'POLL_CLOSED') toast.error('This poll just closed.');
      else toast.error('Could not submit your response.');
    }
  };

  const status: PollScreenViewModel['status'] = poll.closed ? 'closed' : submitted ? 'submitted' : 'ready';

  return { status, poll, values, errors, isSubmitting: submit.isPending, onChangeValue, onSubmit };
}
