import { useMemo, useState } from 'react';

export interface CalendarDay {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

const DAYS_PER_WEEK = 7;

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function useCalendar(selected: Date | undefined) {
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(selected ?? new Date()));

  const days = useMemo<CalendarDay[]>(() => {
    const first = startOfMonth(viewMonth);
    const firstWeekday = first.getDay();
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - firstWeekday);

    const today = new Date();
    const cells: CalendarDay[] = [];
    for (let i = 0; i < 6 * DAYS_PER_WEEK; i++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      cells.push({
        date,
        inMonth: date.getMonth() === viewMonth.getMonth(),
        isToday: sameDay(date, today),
        isSelected: !!selected && sameDay(date, selected),
      });
    }
    return cells;
  }, [viewMonth, selected]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(viewMonth),
    [viewMonth],
  );

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
    const sunday = new Date(2024, 0, 7);
    return Array.from({ length: DAYS_PER_WEEK }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return fmt.format(d);
    });
  }, []);

  return {
    viewMonth,
    monthLabel,
    weekdayLabels,
    days,
    prev: () => setViewMonth((m) => addMonths(m, -1)),
    next: () => setViewMonth((m) => addMonths(m, 1)),
    goToSelected: () => setViewMonth(startOfMonth(selected ?? new Date())),
  };
}
