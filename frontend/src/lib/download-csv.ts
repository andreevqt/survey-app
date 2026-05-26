export async function downloadCsv(url: string, filename = 'users.csv') {
  const r = await fetch(url, { credentials: 'include' });
  if (!r.ok) throw new Error('CSV download failed');
  const blob = await r.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
