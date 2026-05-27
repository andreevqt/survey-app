import type { QuestionRendererProps } from '../types';

export interface QuestionRendererViewModel {
  selectedSingle?: string;
  selectedMulti: string[];
  textValue: string;
  onToggleMulti: (optionId: string) => void;
  onSelectSingle: (optionId: string) => void;
  onChangeText: (v: string) => void;
}

export function useQuestionRenderer({ value, onChange }: Pick<QuestionRendererProps, 'value' | 'onChange'>): QuestionRendererViewModel {
  const selectedSingle = typeof value === 'string' ? value : undefined;
  const selectedMulti = Array.isArray(value) ? value : [];
  const textValue = typeof value === 'string' ? value : '';

  const onToggleMulti = (optionId: string) => {
    const arr = Array.isArray(value) ? value : [];
    const checked = arr.includes(optionId);
    onChange(checked ? arr.filter((v) => v !== optionId) : [...arr, optionId]);
  };

  const onSelectSingle = (optionId: string) => {
    onChange(optionId);
  };

  const onChangeText = (v: string) => {
    onChange(v);
  };

  return { selectedSingle, selectedMulti, textValue, onToggleMulti, onSelectSingle, onChangeText };
}
