'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCheck, Download, IdCard, Image as ImageIcon, MapPinned } from 'lucide-react';
import { apiGet, apiGetBlob } from '@/lib/api';
import type { CinCase } from '@/lib/types';
import { dateFr, fullName } from '@/lib/format';
import { Status } from '@/components/Status';
import CinPreview from '@/components/CinPreview';
export default function CinDetail() {
  const params = useParams<{id: string}>();
  const [r, setR] = useState<CinCase | null>(null);
  const [error, setError] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  useEffect(() => { if (params.id) apiGet<CinCase>(`/cin/${params.id}`).then(setR).catch((e: Error) => setError(e.message)); }, [params.id]);
  async function downloadSpecimen() {
    if (!r) return;
    setPdfError('');
    setDownloadingPdf(true);
    try {
      const pdf = await apiGetBlob(`/cin/${r.id}/specimen.pdf`);
      const url = URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cin-specimen-${r.id.slice(0, 8)}.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Impossible de télécharger le PDF spécimen.');
    } finally {
      setDownloadingPdf(false);
    }
  }
  if (error) return <div className="alert-error">{error}</div>;
  if (!r) return <div className="panel loading-panel">Chargement du dossier…</div>;
  return <div className="page-stack"><div className="breadcrumbs">CIN <span>›</span> <Link href="/cin">Dossiers</Link> <span>›</span> {r.file_number}</div>
    <div className="page-head"><div><h2>Dossier de demande de CIN</h2><p>{r.file_number} — {fullName(r)}</p></div><div className="head-actions"><Link className="outline-button" href="/cin"><ArrowLeft size={16}/> Tous les dossiers</Link><button className="primary-button" type="button" onClick={downloadSpecimen} disabled={downloadingPdf}><Download size={16}/>{downloadingPdf ? 'Préparation du PDF…' : 'Télécharger la maquette PDF (105 × 74 mm)'}</button></div></div>
    {pdfError && <div className="alert-error" role="alert">{pdfError}</div>}
    <div className="detail-grid"><section className="panel detail-card"><div className="panel-heading"><h3><IdCard size={18}/> Informations du demandeur</h3><Status status={r.status}/></div>
      <dl className="detail-list"><div><dt>Nom</dt><dd>{r.last_name}</dd></div><div><dt>Prénom(s)</dt><dd>{r.first_names}</dd></div>
        <div><dt>Date de naissance</dt><dd>{dateFr(r.birth_date)}</dd></div><div><dt>Lieu de naissance</dt><dd>{r.birth_place}</dd></div><div><dt>Domicile</dt><dd>{r.address}</dd></div>
        <div><dt>Arrondissement</dt><dd>{r.district}</dd></div><div><dt>Profession</dt><dd>{r.profession || 'Non renseignée'}</dd></div></dl>
      <div className="subpanel-title"><MapPinned size={17}/> Informations des parents</div>
      <dl className="detail-list compact"><div><dt>Père</dt><dd>{r.father_name || 'Non renseigné'}</dd></div><div><dt>Mère</dt><dd>{r.mother_name || 'Non renseigné'}</dd></div></dl>
      <div className="subpanel-title"><CheckCheck size={17}/> Pièces fournies (déclaratif)</div>
      <div className="pieces-list"><span className={r.has_birth_certificate ? 'provided' : ''}>{r.has_birth_certificate ? '✓' : '–'} Copie d'acte de naissance</span>
        <span className={r.has_residence_proof ? 'provided' : ''}>{r.has_residence_proof ? '✓' : '–'} Justificatif de domicile</span>
        <span><ImageIcon size={14}/> {r.photos_count} photo(s) déclarée(s)</span></div>
      <div className="subpanel-title">Statut du dossier</div><div className="progress-steps"><div className="progress-node done">✓<span>Enregistré</span></div><div className="progress-node">2<span>En cours</span></div><div className="progress-node">3<span>Validé</span></div><div className="progress-node">4<span>Remis</span></div></div>
    </section><section className="panel document-panel"><div className="panel-heading"><h3>Aperçu — Carte d’exercice (spécimen)</h3></div><CinPreview record={r}/>
      <p className="context-note">Maquette illustrative de 105 × 74 mm, sans valeur officielle. Elle ne constitue pas une carte nationale d’identité et ne peut pas être utilisée comme pièce d’identité.</p>
    </section></div>
  </div>;
}
