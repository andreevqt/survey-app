import clsx from 'clsx';
import type { DataTableColumn, DataTableProps } from './types';

function alignClass(align?: 'left' | 'right') {
  return align === 'right' ? 'text-right' : 'text-left';
}

export function DataTable<T>({ rows, getRowId, columns, selection }: DataTableProps<T>) {
  const allSelected =
    !!selection &&
    rows.length > 0 &&
    rows.every((row) => selection.selected.includes(getRowId(row)));

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full min-w-max">
        <thead className="bg-gray-50 text-xs font-normal uppercase tracking-wide text-gray-500">
          <tr>
            {selection && (
              <th className="w-10 px-6 py-3 font-normal text-left leading-none">
                <input
                  type="checkbox"
                  className="accent-indigo-600"
                  checked={allSelected}
                  onChange={selection.onToggleAll}
                  aria-label={selection.ariaLabelAll ?? 'Select all'}
                />
              </th>
            )}
            {columns.map((col: DataTableColumn<T>) => (
              <th
                key={col.key}
                className={clsx('px-6 py-3 font-normal', alignClass(col.align), col.widthClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const id = getRowId(row);
            const isSelected = !!selection && selection.selected.includes(id);
            const isSelectable = selection?.isRowSelectable ? selection.isRowSelectable(row) : true;
            return (
              <tr key={id} className={clsx(isSelected && 'bg-indigo-50/40')}>
                {selection && (
                  <td className="px-6 py-3">
                    <input
                      type="checkbox"
                      className="accent-indigo-600"
                      checked={isSelected}
                      disabled={!isSelectable}
                      onChange={() => selection.onToggle(id)}
                      aria-label={selection.ariaLabelRow?.(row) ?? 'Select row'}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={clsx('px-6 py-3', alignClass(col.align))}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
