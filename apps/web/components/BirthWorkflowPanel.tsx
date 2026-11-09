'use client';

import { useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useCan } from '@/components/AccessContext';
import { apiPost } from '@/lib/api';
import type { BirthRecord, WorkflowStatus } from '@/lib/types';

const steps: Record<WorkflowStatus, Array<{ status: WorkflowStatus; label: string; dangerous?: boolean }>> = {
  REGISTERED: [
    { status: 'IN_REVIEW', label: 'Mettre en instruction' },
    { status: 'REJECTED', label: 'Rejeter le dossier', dangerous: true },
  ],
  IN_REVIEW: [
    { status: 'VALIDATED', label: 'Valider le dossier' },
    { status: 'REJECTED', label: 'Rejeter le dossier', dangerous: true },
  ],
  VALIDATED: [{ status: 'ISSUED', label: 'Enregistrer une remise (démo)' }],
  ISSUED: [],
  REJECTED: [],
};

const workflowStatuses: WorkflowStatus[] = ['REGISTERED', 'IN_REVIEW', 'VALIDATED', 'ISSUED'];
const workflowLabels = ['Enregistrement', 'Instruction', 'Validation', 'Remise'];

export default function BirthWorkflowPanel({ record, onUpdated }: {
  record: BirthRecord;
  onUpdated: (record: BirthRecord) => void;
}) {
  const canWorkflow = useCan('births:workflow');
  const canDeliver = useCan('documents:deliver');
  const allowedSteps = steps[record.status].filter(step =>
    step.status === 'ISSUED' ? canDeliver : canWorkflow,
  );
  const [selected, setSelected] = useState<WorkflowStatus | ''>('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function apply() {
    const action = allowedSteps.find(step => step.status === selected);
    if (!action) return;
    if (action.status === 'REJECTED' && reason.trim().length < 5) {
      setError('Veuillez préciser un motif de rejet (au moins 5 caractères).');
      return;
    }
    if ((action.dangerous || action.status === 'ISSUED')
      && !window.confirm(`Confirmer l’opération : ${action.label} ?`)) return;

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await apiPost<BirthRecord>(`/births/${record.id}/transition`, {
        status: action.status,
        reason: action.status === 'REJECTED' ? reason.trim() : '',
      });
      onUpdated(updated);
      setSelected('');
      setReason('');
      setNotice(`Dossier mis à jour : ${action.label.toLowerCase()}. Cette opération concerne uniquement la démonstration.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Mise à jour impossible.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="rounded-2xl border border-line bg-white shadow-sm" aria-label="Circuit du dossier">
    <div className="flex items-center gap-3 border-b border-line px-5 py-4">
      <ShieldCheck size={19} className="text-navy"/>
      <div>
        <h3 className="text-base font-bold text-ink">Circuit de traitement</h3>
        <p className="mt-1 text-xs text-muted">Instruction et validation simulées, selon les habilitations.</p>
      </div>
    </div>
    <div className="space-y-3 p-5">
      <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4" aria-label="Étapes de traitement disponibles">
        {workflowStatuses.map((status, index) => {
          const currentPosition = workflowStatuses.indexOf(record.status);
          const completed = currentPosition >= index;
          return <li key={status} className={`rounded-lg border px-2 py-3 text-center ${completed ? 'border-blue-200 bg-sky-50 text-navy' : 'border-line text-muted'}`}>
            <span className="mb-1 block text-xs font-bold">{completed
              ? <CheckCircle2 size={17} className="mx-auto"/>
              : index + 1}</span>
            {workflowLabels[index]}
          </li>;
        })}
      </ol>
      {record.status === 'REJECTED' && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Ce dossier a été rejeté. La procédure de réouverture n’est pas implémentée.</p>}
      {allowedSteps.length > 0 ? <div className="space-y-3 border-t border-line pt-4">
        <label className="block text-sm font-semibold text-ink">Prochaine opération
          <select value={selected} onChange={event => {
            setSelected(event.target.value as WorkflowStatus | '');
            setError('');
          }} className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal text-ink focus:border-blue">
            <option value="">Choisir une action autorisée…</option>
            {allowedSteps.map(step => <option key={step.status} value={step.status}>{step.label}</option>)}
          </select>
        </label>
        {selected === 'REJECTED' && <label className="block text-sm font-semibold text-ink">Motif du rejet <span className="text-red-600">*</span>
          <textarea maxLength={500} value={reason} onChange={event => setReason(event.target.value)} rows={3} placeholder="Indiquer le motif de rejet…" className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm font-normal text-ink focus:border-blue"/>
        </label>}
        <button type="button" disabled={!selected || busy} onClick={apply} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue px-4 text-sm font-semibold text-white hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Enregistrement…' : 'Confirmer l’opération'}</button>
      </div> : <p className="border-t border-line pt-3 text-xs leading-5 text-muted">{steps[record.status].length
        ? 'Aucune nouvelle opération n’est autorisée pour votre profil.'
        : 'Aucune transition supplémentaire prévue à ce stade.'}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      {notice && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}
      <p className="text-xs leading-5 text-muted">Prototype : les états enregistrés ne valent ni visa, ni signature, ni délivrance d’un acte officiel.</p>
    </div>
  </section>;
}
