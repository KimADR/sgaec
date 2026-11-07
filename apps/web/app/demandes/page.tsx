'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { dateFr } from '@/lib/format';
import type { DashboardData } from '@/lib/types';
import { Status } from '@/components/Status';
export default function RequestsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiGet<DashboardData>('/dashboard').then(setData).catch((e: Error) => setError(e.message)); }, []);
  return <div className="page-stack"><div className="page-head"><div><h2>Demandes administratives</h2><p>Dernières opérations enregistrées dans les deux modules actifs.</p></div></div>
    <div className="panel"><div className="panel-heading"><h3><ClipboardList size={19}/> Dernières demandes</h3><span className="small-badge">6 plus récentes</span></div>
      {error && <div className="alert-error">{error}</div>}
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Référence</th><th>Type</th><th>Citoyen</th><th>Date</th><th>Statut</th><th></th></tr></thead><tbody>
        {data?.recent.map(r => <tr key={r.id}><td className="ref-link">{r.number}</td><td>{r.type}</td><td className="citizen-cell">{r.citizen}</td><td>{dateFr(r.created_at)}</td><td><Status status={r.status}/></td><td><Link href={r.url} className="icon-link"><ArrowRight size={17}/></Link></td></tr>)}
        {!data?.recent.length && <tr><td colSpan={6} className="empty-cell">Aucune demande à afficher.</td></tr>}
      </tbody></table></div>
    </div>
  </div>;
}
