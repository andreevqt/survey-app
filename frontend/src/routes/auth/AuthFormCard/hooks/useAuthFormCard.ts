import { CSSProperties } from 'react';

export function useAuthFormCard(): { style: CSSProperties } {
  return {
    style: {
      boxShadow:
        '0 20px 50px -12px rgb(31 41 55 / 0.12), 0 8px 16px -8px rgb(31 41 55 / 0.08)',
    },
  };
}
