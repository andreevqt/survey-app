import type { TabStripProps } from '../types';

interface UseTabStripResult {
  visible: boolean;
  getLinkClassName: (isActive: boolean) => string;
}

export function useTabStrip({ tabs }: TabStripProps): UseTabStripResult {
  return {
    visible: tabs.length >= 2,
    getLinkClassName: (isActive: boolean) =>
      `inline-block py-3 text-sm font-medium border-b-2 transition ${
        isActive
          ? 'border-indigo-600 text-indigo-700'
          : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
      }`,
  };
}
