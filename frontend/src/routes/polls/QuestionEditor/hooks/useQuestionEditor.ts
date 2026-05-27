import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import type { PollFormValues } from '../../../../forms/schemas/poll.schema';

export function useQuestionEditor({ index }: { index: number }) {
  const { register, control, formState: { errors }, setValue } = useFormContext<PollFormValues>();
  const type = useWatch({ control, name: `questions.${index}.type` });
  const optionsFields = useFieldArray({ control, name: `questions.${index}.options` as const });

  function onChangeType(t: PollFormValues['questions'][number]['type']) {
    setValue(`questions.${index}.type`, t);
    if (t === 'TEXT') {
      setValue(`questions.${index}.options`, undefined);
    } else if (!optionsFields.fields.length) {
      setValue(`questions.${index}.options`, [{ text: '' }, { text: '' }]);
    }
  }

  return {
    type,
    register,
    errors,
    optionsFields,
    onChangeType,
  };
}
