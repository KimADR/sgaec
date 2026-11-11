'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCheck, IdCard, Image as ImageIcon, MapPinned } from 'lucide-react';
import { useCan } from '@/components/AccessContext';
import { apiGet } from '@/lib/api';
import type { CinCase } from '@/lib/types';
import { dateFr, fullName } from '@/lib/format';
import { Status } from '@/components/Status';
import PdfDocumentViewer from '@/components/PdfDocumentViewer';
import CinWorkflowPanel from '@/components/CinWorkflowPanel';
import PageHeader from '@/components/PageHeader';

export default function CinDetail() {
  const canPreview = useCan('documents:preview');
  const params = useParams<{id: string}>();
  const [r, setR] = useState<CinCase | null>(null);
  const [error, setError] = useState('');
  const [pdfMode, setPdfMode] = useState<'maquette' | 'suivi'>('maquette');
  useEffect(() => {
    let active = true;
    setR(null);
    setError('');
    if (params.id) {
      apiGet<CinCase>(`/cin/${params.id}`)
        .then(record => { if (active) setR(record); })
        .catch((e: Error) => { if (active) setError(e.message); });
    }
    return () => { active = false; };
  }, [params.id]);
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</div>;
  if (!r) return <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted" role="status">Chargement du dossier…</div>;
  return <div className="flex flex-col gap-6">
    <PageHeader eyebrow="Documents administratifs · CIN" title="Dossier de demande de CIN" description={`${r.file_number} · ${fullName(r)}`}
      actions={<Link className="btn-secondary" href="/cin"><ArrowLeft size={16}/> Tous les dossiers</Link>}/>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div className="space-y-5"><section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><h3 className="m-0 flex items-center gap-2 text-base font-bold text-ink"><IdCard size={18} className="text-navy"/> Informations du demandeur</h3><Status status={r.status} issuedLabel="Clôturé"/></div>
      <dl className="grid grid-cols-1 gap-x-6 px-5 py-2 sm:grid-cols-2">{[
        ['Nom', r.last_name], ['Prénom(s)', r.first_names], ['Date de naissance', dateFr(r.birth_date)],
        ['Lieu de naissance', r.birth_place], ['Domicile', r.address], ['Arrondissement', r.district],
        ['Profession', r.profession || 'Non renseignée'],
      ].map(([label, value]) => <div key={label} className="border-b border-line py-3"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-ink">{value}</dd></div>)}</dl>
      <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-navy-2"><MapPinned size={17}/> Informations des parents</div>
      <dl className="grid grid-cols-1 gap-x-6 px-5 py-2 sm:grid-cols-2"><div className="border-b border-line py-3"><dt className="text-xs text-muted">Père</dt><dd className="mt-1 text-sm font-semibold text-ink">{r.father_name || 'Non renseigné'}</dd></div><div className="border-b border-line py-3"><dt className="text-xs text-muted">Mère</dt><dd className="mt-1 text-sm font-semibold text-ink">{r.mother_name || 'Non renseigné'}</dd></div></dl>
      <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-navy-2"><CheckCheck size={17}/> Pièces fournies (déclaratif)</div>
      <div className="flex flex-wrap gap-2 p-4 text-xs"><span className={`rounded-full px-3 py-2 ${r.has_birth_certificate ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{r.has_birth_certificate ? '✓' : '–'} Copie d'acte de naissance</span>
        <span className={`rounded-full px-3 py-2 ${r.has_residence_proof ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{r.has_residence_proof ? '✓' : '–'} Justificatif de domicile</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-slate-700"><ImageIcon size={14}/> {r.photos_count} photo(s) déclarée(s)</span></div>
    </section><CinWorkflowPanel record={r} onUpdated={setR}/></div>{canPreview
      ? <div className="flex flex-col gap-3">
          <section className="rounded-2xl border border-line bg-white p-4 shadow-sm" aria-label="Choix du document PDF">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Modèle de document">
              <button
                className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${pdfMode === 'maquette' ? 'bg-navy text-white' : 'border border-line bg-white text-navy-2 hover:bg-slate-50'}`}
                type="button"
                aria-pressed={pdfMode === 'maquette'}
                onClick={() => setPdfMode('maquette')}
              >
                Maquette CIN — visuel
              </button>
              <button
                className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${pdfMode === 'suivi' ? 'bg-navy text-white' : 'border border-line bg-white text-navy-2 hover:bg-slate-50'}`}
                type="button"
                aria-pressed={pdfMode === 'suivi'}
                onClick={() => setPdfMode('suivi')}
              >
                Fiche de suivi — A4
              </button>
            </div>
            {pdfMode === 'maquette' && (
              <p className="mb-0 mt-3 text-xs leading-5 text-muted">
                Illustration SPECIMEN réservée aux données fictives de démonstration. Sans valeur officielle, numéro, photographie réelle, signature ni empreinte.
              </p>
            )}
          </section>
          <PdfDocumentViewer
            key={`${r.id}-${pdfMode}`}
            path={pdfMode === 'maquette' ? `/cin/${r.id}/maquette.pdf` : `/cin/${r.id}/specimen.pdf`}
            filename={pdfMode === 'maquette' ? `cin-maquette-demo-${r.id.slice(0, 8)}.pdf` : `fiche-cin-specimen-${r.id.slice(0, 8)}.pdf`}
          />
        </div>
      : <section className="rounded-2xl border border-line bg-white p-5 text-sm text-muted" role="status">Votre profil n’est pas habilité à consulter le PDF spécimen.</section>}</div>
  </div>;
}
