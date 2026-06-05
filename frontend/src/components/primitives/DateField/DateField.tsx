import clsx from 'clsx';
import { useSelect } from '../Select/hooks/useSelect';
import { useCalendar } from './hooks/useCalendar';
import type { DateFieldProps } from './types';
import {
  DAY_CELL_BASE,
  DAY_CELL_SELECTED,
  DAY_CELL_OUT_OF_MONTH,
  DAY_CELL_TODAY,
  DAY_CELL_DEFAULT,
} from './constants';

const calendarIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </svg>
);

const chevronLeft = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const chevronRight = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function parseDateTimeLocal(value: string): { date?: Date; time: string } {
  if (!value) return { time: '' };
  const [datePart, timePart = ''] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return { time: timePart };
  return { date: new Date(y, m - 1, d), time: timePart };
}

function formatDateTimeLocal(date: Date | undefined, time: string): string {
  if (!date) return '';
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${datePart}T${time || '00:00'}`;
}

function formatDisplay(date: Date | undefined, time: string, placeholder?: string): string {
  if (!date) return placeholder ?? '';
  const datePart = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  return time ? `${datePart}, ${time}` : datePart;
}

export function DateField({ value, onChange, placeholder, disabled, className, ariaLabel }: DateFieldProps) {
  const { open, setOpen, ref } = useSelect();
  const { date, time } = parseDateTimeLocal(value);
  const cal = useCalendar(date);
  const display = formatDisplay(date, time, placeholder);
  const hasValue = !!date;

  return (
    <div ref={ref} className={clsx('relative inline-block w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={clsx(
          'w-full min-h-9 inline-flex items-center justify-between gap-2 pl-3 pr-2.5 py-1.5 rounded-md border bg-white text-sm transition-colors outline-none',
          disabled
            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
            : open
            ? 'border-indigo-500 ring-1 ring-indigo-500'
            : 'border-gray-300 hover:border-gray-400',
          hasValue ? 'text-gray-700' : 'text-gray-400',
        )}
      >
        <span className="truncate">{display}</span>
        <span className="text-gray-500">{calendarIcon}</span>
      </button>

      {open && !disabled && (
        <div
          role="dialog"
          className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white border border-gray-200 rounded-lg shadow-md p-3 z-50"
        >
          <div className="mb-2 flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
            <label className={clsx('inline-flex items-center gap-2 text-xs', hasValue ? 'text-gray-600' : 'text-gray-400')}>
              Time
              <input
                type="time"
                value={time}
                disabled={!hasValue}
                onChange={(e) => onChange(formatDateTimeLocal(date, e.target.value))}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
            </label>
            {hasValue && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={cal.prev}
              aria-label="Previous month"
              className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              {chevronLeft}
            </button>
            <span className="text-sm font-medium text-gray-700">{cal.monthLabel}</span>
            <button
              type="button"
              onClick={cal.next}
              aria-label="Next month"
              className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              {chevronRight}
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-wide text-gray-400 mb-1">
            {cal.weekdayLabels.map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cal.days.map((d) => (
                <button
                  key={d.date.toISOString()}
                  type="button"
                  onClick={() => onChange(formatDateTimeLocal(d.date, time))}
                  className={clsx(
                    DAY_CELL_BASE,
                    d.isSelected
                      ? DAY_CELL_SELECTED
                      : !d.inMonth
                      ? DAY_CELL_OUT_OF_MONTH
                      : d.isToday
                      ? DAY_CELL_TODAY
                      : DAY_CELL_DEFAULT,
                  )}
                >
                  {d.date.getDate()}
                </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
