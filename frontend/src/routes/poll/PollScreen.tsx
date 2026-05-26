import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '../../components/primitives/Card';
import { Button } from '../../components/primitives/Button';
import { Spinner } from '../../components/primitives/Spinner';
import { usePublicPoll } from '../../api/queries/public-polls';
import { useSubmitResponse } from '../../api/mutations/responses';
import { QuestionRenderer } from './QuestionRenderer';

export function PollScreen() {
  const { slug } = useParams<{ slug: string }>();
  const q = usePublicPoll(slug);
  const submit = useSubmitResponse(slug ?? '');
  const [values, setValues] = useState<Record<string, string | string[] | undefined>>({});
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (q.isLoading) return <div className="flex justify-center py-16"><Spinner size={28} /></div>;
  if (q.isError || !q.data) {
    return (
      <Card className="max-w-md mx-auto mt-16 text-center">
        <p className="text-base font-semibold text-gray-900">Poll not found</p>
      </Card>
    );
  }

  const poll = q.data;

  if (poll.closed) {
    return (
      <Card className="max-w-md mx-auto mt-16 text-center">
        <p className="text-3xl">🔒</p>
        <p className="mt-3 text-base font-semibold text-gray-900">This poll has closed</p>
        <p className="mt-1 text-sm text-gray-500">No new responses are being accepted.</p>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="max-w-md mx-auto mt-16 text-center">
        <p className="text-3xl">🎉</p>
        <p className="mt-3 text-base font-semibold text-gray-900">Thank you!</p>
        <p className="mt-1 text-sm text-gray-500">Your response has been recorded.</p>
      </Card>
    );
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    for (const q of poll.questions) {
      const v = values[q.id];
      if (q.type === 'TEXT') {
        if (q.isRequired && !(typeof v === 'string' && v.trim())) next[q.id] = 'This answer is required';
      } else if (q.type === 'SINGLE_CHOICE') {
        if (q.isRequired && !v) next[q.id] = 'Pick an option';
      } else {
        if (q.isRequired && (!Array.isArray(v) || v.length === 0)) next[q.id] = 'Pick at least one option';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await submit.mutateAsync({
        answers: poll.questions.map((q) => {
          const v = values[q.id];
          if (q.type === 'TEXT') return { questionId: q.id, textValue: (v as string) ?? '' };
          if (q.type === 'SINGLE_CHOICE') return { questionId: q.id, optionIds: v ? [v as string] : [] };
          return { questionId: q.id, optionIds: (v as string[]) ?? [] };
        }),
      });
      setSubmitted(true);
    } catch (err: any) {
      if (err?.code === 'ALREADY_RESPONDED') toast.error('You have already answered this poll.');
      else if (err?.code === 'POLL_CLOSED') toast.error('This poll just closed.');
      else toast.error('Could not submit your response.');
    }
  }

  return (
    <section className="max-w-xl mx-auto py-12 px-6">
      <Card>
        <h1 className="text-2xl font-bold text-gray-900">{poll.title}</h1>
        {poll.description && <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{poll.description}</p>}
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
          {poll.questions.map((qn) => (
            <QuestionRenderer
              key={qn.id}
              question={qn}
              value={values[qn.id]}
              onChange={(v) => setValues((p) => ({ ...p, [qn.id]: v }))}
              error={errors[qn.id]}
            />
          ))}
          <Button type="submit" isLoading={submit.isPending} className="w-full">
            Submit response
          </Button>
        </form>
      </Card>
    </section>
  );
}
