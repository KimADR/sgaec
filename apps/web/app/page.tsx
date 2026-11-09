'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Baby, ClipboardList, FileText, IdCard, Plus, RefreshCw, UsersRound } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { dateFr } from '@/lib/format';
import type { DashboardData } from '@/lib/types';
import { Status } from '@/components/Status';
import { useActiveCommune, useCan } from '@/components/AccessContext';

export default function Dashboard() {
  const commune = useActiveCommune();
  const canCreateBirth = useCan('births:create');
  const canCreateCin = useCan('cin:create');
  const canReadBirths = useCan('births:read');
  const canReadCin = useCan('cin:read');
  const canReadCitizens = useCan('citizens:read');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<DashboardData>('/dashboard')
      .then(result => { if (active) { setData(result); setError(''); } })
      .catch((cause: Error) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);
  const total = (data?.births ?? 0) + (data?.cin_cases ?? 0);
  const metrics = [
    { label: 'Citoyens actifs', value: data?.citizens, detail: 'Dans le répertoire communal', icon: UsersRound, href: '/citoyens', show: canReadCitizens },
    { label: 'Dossiers en cours', value: data?.pending, detail: 'Enregistrés, instruits ou validés', icon: ClipboardList, href: '/demandes', show: canReadBirths || canReadCin },
    { label: 'Dossiers de naissance', value: data?.births, detail: 'Enregistrements de naissance', icon: Baby, href: '/naissances', show: canReadBirths },
    { label: 'Dossiers CIN', value: data?.cin_cases, detail: 'Demandes d’identité', icon: IdCard, href: '/cin', show: canReadCin },
  ].filter(metric => metric.show);

  return <div className="flex flex-col gap-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="eyebrow">Vue d’ensemble <span className="px-2">/</span> {commune?.name ?? 'Commune active'}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy sm:text-3xl">Tableau de bord</h1>
        <p className="mt-2 text-sm text-muted">Pilotage des registres et des demandes de votre périmètre.</p></div>
      <button type="button" className="btn-secondary" onClick={() => setRefresh(value => value + 1)} disabled={loading}>
        <RefreshCw size={16}/> Actualiser
      </button>
    </header>
    <section className="dashboard-hero relative overflow-hidden rounded-2xl p-6 text-white sm:p-8">
      <div className="relative z-10 max-w-2xl"><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Votre espace de travail</p><h2 className="m-0 text-2xl font-bold sm:text-3xl">Bienvenue dans votre espace SGAEC</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">Consultez les dossiers et les indicateurs de votre commune, selon les droits associés à votre profil.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">{canCreateBirth && <Link href="/naissances/nouveau" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-100"><Plus size={15}/> Nouvel acte de naissance</Link>}
        {canCreateCin && <Link href="/cin/nouveau" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-white hover:bg-white/10">Nouveau dossier CIN <ArrowRight size={15}/></Link>}
        {!canCreateBirth && !canCreateCin && (canReadBirths || canReadCin) && <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-100" href="/demandes">Consulter les demandes <ArrowRight size={16}/></Link>}
        {!canCreateBirth && !canCreateCin && !canReadBirths && !canReadCin && <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-100" href="/rapports">Voir les statistiques <ArrowRight size={16}/></Link>}</div>
      </div><div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-[linear-gradient(90deg,#0b203a_0%,transparent_100%),url('/antananarivo-banner.jpg')] bg-cover bg-right opacity-40 lg:block" role="img" aria-label="Paysage d'Antananarivo"/>
    </section>

    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs clés">
      {metrics.map(({ label, value, detail, icon: Icon, href }) => <Link key={label} href={href} className="metric-card group min-h-32 rounded-2xl border border-line bg-white p-5 transition hover:border-blue/30">
        <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-blue"><Icon size={21}/></span>
        <strong className="mt-4 block text-2xl font-bold tabular-nums text-navy">{loading ? '…' : value === undefined ? '—' : value.toLocaleString('fr-FR')}</strong>
        <span className="mt-1 block text-sm font-semibold text-ink">{label}</span><small className="mt-2 block text-xs leading-5 text-muted">{detail}</small>
      </Link>)}
    </section>

    {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert"><span>Impossible de charger les données : {error}.</span><button className="btn-secondary" type="button" onClick={() => setRefresh(value => value + 1)}>Réessayer</button></div>}

    {(canReadBirths || canReadCin) && <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,.85fr)]">
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h3 className="m-0 text-base font-bold text-ink">Demandes récentes</h3><p className="mt-1 text-xs text-muted">Dernières opérations enregistrées</p></div><Link className="inline-flex items-center gap-1 text-sm font-semibold text-blue" href="/demandes">Tout voir <ArrowRight size={15}/></Link></div>
        <div className="divide-y divide-line">
          {data?.recent.map(item => <Link key={`${item.type}-${item.id}`} href={item.url} className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-slate-50">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-navy"><FileText size={18}/></span>
            <span className="min-w-0 flex-1"><strong className="block break-words text-sm text-ink">{item.citizen}</strong><span className="mt-1 block text-xs text-muted">{item.type} · {item.number} · {dateFr(item.created_at)}</span></span><Status status={item.status} issuedLabel={item.type === 'CIN' ? 'Clôturé' : undefined}/><ArrowRight size={16} className="text-muted"/>
          </Link>)}
          {data && !data.recent.length && <p className="p-6 text-center text-sm text-muted">Aucune demande pour le moment. Créez un dossier depuis les actions rapides.</p>}
          {loading && <p className="p-6 text-center text-sm text-muted" role="status">Chargement des demandes…</p>}
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-white shadow-sm"><div className="border-b border-line px-5 py-4"><h3 className="m-0 text-base font-bold text-ink">Demandes par type</h3><p className="mt-1 text-xs text-muted">Répartition des dossiers créés</p></div>
        <div className="space-y-5 p-5"><div className="flex items-center gap-3"><span className="text-sm text-muted">Total observé</span><strong className="text-2xl font-bold text-ink">{data ? total.toLocaleString('fr-FR') : '—'}</strong></div>
          {[{ label: 'Naissances', value: data?.births, color: 'bg-blue', visible: canReadBirths }, { label: 'CIN', value: data?.cin_cases, color: 'bg-cyan-500', visible: canReadCin }].filter(item => item.visible).map(item => <div key={item.label}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="text-muted">{item.label}</span><strong className="text-ink">{item.value ?? '—'}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${total ? (item.value ?? 0) / total * 100 : 0}%` }}/></div></div>)}
        </div>
      </section>
    </div>}
    <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-sky-50 p-4 text-sm leading-5 text-navy-2"><FileText size={16} className="mt-0.5 shrink-0"/><span>Il s'agit d'un prototype. Les documents de démonstration portent systématiquement un filigrane « Spécimen ».</span></div>
  </div>;
}
