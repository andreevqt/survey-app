import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { Input } from '../../components/primitives/Input';
import { Select } from '../../components/primitives/Select';
import { Button } from '../../components/primitives/Button';
import { Card } from '../../components/primitives/Card';
import { Field } from '../../components/primitives/Field';
import { OptionEditor } from './OptionEditor';
import type { PollFormValues } from '../../forms/schemas/poll.schema';

export function QuestionEditor({ index, onRemove, disabled }: { index: number; onRemove: () => void; disabled: boolean }) {
  const { register, control, formState: { errors }, setValue } = useFormContext<PollFormValues>();
  const type = useWatch({ control, name: `questions.${index}.type` });
  const optionsFA = useFieldArray({ control, name: `questions.${index}.options` as const });

  // When switching to/from TEXT, manage the options array.
  function changeType(t: PollFormValues['questions'][number]['type']) {
    setValue(`questions.${index}.type`, t);
    if (t === 'TEXT') {
      setValue(`questions.${index}.options`, undefined);
    } else if (!optionsFA.fields.length) {
      setValue(`questions.${index}.options`, [{ text: '' }, { text: '' }]);
    }
  }

  return (
    <Card size="sm" className="border-l-4 border-l-indigo-600">
      <fieldset disabled={disabled} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm font-semibold text-gray-900">Question {index + 1}</p>
          <Button type="button" variant="secondary" size="sm" onClick={onRemove}>Remove</Button>
        </div>

        <Field label="Type">
          <Select value={type} onChange={(e) => changeType(e.target.value as any)}>
            <option value="SINGLE_CHOICE">Single choice</option>
            <option value="MULTIPLE_CHOICE">Multiple choice</option>
            <option value="TEXT">Free text</option>
          </Select>
        </Field>

        <Field label="Question text" error={errors.questions?.[index]?.text?.message}>
          <Input placeholder="What's your question?" {...register(`questions.${index}.text` as const)} />
        </Field>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="accent-indigo-600" {...register(`questions.${index}.isRequired` as const)} />
          Required
        </label>

        {type !== 'TEXT' && <OptionEditor questionIndex={index} />}
      </fieldset>
    </Card>
  );
}
