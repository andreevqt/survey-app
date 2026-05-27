import { Textarea } from '../../../components/primitives/Textarea';
import { useQuestionRenderer } from './hooks/useQuestionRenderer';
import type { QuestionRendererProps } from './types';

export function QuestionRenderer({ question, value, onChange, error }: QuestionRendererProps) {
  const vm = useQuestionRenderer({ value, onChange });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-gray-900">
        {question.text}{question.isRequired && <span className="ml-1 text-red-600">*</span>}
      </p>

      {question.type === 'SINGLE_CHOICE' && (
        <div className="flex flex-col gap-2">
          {question.options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name={`q-${question.id}`}
                className="accent-indigo-600 h-4 w-4"
                checked={vm.selectedSingle === o.id}
                onChange={() => vm.onSelectSingle(o.id)}
              />
              {o.text}
            </label>
          ))}
        </div>
      )}

      {question.type === 'MULTIPLE_CHOICE' && (
        <div className="flex flex-col gap-2">
          {question.options.map((o) => {
            const checked = vm.selectedMulti.includes(o.id);
            return (
              <label key={o.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-indigo-600 h-4 w-4"
                  checked={checked}
                  onChange={() => vm.onToggleMulti(o.id)}
                />
                {o.text}
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'TEXT' && (
        <Textarea
          rows={3}
          placeholder="Your answer…"
          value={vm.textValue}
          onChange={(e) => vm.onChangeText(e.target.value)}
        />
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
