'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Archive, ArrowLeft, ArrowRight, Pencil, UserRound } from 'lucide-react';
import { useCan } from '@/components/AccessContext';
import AccessDenied from '@/components/AccessDenied';
import CitizenForm from '@/components/CitizenForm';
import { Status } from '@/components/Status';
import { apiDelete, apiGet, apiPut } from '@/lib/api';
import { dateFr } from '@/lib/format';
import type { Citizen, CitizenInput } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

export default function CitizenDetailPage() {
  const canManage = useCan('citizens:manage');
  const params = useParams<{ id: string }>();
  const [citizen, setCitizen] = useState<Citizen | null>(null);
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (params.id) apiGet<Citizen>(`/citizens/${params.id}`)
      .then(setCitizen)
      .catch((cause: Error) => setError(cause.message));
  }, [params.id]);

  async function updateCitizen(value: CitizenInput) {
    if (!citizen) return;
    const updated = await apiPut<Citizen>(`/citizens/${citizen.id}`, value);
    setCitizen(updated);
    setEditing(false);
    setNotice('La fiche citoyen a été mise à jour. Les actes associés restent inchangés.');
  }

  async function archiveCitizen() {
    if (!citizen || !window.confirm('Archiver cette fiche ? Les actes associés seront conservés.')) return;
    setError('');
    setNotice('');
    setArchiving(true);
    try {
      await apiDelete<{ id: string; active: boolean }>(`/citizens/${citizen.id}`);
      setCitizen({ ...citizen, active: false });
      setNotice('Fiche archivée ; aucune donnée ni aucun acte n’a été supprimé.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Archivage impossible.');
    } finally {
      setArchiving(false);
    }
  }

  if (error && !citizen) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</div>;
  if (!citizen) return <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted" role="status">Chargement de la fiche citoyen…</div>;

  return <div className="flex flex-col gap-6">
    <PageHeader eyebrow="Répertoire communal · Citoyens" title={`${citizen.last_name} ${citizen.first_names}`} description="Fiche citoyen et actes associés."
      actions={<>
        <Link className="btn-secondary" href="/citoyens"><ArrowLeft size={16}/> Répertoire</Link>
        {canManage && citizen.active && <button className="btn-secondary" type="button" onClick={() => { setEditing(value => !value); setError(''); setNotice(''); }}>
          <Pencil size={16}/>{editing ? 'Annuler la modification' : 'Modifier'}
        </button>}
        {canManage && citizen.active && <button className="btn-secondary" type="button" onClick={archiveCitizen} disabled={archiving}>
          <Archive size={16}/>{archiving ? 'Archivage…' : 'Archiver'}
        </button>}
      </>}/>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
    {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</div>}

    {editing && !canManage ? <AccessDenied action="modifier ou archiver une fiche citoyen"/> : editing ? <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-line px-5 py-5"><UserRound size={23} className="mt-1 shrink-0 text-navy"/><div><h2 className="m-0 text-xl font-bold text-ink">Modifier la fiche</h2><p className="mt-1 text-sm text-muted">La modification de l’identité ne réécrit pas les actes déjà établis.</p></div></div>
      <CitizenForm initial={{
        last_name: citizen.last_name,
        first_names: citizen.first_names,
        sex: citizen.sex,
        birth_date: citizen.birth_date,
        nationality: citizen.nationality,
        birth_place: citizen.birth_place,
      }} submitLabel="Enregistrer les modifications" onSubmit={updateCitizen}
        onCancel={() => setEditing(false)}/>
    </section> : <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><h3 className="m-0 flex items-center gap-2 text-base font-bold text-ink"><UserRound size={18} className="text-navy"/> Informations du citoyen</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${citizen.active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{citizen.active ? 'Actif' : 'Archivé'}</span>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 px-5 py-2 sm:grid-cols-2">{[
          ['Nom complet', `${citizen.last_name} ${citizen.first_names}`], ['Sexe', citizen.sex === 'M' ? 'Masculin' : 'Féminin'],
          ['Date de naissance', dateFr(citizen.birth_date)], ['Nationalité', citizen.nationality],
          ['Lieu de naissance', citizen.birth_place], ['Commune', citizen.commune.name],
          ['Centre compétent', citizen.centre.name], ['Créée le', dateFr(citizen.created_at)],
          ['Modifiée le', dateFr(citizen.updated_at)],
        ].map(([label, value]) => <div key={label} className="border-b border-line py-3"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-ink">{value}</dd></div>)}</dl>
      </section>
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><h3 className="m-0 text-base font-bold text-ink">Historique des actes de naissance</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-muted">{citizen.birth_records.length} acte(s)</span>
        </div>
        {citizen.birth_records.length ? <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">{citizen.birth_records.map(record => <article key={record.id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
          <div className="flex items-start justify-between gap-3"><span className="break-all text-sm font-bold text-navy">{record.record_number}</span><Status status={record.status}/></div>
          <p className="m-0 text-xs text-muted">Créé le {dateFr(record.created_at)}</p>
          <Link className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg px-3 text-sm font-semibold text-blue hover:bg-sky-50" href={`/naissances/${record.id}`} aria-label={`Voir l’acte ${record.record_number}`}>Consulter <ArrowRight size={16}/></Link>
        </article>)}</div> : <p className="p-6 text-center text-sm text-muted">Aucun acte de naissance associé.</p>}
      </section>
    </div>}
  </div>;
}
