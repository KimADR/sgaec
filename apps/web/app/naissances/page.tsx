'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Plus, Search } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { dateFr, fullName } from '@/lib/format';
import type { BirthRecord } from '@/lib/types';
import { Status } from '@/components/Status';
import ExportSpecimensButton from '@/components/ExportSpecimensButton';

export default function BirthsPage() {
  const [births, setBirths] = useState<BirthRecord[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      setLoading(true);
      apiGet<BirthRecord[]>(`/births?q=${encodeURIComponent(query)}`)
        .then(v => { if (active) { setBirths(v); setError(''); } })
        .catch((e: Error) => { if (active) setError(e.message); })
        .finally(() => { if (active) setLoading(false); });
    }, 220);
    return () => { active = false; clearTimeout(timeout); };
  }, [query]);
  return <div className="page-stack"><div className="breadcrumbs">État civil <span>›</span> Naissances</div>
    <div className="page-head"><div><h2>Registre des naissances</h2><p>Consultez les actes enregistrés et créez de nouveaux dossiers.</p></div>
      <div className="head-actions"><ExportSpecimensButton/><Link className="primary-button" href="/naissances/nouveau"><Plus size={17}/> Nouvel acte</Link></div></div>
    <section className="panel"><div className="panel-heading"><h3><FileText size={19}/> Actes de naissance</h3><span className="small-badge">{births.length} résultat(s)</span></div>
      <div className="toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un nom ou une référence…"/></div></div>
      {error && <div className="alert-error">{error}</div>}
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Référence</th><th>Nom et prénom(s)</th><th>Date de naissance</th><th>Lieu</th><th>Statut</th><th></th></tr></thead><tbody>
        {births.map(r => <tr key={r.id}><td className="ref-link">{r.record_number}</td><td className="citizen-cell">{fullName(r)}</td><td>{dateFr(r.birth_date)}</td><td>{r.place_of_birth}</td><td><Status status={r.status}/></td>
          <td><Link className="icon-link" href={`/naissances/${r.id}`} aria-label={`Voir ${r.record_number}`}><ArrowRight size={17}/></Link></td></tr>)}
        {(!births.length) && <tr><td colSpan={6} className="empty-cell">{loading ? 'Chargement…' : 'Aucun acte correspondant.'}</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
