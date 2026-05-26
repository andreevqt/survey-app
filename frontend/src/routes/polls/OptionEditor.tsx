import { useFieldArray, useFormContext } from 'react-hook-form';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import type { PollFormValues } from '../../forms/schemas/poll.schema';

export function OptionEditor({ questionIndex }: { questionIndex: number }) {
  const { control, register, formState: { errors } } = useFormContext<PollFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: `questions.${questionIndex}.options` as const });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-gray-700">Options</p>
      {fields.map((f, oi) => (
        <div key={f.id} className="flex items-center gap-2">
          <Input placeholder={`Option ${oi + 1}`} {...register(`questions.${questionIndex}.options.${oi}.text` as const)} />
          <Button type="button" variant="secondary" size="sm" onClick={() => remove(oi)} disabled={fields.length <= 2}>
            Remove
          </Button>
        </div>
      ))}
      {errors.questions?.[questionIndex]?.options && (
        <p className="text-xs text-red-600">{errors.questions[questionIndex]?.options?.message as string}</p>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={() => append({ text: '' })}>
        + Add option
      </Button>
    </div>
  );
}
