export interface PollFormProps {
  /** Optional poll id when editing. Empty/undefined = create mode. */
  id?: string;
  /** Called when the form successfully submits (so the host can close a modal / navigate). */
  onSuccess?: () => void;
  /** Called when the user cancels (Cancel button). */
  onCancel?: () => void;
}
