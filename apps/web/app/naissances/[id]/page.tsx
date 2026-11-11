'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { useCan } from '@/components/AccessContext';
import BirthWorkflowPanel from '@/components/BirthWorkflowPanel';
import PdfDocumentViewer from '@/components/PdfDocumentViewer';
import { Status } from '@/components/Status';
import { apiGet } from '@/lib/api';
import { dateFr, fullName } from '@/lib/format';
import type { BirthRecord } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
export default function BirthDetail() {
  const canPreview = useCan('documents:preview');
  const params = useParams<{id: string}>();
  const [r, setR] = useState<BirthRecord | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (params.id) apiGet<BirthRecord>(`/births/${params.id}`).then(setR).catch((e: Error) => setError(e.message)); }, [params.id]);
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</div>;
  if (!r) return <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted" role="status">Chargement de l'acte…</div>;
  return <div className="flex flex-col gap-6">
    <PageHeader eyebrow="État civil · Naissances" title="Acte de naissance" description={`${r.record_number} · ${fullName(r)}`}
      actions={<Link className="btn-secondary" href="/naissances"><ArrowLeft size={16}/> Retour au registre</Link>}/>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div className="flex min-w-0 flex-col gap-5"><section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><h3 className="m-0 flex items-center gap-2 text-base font-bold text-ink"><FileText size={18} className="text-navy"/> Informations enregistrées</h3><Status status={r.status}/></div>
      <dl className="grid grid-cols-1 gap-x-6 px-5 py-2 sm:grid-cols-2">{[
        ['Nom complet', fullName(r)], ['Sexe', r.sex === 'M' ? 'Masculin' : 'Féminin'],
        ['Date de naissance', dateFr(r.birth_date)], ['Lieu de naissance', r.place_of_birth],
        ['Arrondissement', r.district], ['Commune', r.municipality],
        ['Père', r.father_name || 'Non renseigné'], ['Mère', r.mother_name || 'Non renseigné'],
        ['Adresse', r.address || 'Non renseigné'], ['Enregistré le', dateFr(r.created_at)],
      ].map(([label, value]) => <div key={label} className="border-b border-line py-3"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-ink">{value}</dd></div>)}</dl>
    </section><BirthWorkflowPanel record={r} onUpdated={setR}/></div>{canPreview
      ? <PdfDocumentViewer key={r.status} path={`/births/${r.id}/specimen.pdf`} filename={`naissance-specimen-${r.id.slice(0, 8)}.pdf`}/>
      : <section className="rounded-2xl border border-line bg-white p-5 text-sm text-muted" role="status">Votre profil n’est pas habilité à consulter le PDF spécimen.</section>}</div>
  </div>;
}
