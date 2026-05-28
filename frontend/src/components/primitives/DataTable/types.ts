import type { ReactNode } from 'react';

export type DataTableAlign = 'left' | 'right';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  align?: DataTableAlign;
  widthClassName?: string;
  cell: (row: T) => ReactNode;
}

export interface DataTableSelection<T> {
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  isRowSelectable?: (row: T) => boolean;
  ariaLabelAll?: string;
  ariaLabelRow?: (row: T) => string;
}

export interface DataTableProps<T> {
  rows: T[];
  getRowId: (row: T) => string;
  columns: DataTableColumn<T>[];
  selection?: DataTableSelection<T>;
}
