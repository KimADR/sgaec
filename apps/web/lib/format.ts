import type { WorkflowStatus } from './types';

export const statusText: Record<WorkflowStatus, string> = {
  REGISTERED: 'Enregistré', IN_REVIEW: 'En cours', VALIDATED: 'Validé',
  ISSUED: 'Délivré', REJECTED: 'Rejeté',
};

export function dateFr(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR', {
    timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function fullName(record: { last_name: string; first_names: string }) {
  return `${record.last_name} ${record.first_names}`;
}
