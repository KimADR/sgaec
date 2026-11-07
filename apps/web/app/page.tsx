'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileText, Plus, UsersRound } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { dateFr } from '@/lib/format';
import type { DashboardData } from '@/lib/types';
import { Status } from '@/components/Status';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiGet<DashboardData>('/dashboard').then(setData).catch((e: Error) => setError(e.message)); }, []);
  const total = (data?.births ?? 0) + (data?.cin_cases ?? 0);
  const birthsDegrees = total ? (data!.births / total) * 360 : 180;

  return <div className="page-stack">
    <section className="welcome-banner">
      <div className="welcome-copy"><p className="eyebrow">VOTRE ESPACE DE TRAVAIL</p><h2>Bonjour, bienvenue sur SGAEC.</h2>
        <p>Gérez les actes, les dossiers CIN et les demandes des citoyens depuis un seul espace.</p>
        <div className="welcome-actions"><Link href="/naissances/nouveau" className="white-link"><Plus size={15}/> Nouvel acte de naissance</Link>
        <Link href="/cin/nouveau" className="ghost-light-link">Nouveau dossier CIN <ArrowRight size={15}/></Link></div>
      </div><div className="banner-city" role="img" aria-label="Paysage d'Antananarivo"/>
    </section>

    <section className="stat-grid" aria-label="Indicateurs de suivi">
      <div className="stat-card stat-blue"><span className="stat-icon"><UsersRound size={26}/></span><div><strong>{data?.citizens ?? '—'}</strong><span>Citoyens</span><small>Personnes enregistrées dans la commune</small></div></div>
      <div className="stat-card stat-orange"><span className="stat-icon"><FileText size={26}/></span><div><strong>{data?.declarations ?? '—'}</strong><span>Déclarations</span><small>Dossiers de naissance soumis</small></div></div>
      <div className="stat-card stat-green"><span className="stat-icon"><CheckCircle2 size={26}/></span><div><strong>{data?.validated_acts ?? '—'}</strong><span>Actes validés</span><small>Naissances validées ou émises</small></div></div>
      <div className="stat-card stat-purple"><span className="stat-icon"><FileText size={26}/></span><div><strong>{data?.documents_delivered ?? '—'}</strong><span>Documents délivrés</span><small>Remises enregistrées</small></div></div>
    </section>

    {error && <div className="alert-error">Impossible de charger les données : {error}. Vérifie que les conteneurs sont démarrés.</div>}

    <div className="dashboard-columns">
      <section className="panel recent-panel"><div className="panel-heading"><div><h3>Demandes récentes</h3><p>Dernières opérations enregistrées</p></div><Link className="inline-action" href="/demandes">Tout voir <ArrowRight size={15}/></Link></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>N° de référence</th><th>Demande</th><th>Citoyen</th><th>Date</th><th>Statut</th></tr></thead><tbody>
          {data?.recent.map(item => <tr key={`${item.type}-${item.id}`}><td><Link className="ref-link" href={item.url}>{item.number}</Link></td>
            <td>{item.type}</td><td className="citizen-cell">{item.citizen}</td><td>{dateFr(item.created_at)}</td><td><Status status={item.status}/></td></tr>)}
          {data && !data.recent.length && <tr><td colSpan={5} className="empty-cell">Aucune demande pour le moment. Créez un dossier depuis les actions rapides.</td></tr>}
          {!data && <tr><td colSpan={5} className="empty-cell">Chargement du tableau…</td></tr>}
        </tbody></table></div>
      </section>
      <section className="panel distribution-panel"><div className="panel-heading"><div><h3>Demandes par type</h3><p>Répartition des dossiers créés</p></div></div>
        <div className="distribution-content"><div className="donut" style={{ background: `conic-gradient(#1987d9 0 ${birthsDegrees}deg, #28b9d5 ${birthsDegrees}deg 360deg)` }}>
          <div className="donut-center"><strong>{data ? total : '—'}</strong><small>Demandes</small></div></div>
          <div className="chart-legend"><div><i className="dot dot-blue"/><span>Naissances</span><strong>{data?.births ?? '—'}</strong></div>
          <div><i className="dot dot-cyan"/><span>CIN</span><strong>{data?.cin_cases ?? '—'}</strong></div></div>
        </div>
      </section>
    </div>
    <div className="hint-line"><FileText size={16}/><span>Il s'agit d'un prototype. Les documents de démonstration portent systématiquement un filigrane « Spécimen ».</span></div>
  </div>;
}
