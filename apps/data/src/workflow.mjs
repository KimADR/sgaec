/** Règles métier du prototype : la clôture ne délivre pas de CIN officielle. */
export const CIN_TRANSITIONS = Object.freeze({
  IN_REVIEW: { from: ['REGISTERED'], permission: 'cin:workflow' },
  VALIDATED: { from: ['IN_REVIEW'], permission: 'cin:workflow' },
  REJECTED: { from: ['REGISTERED', 'IN_REVIEW'], permission: 'cin:workflow' },
  ISSUED: { from: ['VALIDATED'], permission: 'documents:deliver' },
});

export const ACTIVE_STATUSES = Object.freeze(['REGISTERED', 'IN_REVIEW', 'VALIDATED']);
export const CLOSED_STATUSES = Object.freeze(['ISSUED', 'REJECTED']);

export function domainError(message, status = 422) {
  return Object.assign(new Error(message), { status });
}

export function checkCinTransition(record, target, reason = '') {
  const rule = CIN_TRANSITIONS[target];
  if (!rule) throw domainError('Transition CIN inconnue.');
  if (!rule.from.includes(record.status)) {
    throw domainError(`Transition impossible depuis le statut ${record.status}.`, 409);
  }
  if (target === 'REJECTED' && (typeof reason !== 'string' || reason.trim().length < 5)) {
    throw domainError('Un motif de rejet d’au moins 5 caractères est requis.');
  }
  if (target === 'VALIDATED') {
    const missing = [];
    if (!record.hasBirthCertificate) missing.push('copie d’acte de naissance');
    if (!record.hasResidenceProof) missing.push('justificatif de domicile');
    if (!Number.isInteger(record.photosCount) || record.photosCount < 2) missing.push('2 photos déclarées');
    if (missing.length) throw domainError(`Dossier incomplet : ${missing.join(', ')}.`, 409);
  }
  return rule;
}

export function requestScopeFilter(scope = 'all', status = '') {
  const statuses = {
    all: [...ACTIVE_STATUSES, ...CLOSED_STATUSES],
    active: ACTIVE_STATUSES,
    closed: CLOSED_STATUSES,
  }[scope];
  if (!statuses) throw domainError('Périmètre des dossiers invalide.');
  if (status) {
    if (!statuses.includes(status)) throw domainError('Statut incompatible avec le périmètre demandé.');
    return { status };
  }
  return scope === 'all' ? {} : { status: { in: [...statuses] } };
}

export function canEditCinEvidence(status) {
  return status === 'REGISTERED' || status === 'IN_REVIEW';
}
