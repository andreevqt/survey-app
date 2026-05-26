import { useState } from 'react';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { pollFormSchema, type PollFormValues } from '../../forms/schemas/poll.schema';
import { Input } from '../../components/primitives/Input';
import { Textarea } from '../../components/primitives/Textarea';
import { Select } from '../../components/primitives/Select';
import { Button } from '../../components/primitives/Button';
import { Field } from '../../components/primitives/Field';
import { Card } from '../../components/primitives/Card';
import { QuestionEditor } from './QuestionEditor';
import { useCreatePoll } from '../../api/mutations/polls';

const defaultQuestion: PollFormValues['questions'][number] = {
  type: 'SINGLE_CHOICE',
  text: '',
  isRequired: false,
  options: [{ text: '' }, { text: '' }],
};

export function PollFormScreen() {
  const navigate = useNavigate();
  const create = useCreatePoll();
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
  const { register, handleSubmit, formState: { errors }, control } = methods;
  const qFA = useFieldArray({ control, name: 'questions' });
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await create.mutateAsync({
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
      });
      toast.success('Poll created');
      navigate('/dashboard');
    } catch (err: any) {
      setServerError(err?.message ?? 'Could not create poll');
      toast.error('Could not create poll');
    }
  });

  return (
    <section className="max-w-3xl mx-auto py-12 px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New poll</h1>
        <Link to="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Cancel</Link>
      </div>

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
              <QuestionEditor key={f.id} index={i} disabled={false} onRemove={() => qFA.remove(i)} />
            ))}
          </div>

          <Button type="button" variant="secondary" onClick={() => qFA.append({ ...defaultQuestion })}>
            + Add question
          </Button>

          {errors.questions && typeof errors.questions.message === 'string' && (
            <p className="text-sm text-red-600">{errors.questions.message}</p>
          )}
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <div className="flex justify-end gap-3">
            <Link to="/dashboard"><Button variant="secondary" type="button">Cancel</Button></Link>
            <Button type="submit" isLoading={create.isPending}>Create poll</Button>
          </div>
        </form>
      </FormProvider>
    </section>
  );
}
