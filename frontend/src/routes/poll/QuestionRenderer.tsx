import type { components } from '../../api/schema';
import { Textarea } from '../../components/primitives/Textarea';

type Question = components['schemas']['QuestionDto'];
type Value = string | string[] | undefined;

export function QuestionRenderer({
  question, value, onChange, error,
}: { question: Question; value: Value; onChange: (v: Value) => void; error?: string }) {
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
                checked={value === o.id}
                onChange={() => onChange(o.id)}
              />
              {o.text}
            </label>
          ))}
        </div>
      )}

      {question.type === 'MULTIPLE_CHOICE' && (
        <div className="flex flex-col gap-2">
          {question.options.map((o) => {
            const arr = Array.isArray(value) ? value : [];
            const checked = arr.includes(o.id);
            return (
              <label key={o.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-indigo-600 h-4 w-4"
                  checked={checked}
                  onChange={() => onChange(checked ? arr.filter((v) => v !== o.id) : [...arr, o.id])}
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
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
