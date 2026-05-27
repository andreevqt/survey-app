import { Input } from '../../../components/primitives/Input';
import { Button } from '../../../components/primitives/Button';
import { useOptionEditor } from './hooks/useOptionEditor';
import type { OptionEditorProps } from './types';

export function OptionEditor({ questionIndex }: OptionEditorProps) {
  const vm = useOptionEditor({ questionIndex });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-gray-700">Options</p>
      {vm.fields.map((f, oi) => (
        <div key={f.id} className="flex items-center gap-2">
          <Input
            placeholder={`Option ${oi + 1}`}
            {...vm.register(`questions.${questionIndex}.options.${oi}.text` as const)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => vm.onRemoveOption(oi)}
            disabled={!vm.canRemove}
          >
            Remove
          </Button>
        </div>
      ))}
      {vm.errorMessage && (
        <p className="text-xs text-red-600">{vm.errorMessage}</p>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={vm.onAddOption}>
        + Add option
      </Button>
    </div>
  );
}
