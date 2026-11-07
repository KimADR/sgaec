'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, IdCard, Plus, Search } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { dateFr, fullName } from '@/lib/format';
import type { CinCase } from '@/lib/types';
import { Status } from '@/components/Status';
import ExportSpecimensButton from '@/components/ExportSpecimensButton';

export default function CinPage() {
  const [rows, setRows] = useState<CinCase[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      setLoading(true);
      apiGet<CinCase[]>(`/cin?q=${encodeURIComponent(query)}`)
        .then(v => { if (active) { setRows(v); setError(''); } })
        .catch((e: Error) => { if (active) setError(e.message); })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(timeout); };
  }, [query]);
  return <div className="page-stack"><div className="breadcrumbs">Documents administratifs <span>›</span> CIN</div>
    <div className="page-head"><div><h2>Dossiers de Carte Nationale d'Identité</h2><p>Suivi de demandes et contrôle des pièces (prototype).</p></div><div className="head-actions"><ExportSpecimensButton/><Link className="primary-button" href="/cin/nouveau"><Plus size={17}/> Nouveau dossier CIN</Link></div></div>
    <section className="panel"><div className="panel-heading"><h3><IdCard size={19}/> Dossiers CIN</h3><span className="small-badge">{rows.length} dossier(s)</span></div>
      <div className="toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un demandeur ou un n° de dossier…"/></div></div>
      {error && <div className="alert-error">{error}</div>}
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Numéro de dossier</th><th>Demandeur</th><th>Naissance</th><th>Date d'enregistrement</th><th>Statut</th><th></th></tr></thead><tbody>
        {rows.map(r => <tr key={r.id}><td className="ref-link">{r.file_number}</td><td className="citizen-cell">{fullName(r)}</td><td>{dateFr(r.birth_date)}</td><td>{dateFr(r.created_at)}</td><td><Status status={r.status}/></td><td><Link href={`/cin/${r.id}`} className="icon-link"><ArrowRight size={17}/></Link></td></tr>)}
        {!rows.length && <tr><td colSpan={6} className="empty-cell">{loading ? 'Chargement…' : 'Aucun dossier correspondant.'}</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
