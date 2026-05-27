import type { Stat } from '../types';

const STATS: Stat[] = [
  { value: '12,847', label: 'Polls launched this week' },
  { value: '2.1M',   label: 'Responses collected' },
  { value: '<200ms', label: 'Median response submit' },
  { value: '0',      label: 'Tracking cookies set' },
];

type ViewModel = {
  stats: Stat[];
};

export function useLandingStats(): ViewModel {
  return { stats: STATS };
}
