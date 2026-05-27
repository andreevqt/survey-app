import type { components } from '../../../api/schema';

export type QuestionValue = string | string[] | undefined;
export type QuestionDto = components['schemas']['QuestionDto'];

export interface QuestionRendererProps {
  question: QuestionDto;
  value: QuestionValue;
  onChange: (v: QuestionValue) => void;
  error?: string;
}
