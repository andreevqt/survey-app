import { useFieldArray, useFormContext } from 'react-hook-form';
import type { PollFormValues } from '../../../../forms/schemas/poll.schema';

export function useOptionEditor({ questionIndex }: { questionIndex: number }) {
  const { control, register, formState: { errors } } = useFormContext<PollFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options` as const,
  });

  const errorMessage = errors.questions?.[questionIndex]?.options?.message as string | undefined;
  const canRemove = fields.length > 2;

  function onAddOption() {
    append({ text: '' });
  }

  function onRemoveOption(index: number) {
    remove(index);
  }

  return {
    fields,
    register,
    errorMessage,
    canRemove,
    onAddOption,
    onRemoveOption,
  };
}
