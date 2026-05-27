import { HTMLAttributes } from 'react';

export type CardSize = 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  size?: CardSize;
}
