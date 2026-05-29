import { Spinner } from '../primitives/Spinner';

interface SectionSpinnerProps {
  className?: string;
}

/** Centered spinner used as a Suspense fallback for sections that load on mount. */
export function SectionSpinner({ className = 'flex justify-center py-12' }: SectionSpinnerProps) {
  return (
    <div className={className}>
      <Spinner size={28} />
    </div>
  );
}
