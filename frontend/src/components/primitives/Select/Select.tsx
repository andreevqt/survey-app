import { useSelect } from './hooks/useSelect';
import type { SelectProps } from './types';

const chevronIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const checkIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export function Select<T extends string = string>({
  value,
  options,
  onChange,
  placeholder,
  disabled,
  className,
  ariaLabel,
}: SelectProps<T>) {
  const { open, setOpen, ref } = useSelect();
  const selected = options.find((o) => o.value === value);
  const showPlaceholder = !selected && !!placeholder;

  return (
    <div ref={ref} className={`relative inline-block w-full ${className ?? ''}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full min-h-9 inline-flex items-center justify-between gap-2 pl-3 pr-2.5 py-1.5 rounded-md border bg-white text-sm transition-colors outline-none ${
          disabled
            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
            : open
            ? 'border-indigo-500 ring-1 ring-indigo-500'
            : 'border-gray-300 hover:border-gray-400'
        } ${showPlaceholder ? 'text-gray-400' : 'text-gray-700'}`}
      >
        <span className="truncate inline-flex items-center gap-1.5">
          {selected?.icon}
          <span>{selected?.label ?? placeholder ?? ''}</span>
        </span>
        <span className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>
          {chevronIcon}
        </span>
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] min-w-full max-h-[280px] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-md p-1 z-50"
        >
          {options.map((o) => {
            const isSel = o.value === value;
            const itemClass = o.disabled
              ? 'text-gray-400 cursor-not-allowed'
              : isSel
              ? 'bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100'
              : 'text-gray-700 hover:bg-gray-100';
            return (
              <div
                key={o.value}
                role="option"
                aria-selected={isSel}
                onClick={() => {
                  if (o.disabled) return;
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-sm select-none whitespace-nowrap ${itemClass}`}
              >
                <span className="inline-flex items-center gap-2">
                  {o.icon}
                  <span>{o.label}</span>
                </span>
                {isSel && <span className="text-indigo-600">{checkIcon}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
