import { Input } from '../../../components/primitives/Input';
import { Select } from '../../../components/primitives/Select';
import { Button } from '../../../components/primitives/Button';
import { Card } from '../../../components/primitives/Card';
import { Field } from '../../../components/primitives/Field';
import { OptionEditor } from '../OptionEditor';
import { useQuestionEditor } from './hooks/useQuestionEditor';
import type { QuestionEditorProps } from './types';

export function QuestionEditor({ index, onRemove, disabled }: QuestionEditorProps) {
  const vm = useQuestionEditor({ index });

  return (
    <Card size="sm" className="border-l-4 border-l-indigo-600">
      <fieldset disabled={disabled} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm font-semibold text-gray-900">Question {index + 1}</p>
          <Button type="button" variant="secondary" size="sm" onClick={onRemove}>Remove</Button>
        </div>

        <Field label="Type">
          <Select value={vm.type} onChange={(e) => vm.onChangeType(e.target.value as any)}>
            <option value="SINGLE_CHOICE">Single choice</option>
            <option value="MULTIPLE_CHOICE">Multiple choice</option>
            <option value="TEXT">Free text</option>
          </Select>
        </Field>

        <Field label="Question text" error={vm.errors.questions?.[index]?.text?.message}>
          <Input placeholder="What's your question?" {...vm.register(`questions.${index}.text` as const)} />
        </Field>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="accent-indigo-600" {...vm.register(`questions.${index}.isRequired` as const)} />
          Required
        </label>

        {vm.type !== 'TEXT' && <OptionEditor questionIndex={index} />}
      </fieldset>
    </Card>
  );
}
