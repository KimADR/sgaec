'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import BirthCertificate from '@/components/BirthCertificate';
import { Status } from '@/components/Status';
import { apiGet, apiGetBlob } from '@/lib/api';
import { dateFr, fullName } from '@/lib/format';
import type { BirthRecord } from '@/lib/types';
export default function BirthDetail() {
  const params = useParams<{id: string}>();
  const [r, setR] = useState<BirthRecord | null>(null);
  const [error, setError] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  useEffect(() => { if (params.id) apiGet<BirthRecord>(`/births/${params.id}`).then(setR).catch((e: Error) => setError(e.message)); }, [params.id]);
  async function downloadSpecimen() {
    if (!r) return;
    setPdfError('');
    setDownloadingPdf(true);
    try {
      const pdf = await apiGetBlob(`/births/${r.id}/specimen.pdf`);
      const url = URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = `naissance-specimen-${r.id.slice(0, 8)}.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Impossible de télécharger le PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  }
  if (error) return <div className="alert-error">{error}</div>;
  if (!r) return <div className="panel loading-panel">Chargement de l'acte…</div>;
  return <div className="page-stack"><div className="breadcrumbs">État civil <span>›</span> <Link href="/naissances">Naissances</Link> <span>›</span> {r.record_number}</div>
    <div className="page-head"><div><h2>Acte de naissance</h2><p>{r.record_number} — {fullName(r)}</p></div><div className="head-actions"><Link className="outline-button" href="/naissances"><ArrowLeft size={16}/> Retour</Link>
      <button className="primary-button" type="button" onClick={downloadSpecimen} disabled={downloadingPdf}><Download size={16}/> {downloadingPdf ? 'Préparation du PDF…' : 'Télécharger le PDF spécimen'}</button></div></div>
    {pdfError && <div className="alert-error" role="alert">{pdfError}</div>}
    <div className="detail-grid"><section className="panel detail-card"><div className="panel-heading"><h3><FileText size={18}/> Informations enregistrées</h3><Status status={r.status}/></div>
      <dl className="detail-list"><div><dt>Nom complet</dt><dd>{fullName(r)}</dd></div><div><dt>Sexe</dt><dd>{r.sex === 'M' ? 'Masculin' : 'Féminin'}</dd></div>
        <div><dt>Date de naissance</dt><dd>{dateFr(r.birth_date)}</dd></div><div><dt>Lieu de naissance</dt><dd>{r.place_of_birth}</dd></div>
        <div><dt>Arrondissement</dt><dd>{r.district}</dd></div><div><dt>Commune</dt><dd>{r.municipality}</dd></div>
        <div><dt>Père</dt><dd>{r.father_name || 'Non renseigné'}</dd></div><div><dt>Mère</dt><dd>{r.mother_name || 'Non renseigné'}</dd></div>
        <div><dt>Adresse</dt><dd>{r.address || 'Non renseigné'}</dd></div><div><dt>Enregistré le</dt><dd>{dateFr(r.created_at)}</dd></div></dl>
      <div className="context-note">Le circuit officiel de validation, signature et délivrance n'est pas activé dans cette démonstration.</div>
    </section><section className="panel document-panel"><div className="panel-heading"><h3>Aperçu — Acte de naissance (A4)</h3><span className="small-badge">SPÉCIMEN</span></div><BirthCertificate record={r}/></section></div>
  </div>;
}
