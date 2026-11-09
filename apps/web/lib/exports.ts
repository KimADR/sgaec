import type { RecentRequest } from './types';

function csvField(raw: string | number) {
  let value = String(raw);
  if (/^\s*[=+\-@\t\r]/.test(value)) value = `'${value}`;
  return `"${value.replaceAll('"', '""')}"`;
}

export function requestsCsv(rows: RecentRequest[], title = 'Demandes SGAEC — démonstration') {
  const output = [
    [title],
    ['Référence', 'Type', 'Demandeur', 'Statut', 'Créé le'],
    ...rows.map((row) => [row.number, row.type, row.citizen, row.status, row.created_at]),
  ];
  return `\uFEFF${output.map(row => row.map(csvField).join(';')).join('\r\n')}\r\n`;
}
