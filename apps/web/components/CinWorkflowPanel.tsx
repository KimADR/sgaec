'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, History, ShieldCheck } from 'lucide-react';
import { useCan } from '@/components/AccessContext';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { dateFr } from '@/lib/format';
import type { CinCase, WorkflowStatus } from '@/lib/types';

const labels: Record<WorkflowStatus, string> = {
  REGISTERED: 'Enregistré',
  IN_REVIEW: 'En instruction',
  VALIDATED: 'Validé',
  ISSUED: 'Clôturé (démo)',
  REJECTED: 'Rejeté',
};
const nextActions: Record<WorkflowStatus, Array<{ value: WorkflowStatus; label: string; permission: 'workflow' | 'deliver' }>> = {
  REGISTERED: [
    { value: 'IN_REVIEW', label: 'Mettre en instruction', permission: 'workflow' },
    { value: 'REJECTED', label: 'Rejeter le dossier', permission: 'workflow' },
  ],
  IN_REVIEW: [
    { value: 'VALIDATED', label: 'Valider le dossier', permission: 'workflow' },
    { value: 'REJECTED', label: 'Rejeter le dossier', permission: 'workflow' },
  ],
  VALIDATED: [{ value: 'ISSUED', label: 'Clôturer le dossier (simulation)', permission: 'deliver' }],
  ISSUED: [],
  REJECTED: [],
};
const progression: WorkflowStatus[] = ['REGISTERED', 'IN_REVIEW', 'VALIDATED', 'ISSUED'];

type HistoryEvent = {
  id: string;
  action: string;
  actor: string;
  created_at: string;
  from_status: WorkflowStatus | null;
  to_status: WorkflowStatus | null;
  reason: string | null;
};

export default function CinWorkflowPanel({
  record,
  onUpdated,
}: {
  record: CinCase;
  onUpdated: (record: CinCase) => void;
}) {
  const canWorkflow = useCan('cin:workflow');
  const canDeliver = useCan('documents:deliver');
  const canEditEvidence = useCan('cin:create') || canWorkflow;
  const editable = record.status === 'REGISTERED' || record.status === 'IN_REVIEW';
  const actions = nextActions[record.status].filter(action =>
    action.permission === 'workflow' ? canWorkflow : canDeliver);
  const [selected, setSelected] = useState<WorkflowStatus | ''>('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [editingEvidence, setEditingEvidence] = useState(false);
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({
    has_birth_certificate: record.has_birth_certificate,
    has_residence_proof: record.has_residence_proof,
    photos_count: record.photos_count,
  });

  const evidence = [
    { label: 'Copie d’acte déclarée', ok: record.has_birth_certificate },
    { label: 'Justificatif de domicile déclaré', ok: record.has_residence_proof },
    { label: 'Au moins 2 photos déclarées', ok: record.photos_count >= 2 },
  ];
  const canValidate = evidence.every(item => item.ok);

  useEffect(() => {
    setEvidenceForm({
      has_birth_certificate: record.has_birth_certificate,
      has_residence_proof: record.has_residence_proof,
      photos_count: record.photos_count,
    });
  }, [record.has_birth_certificate, record.has_residence_proof, record.photos_count]);

  useEffect(() => {
    let active = true;
    apiGet<HistoryEvent[]>(`/cin/${record.id}/history`)
      .then(data => {
        if (active) {
          setEvents(data);
          setHistoryError('');
        }
      })
      .catch((cause: Error) => {
        if (active) setHistoryError(cause.message);
      });
    return () => { active = false; };
  }, [record.id, record.status, record.updated_at]);

  async function saveEvidence() {
    if (!editable || !canEditEvidence) return;
    setSavingEvidence(true);
    setError('');
    setNotice('');
    try {
      const updated = await apiPut<CinCase>(`/cin/${record.id}/evidence`, evidenceForm);
      onUpdated(updated);
      setEditingEvidence(false);
      setNotice('Les pièces déclarées ont été mises à jour et consignées dans le journal.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Mise à jour des pièces impossible.');
    } finally {
      setSavingEvidence(false);
    }
  }

  async function apply() {
    if (!actions.find(action => action.value === selected)) return;
    if (selected === 'VALIDATED' && !canValidate) {
      setError('Les trois justificatifs déclaratifs sont requis pour la validation de démonstration.');
      return;
    }
    if (selected === 'REJECTED' && reason.trim().length < 5) {
      setError('Précisez le motif du rejet (5 caractères minimum).');
      return;
    }
    if ((selected === 'ISSUED' || selected === 'REJECTED')
      && !window.confirm(`Confirmer l’action : ${labels[selected]} ?`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await apiPost<CinCase>(`/cin/${record.id}/transition`, {
        status: selected,
        reason: selected === 'REJECTED' ? reason.trim() : '',
      });
      onUpdated(updated);
      setSelected('');
      setReason('');
      setNotice(`Le dossier est maintenant « ${labels[updated.status]} ». Modification enregistrée dans l’historique de démonstration.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de modifier le statut du dossier.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="surface overflow-hidden" aria-label="Traitement du dossier CIN">
    <div className="flex items-center gap-3 border-b border-line px-5 py-4">
      <span className="icon-tile"><ShieldCheck size={20}/></span>
      <div><h3 className="text-base font-bold text-ink">Instruction du dossier</h3><p className="mt-1 text-xs text-muted">Circuit contrôlé selon le rôle, avec journal des opérations.</p></div>
    </div>
    <div className="space-y-5 p-5">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Progression du dossier">
        {progression.map((step, index) => {
          const currentIndex = progression.indexOf(record.status);
          const current = step === record.status;
          const done = currentIndex > index && record.status !== 'REJECTED';
          return <li key={step} aria-current={step === record.status ? 'step' : undefined}
            className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center text-[11px] font-semibold ${current ? 'border-blue bg-sky text-navy' : done ? 'border-blue/20 bg-slate-50 text-navy' : 'border-line text-muted'}`}>
            <span className={`grid size-7 place-items-center rounded-full ${done ? 'bg-blue text-white' : 'border border-line bg-white text-muted'}`}>{done ? <CheckCircle2 size={16}/> : index + 1}</span>{labels[step]}
          </li>;
        })}
      </ol>
      {record.status === 'REJECTED' && <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={18}/> Dossier rejeté. Aucune nouvelle transition n’est autorisée dans la démonstration.</p>}
      <div>
        <h4 className="text-sm font-bold text-ink">Contrôle des pièces déclarées</h4>
        <p className="mt-1 text-xs leading-5 text-muted">La présence physique et la conformité des pièces restent à vérifier par un agent habilité.</p>
        <ul className="mt-3 space-y-2">{evidence.map(item => <li key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm"><span>{item.label}</span>
          <span className={`shrink-0 text-xs font-bold ${item.ok ? 'text-emerald-700' : 'text-amber-700'}`}>{item.ok ? 'Déclarée' : 'Manquante'}</span></li>)}</ul>
        {!canValidate && editable && <p className="mt-2 text-xs text-amber-800">La validation est bloquée jusqu’à la déclaration des pièces requises. L’agent habilité peut corriger cette liste ci-dessous.</p>}
        {editable && canEditEvidence && !editingEvidence && <button type="button" className="btn-secondary mt-3" onClick={() => setEditingEvidence(true)}>Modifier les justificatifs</button>}
        {editable && canEditEvidence && editingEvidence && <div className="mt-3 space-y-3 rounded-xl border border-blue/20 bg-sky/40 p-4">
          <p className="text-sm font-bold text-navy">Mise à jour déclarative</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={evidenceForm.has_birth_certificate} onChange={event => setEvidenceForm(old => ({ ...old, has_birth_certificate: event.target.checked }))}/> Copie d’acte de naissance</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={evidenceForm.has_residence_proof} onChange={event => setEvidenceForm(old => ({ ...old, has_residence_proof: event.target.checked }))}/> Justificatif de domicile</label>
          <label className="block text-sm font-semibold">Nombre de photos déclarées <input className="form-control mt-1 max-w-32" type="number" min={0} max={8} step={1} value={evidenceForm.photos_count} onChange={event => setEvidenceForm(old => ({ ...old, photos_count: Number(event.target.value) }))}/></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={savingEvidence || evidenceForm.photos_count < 0 || evidenceForm.photos_count > 8 || !Number.isInteger(evidenceForm.photos_count)} onClick={saveEvidence}>{savingEvidence ? 'Enregistrement…' : 'Enregistrer les pièces'}</button>
            <button type="button" className="btn-secondary" onClick={() => setEditingEvidence(false)} disabled={savingEvidence}>Annuler</button>
          </div>
        </div>}
      </div>
      {actions.length ? <div className="space-y-3 border-t border-line pt-4">
        <h4 className="text-sm font-bold text-ink">Actions métier autorisées</h4>
        <div className="flex flex-wrap gap-2">
          {actions.map(action => {
            const blocked = action.value === 'VALIDATED' && !canValidate;
            return <button key={action.value} type="button" disabled={blocked} aria-pressed={selected === action.value} onClick={() => { setSelected(selected === action.value ? '' : action.value); setError(''); }}
              className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${selected === action.value ? action.value === 'REJECTED' ? 'border-red-700 bg-red-700 text-white' : 'border-blue bg-blue text-white' : action.value === 'REJECTED' ? 'border-red-200 bg-white text-red-700 hover:bg-red-50' : 'border-line bg-white text-navy hover:bg-sky'}`}>{action.label}</button>;
          })}
        </div>
        {!canValidate && actions.some(action => action.value === 'VALIDATED') && <p className="text-xs text-amber-800">Validation bloquée : les pièces déclarées requises sont manquantes.</p>}
        {selected === 'REJECTED' && <label className="block text-sm font-bold text-ink">Motif du rejet <span className="text-red-600">*</span><textarea className="form-control mt-2" rows={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Motif explicite et vérifiable…"/></label>}
        {selected && <button type="button" className="btn-primary" disabled={busy || (selected === 'REJECTED' && reason.trim().length < 5) || (selected === 'VALIDATED' && !canValidate)} onClick={apply}>{busy ? 'Enregistrement…' : `Confirmer : ${actions.find(action => action.value === selected)?.label}`}</button>}
      </div> : <p className="border-t border-line pt-4 text-xs text-muted">{nextActions[record.status].length ? 'Vous ne disposez pas des droits nécessaires pour cette étape.' : 'Ce statut est terminal pour le circuit de démonstration.'}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="border-t border-line pt-4">
        <h4 className="flex items-center gap-2 text-sm font-bold text-ink"><History size={17}/> Journal de traitement</h4>
        {historyError ? <p className="mt-3 text-xs text-red-700">Historique indisponible : {historyError}</p>
          : events.length ? <ol className="mt-3 space-y-3">{events.map(event => <li key={event.id} className="flex items-start gap-3 text-xs"><Clock3 size={15} className="mt-0.5 shrink-0 text-muted"/><div className="flex-1"><strong className="text-ink">{event.to_status ? labels[event.to_status] : event.action === 'CIN_EVIDENCE_UPDATED' ? 'Mise à jour des justificatifs' : 'Création du dossier'}</strong><p className="mt-1 text-muted">{dateFr(event.created_at)} · {event.actor}</p>{event.reason && <p className="mt-1 break-words text-red-700">Motif : {event.reason}</p>}</div></li>)}</ol>
          : <p className="mt-3 text-xs text-muted">Aucun événement de traitement enregistré.</p>}
      </div>
      <p className="text-xs leading-5 text-muted">Simulation : le statut « Clôturé » ne constitue ni impression d’une CIN officielle ni remise d’un titre réel.</p>
    </div>
  </section>;
}
