'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Archive, ArrowLeft, ArrowRight, Pencil, UserRound } from 'lucide-react';
import CitizenForm from '@/components/CitizenForm';
import { Status } from '@/components/Status';
import { apiDelete, apiGet, apiPut } from '@/lib/api';
import { dateFr } from '@/lib/format';
import type { Citizen, CitizenInput } from '@/lib/types';

export default function CitizenDetailPage() {
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

  if (error && !citizen) return <div className="alert-error" role="alert">{error}</div>;
  if (!citizen) return <div className="panel loading-panel">Chargement de la fiche citoyen…</div>;

  return <div className="page-stack">
    <div className="breadcrumbs"><Link href="/citoyens">Citoyens</Link><span>›</span>{citizen.last_name} {citizen.first_names}</div>
    <div className="page-head">
      <div><h2>Fiche citoyen</h2><p>{citizen.last_name} {citizen.first_names}</p></div>
      <div className="head-actions">
        <Link className="outline-button" href="/citoyens"><ArrowLeft size={16}/> Répertoire</Link>
        {citizen.active && <button className="outline-button" type="button" onClick={() => { setEditing(value => !value); setError(''); setNotice(''); }}>
          <Pencil size={16}/>{editing ? 'Annuler la modification' : 'Modifier'}
        </button>}
        {citizen.active && <button className="outline-button" type="button" onClick={archiveCitizen} disabled={archiving}>
          <Archive size={16}/>{archiving ? 'Archivage…' : 'Archiver'}
        </button>}
      </div>
    </div>
    {error && <div className="alert-error" role="alert">{error}</div>}
    {notice && <div className="alert-success" role="status">{notice}</div>}

    {editing ? <section className="panel form-panel">
      <div className="form-title"><UserRound size={23}/><div><h2>Modifier la fiche</h2><p>La modification de l’identité ne réécrit pas les actes déjà établis.</p></div></div>
      <CitizenForm initial={{
        last_name: citizen.last_name,
        first_names: citizen.first_names,
        sex: citizen.sex,
        birth_date: citizen.birth_date,
        nationality: citizen.nationality,
        birth_place: citizen.birth_place,
      }} submitLabel="Enregistrer les modifications" onSubmit={updateCitizen}
        onCancel={() => setEditing(false)}/>
    </section> : <div className="detail-grid citizen-detail-grid">
      <section className="panel detail-card">
        <div className="panel-heading"><h3><UserRound size={18}/> Informations du citoyen</h3>
          <span className="small-badge">{citizen.active ? 'Actif' : 'Archivé'}</span>
        </div>
        <dl className="detail-list">
          <div><dt>Nom complet</dt><dd>{citizen.last_name} {citizen.first_names}</dd></div>
          <div><dt>Sexe</dt><dd>{citizen.sex === 'M' ? 'Masculin' : 'Féminin'}</dd></div>
          <div><dt>Date de naissance</dt><dd>{dateFr(citizen.birth_date)}</dd></div>
          <div><dt>Nationalité</dt><dd>{citizen.nationality}</dd></div>
          <div><dt>Lieu de naissance</dt><dd>{citizen.birth_place}</dd></div>
          <div><dt>Commune</dt><dd>{citizen.commune.name}</dd></div>
          <div><dt>Centre compétent</dt><dd>{citizen.centre.name}</dd></div>
          <div><dt>Créée le</dt><dd>{dateFr(citizen.created_at)}</dd></div>
          <div><dt>Modifiée le</dt><dd>{dateFr(citizen.updated_at)}</dd></div>
        </dl>
      </section>
      <section className="panel detail-card">
        <div className="panel-heading"><h3>Historique des actes de naissance</h3>
          <span className="small-badge">{citizen.birth_records.length} acte(s)</span>
        </div>
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>Référence</th><th>Statut</th><th>Créé le</th><th></th></tr></thead>
          <tbody>
            {citizen.birth_records.map(record => <tr key={record.id}>
              <td className="ref-link">{record.record_number}</td>
              <td><Status status={record.status}/></td>
              <td>{dateFr(record.created_at)}</td>
              <td><Link className="icon-link" href={`/naissances/${record.id}`} aria-label={`Voir l’acte ${record.record_number}`}><ArrowRight size={16}/></Link></td>
            </tr>)}
            {citizen.birth_records.length === 0 && <tr><td colSpan={4} className="empty-cell">Aucun acte de naissance associé.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </div>}
  </div>;
}
