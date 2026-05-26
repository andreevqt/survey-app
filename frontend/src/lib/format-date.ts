export function formatDate(iso?: string): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
}
