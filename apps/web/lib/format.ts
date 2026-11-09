import type { WorkflowStatus } from './types';

export const statusText: Record<WorkflowStatus, string> = {
  REGISTERED: 'Enregistré', IN_REVIEW: 'En cours', VALIDATED: 'Validé',
  ISSUED: 'Délivré', REJECTED: 'Rejeté',
};

export function dateFr(value: string | null | undefined) {
  if (!value) return '—';
  const isCivilDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isCivilDate ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR', {
    timeZone: isCivilDate ? 'UTC' : 'Indian/Antananarivo',
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function todayInAntananarivo(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Indian/Antananarivo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: 'year' | 'month' | 'day') => parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function fullName(record: { last_name: string; first_names: string }) {
  return `${record.last_name} ${record.first_names}`;
}
