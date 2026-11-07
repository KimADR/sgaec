'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Search, UsersRound } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { dateFr } from '@/lib/format';
import type { Citizen } from '@/lib/types';

export default function CitizensPage() {
  const [rows, setRows] = useState<Citizen[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      apiGet<Citizen[]>(`/citizens?q=${encodeURIComponent(query)}`)
        .then(result => { if (active) { setRows(result); setError(''); } })
        .catch((cause: Error) => { if (active) setError(cause.message); })
        .finally(() => { if (active) setLoading(false); });
    }, 220);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [query]);

  return <div className="page-stack">
    <div className="page-head">
      <div><h2>Citoyens</h2><p>Consultez et gérez les fiches de la commune active.</p></div>
      <Link className="primary-button" href="/citoyens/nouveau"><Plus size={17}/> Nouveau citoyen</Link>
    </div>
    <section className="panel">
      <div className="panel-heading">
        <h3><UsersRound size={19}/> Répertoire des citoyens</h3>
        <span className="small-badge">{rows.length} résultat(s)</span>
      </div>
      <p className="context-note">Les actes de naissance liés sont conservés dans leur état d’origine. L’archivage d’une fiche ne supprime aucun acte.</p>
      <div className="toolbar"><label className="search-box">
        <Search size={17}/>
        <input aria-label="Rechercher un citoyen" value={query} maxLength={80}
          onChange={event => setQuery(event.target.value)} placeholder="Nom, prénom ou lieu de naissance…"/>
      </label></div>
      {error && <div className="alert-error" role="alert">{error}</div>}
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>Nom complet</th><th>Naissance</th><th>Lieu</th><th>Centre</th><th>Actes liés</th><th></th></tr></thead>
        <tbody>
          {rows.map(citizen => <tr key={citizen.id}>
            <td className="citizen-cell">{citizen.last_name} {citizen.first_names}</td>
            <td>{dateFr(citizen.birth_date)}</td>
            <td>{citizen.birth_place}</td>
            <td>{citizen.centre.name}</td>
            <td>{citizen.birth_records.length}</td>
            <td><Link className="icon-link" href={`/citoyens/${citizen.id}`} aria-label={`Consulter ${citizen.last_name} ${citizen.first_names}`}><ArrowRight size={17}/></Link></td>
          </tr>)}
          {!loading && rows.length === 0 && <tr><td colSpan={6} className="empty-cell">Aucun citoyen correspondant.</td></tr>}
          {loading && <tr><td colSpan={6} className="empty-cell">Chargement…</td></tr>}
        </tbody>
      </table></div>
    </section>
  </div>;
}
