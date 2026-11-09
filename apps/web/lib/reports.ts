import type { ReportsData, WorkflowStatus } from './types';

const reportStatusLabel: Record<WorkflowStatus, string> = {
  REGISTERED: 'Enregistré',
  IN_REVIEW: 'En cours',
  VALIDATED: 'Validé',
  ISSUED: 'Délivré',
  REJECTED: 'Rejeté',
};

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function reportsCsv(report: ReportsData) {
  const statuses: WorkflowStatus[] = ['REGISTERED', 'IN_REVIEW', 'VALIDATED', 'ISSUED', 'REJECTED'];
  const rows = [
    ['Rapport SGAEC', 'Données fictives de démonstration'],
    ['Période du', report.start_date, 'au', report.end_date],
    ['Généré le', report.generated_at],
    [],
    ['Statut', 'Naissances', 'CIN', 'Total'],
    ...statuses.map(status => {
      const row = report.by_status.find(item => item.status === status);
      return [reportStatusLabel[status], row?.births ?? 0, row?.cin ?? 0, row?.total ?? 0];
    }),
    ['Total', report.by_type.find(item => item.type === 'Naissance')?.total ?? 0,
      report.by_type.find(item => item.type === 'CIN')?.total ?? 0, report.total],
  ];
  return `\uFEFF${rows.map(row => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
}
