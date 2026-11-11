'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity, ArrowRight, Baby, CheckCircle2, ClipboardList, FileText,
  IdCard, Plus, RefreshCw, UsersRound,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { dateFr } from '@/lib/format';
import type { DashboardData, RecentRequest } from '@/lib/types';
import { Status } from '@/components/Status';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { useActiveCommune, useCan } from '@/components/AccessContext';

const isOpenRequest = (item: RecentRequest) => item.status !== 'ISSUED' && item.status !== 'REJECTED';

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
  const openRequests = (data?.recent ?? []).filter(isOpenRequest).slice(0, 5);
  const recentRequests = data?.recent ?? [];
  const metrics = [
    { label: 'Citoyens actifs', value: data?.citizens, detail: 'Fiches de la commune active', icon: UsersRound, href: '/citoyens', show: canReadCitizens, tone: 'navy' as const },
    { label: 'Dossiers à suivre', value: data?.pending, detail: 'Enregistrés, en instruction ou validés', icon: ClipboardList, href: '/demandes', show: canReadBirths || canReadCin, tone: 'amber' as const },
    { label: 'Actes de naissance', value: data?.births, detail: 'Actes de la commune active', icon: Baby, href: '/naissances', show: canReadBirths, tone: 'blue' as const },
    { label: 'Dossiers CIN', value: data?.cin_cases, detail: 'Demandes de la commune active', icon: IdCard, href: '/cin', show: canReadCin, tone: 'teal' as const },
  ].filter(metric => metric.show);

  return <div className="flex flex-col gap-7">
    <PageHeader
      eyebrow={`Pilotage administratif · ${commune?.name ?? 'Commune'}`}
      title="Tableau de bord"
      description="Une vue synthétique des dossiers et de l’activité de la commune active."
      actions={<>
        {canCreateBirth && <Link href="/naissances/nouveau" className="btn-secondary"><Plus size={16}/> Nouvel acte</Link>}
        {canCreateCin && <Link href="/cin/nouveau" className="btn-primary"><Plus size={16}/> Nouveau dossier CIN</Link>}
        <button type="button" className="btn-secondary" aria-label="Actualiser le tableau de bord" onClick={() => setRefresh(value => value + 1)} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> <span>Actualiser</span>
        </button>
      </>}
    />

    {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
      <span>Impossible de charger les données : {error}.</span>
      <button className="btn-secondary" type="button" onClick={() => setRefresh(value => value + 1)}>Réessayer</button>
    </div>}

    <section aria-label="Indicateurs clés">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="panel-title">Indicateurs clés</h2><p className="mt-1 text-xs text-muted">Données disponibles pour le périmètre sélectionné</p></div>
        {loading && <span className="inline-flex items-center gap-2 text-xs font-medium text-muted" role="status"><span className="size-2 animate-pulse rounded-full bg-blue"/> Actualisation</span>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon, href, tone }) => <StatCard
          key={label}
          label={label}
          value={loading ? '…' : value === undefined ? '—' : value.toLocaleString('fr-FR')}
          detail={detail}
          icon={icon}
          href={href}
          tone={tone}
        />)}
      </div>
    </section>

    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.85fr)]">
      <section className="surface min-w-0 overflow-hidden" aria-busy={loading}>
        <div className="panel-heading">
          <div className="flex items-center gap-3">
            <span className="icon-tile"><Activity size={19}/></span>
            <div><h2 className="panel-title">Activité récente</h2><p className="mt-1 text-xs text-muted">Ouverture directe des dernières opérations</p></div>
          </div>
          <Link className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-blue hover:bg-sky" href="/demandes">Tous les dossiers <ArrowRight size={15}/></Link>
        </div>
        {loading && !data ? <div className="space-y-3 p-5" role="status"><div className="h-14 animate-pulse rounded-lg bg-slate-100"/><div className="h-14 animate-pulse rounded-lg bg-slate-100"/><span className="sr-only">Chargement de l’activité…</span></div>
          : recentRequests.length ? <div className="divide-y divide-line">
            {recentRequests.slice(0, 7).map(item => <Link key={`${item.type}-${item.id}`} href={item.url} className="group flex min-w-0 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-navy-2"><FileText size={17}/></span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-semibold text-ink group-hover:text-blue">{item.citizen}</strong>
                <span className="mt-1 block truncate text-xs text-muted">{item.type} <span aria-hidden="true">·</span> {item.number} <span aria-hidden="true">·</span> {dateFr(item.created_at)}</span>
              </span>
              <Status status={item.status} issuedLabel={item.type === 'CIN' ? 'Clôturé' : undefined}/>
              <ArrowRight size={16} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue"/>
            </Link>)}
          </div>
          : <div className="flex flex-col items-center px-6 py-12 text-center" role="status">
            <span className="icon-tile size-12"><FileText size={21}/></span>
            <strong className="mt-3 text-sm font-semibold text-ink">Aucune activité récente</strong>
            <p className="mt-1 max-w-sm text-sm text-muted">Les nouveaux dossiers apparaîtront ici après leur enregistrement.</p>
          </div>}
      </section>

      <div className="flex min-w-0 flex-col gap-5">
        <section className="surface overflow-hidden" aria-busy={loading}>
          <div className="panel-heading">
            <div className="flex items-center gap-3">
              <span className="icon-tile border-amber-200 bg-amber-50 text-amber-800"><ClipboardList size={19}/></span>
              <div><h2 className="panel-title">À suivre</h2><p className="mt-1 text-xs text-muted">Dossiers non clôturés récents</p></div>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold tabular-nums text-amber-900">{loading ? '…' : (data?.pending ?? 0).toLocaleString('fr-FR')}</span>
          </div>
          {loading && !data ? <p className="p-5 text-sm text-muted" role="status">Chargement des dossiers…</p>
            : openRequests.length ? <div className="divide-y divide-line">
              {openRequests.map(item => <Link key={`${item.type}-${item.id}`} href={item.url} className="group flex min-w-0 items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-navy-2"><FileText size={16}/></span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold text-ink">{item.number}</strong><span className="mt-1 block truncate text-xs text-muted">{item.citizen}</span></span>
                <Status status={item.status}/><ArrowRight size={15} className="shrink-0 text-slate-400 group-hover:text-blue"/>
              </Link>)}
            </div>
            : <div className="flex flex-col items-center px-6 py-9 text-center" role="status">
              <CheckCircle2 size={26} className="text-emerald-700"/>
              <strong className="mt-2 text-sm font-semibold text-ink">Aucun dossier récent à traiter</strong>
              <p className="mt-1 text-xs text-muted">{data?.pending ? 'Les dossiers plus anciens restent accessibles dans les demandes.' : 'La file de traitement est à jour.'}</p>
            </div>}
          <div className="border-t border-line bg-slate-50/70 px-5 py-3">
            <Link href="/demandes" className="inline-flex min-h-8 items-center gap-1 text-xs font-bold text-blue hover:underline">Ouvrir la file complète <ArrowRight size={14}/></Link>
          </div>
        </section>

        <section className="surface overflow-hidden">
          <div className="panel-heading">
            <div className="flex items-center gap-3">
              <span className="icon-tile"><Activity size={19}/></span>
              <div><h2 className="panel-title">Volume des dossiers</h2><p className="mt-1 text-xs text-muted">Répartition par module</p></div>
            </div>
            <span className="text-lg font-bold tabular-nums text-navy">{data ? total.toLocaleString('fr-FR') : '—'}</span>
          </div>
          <div className="space-y-5 p-5">
            {[
              { label: 'Naissances', value: data?.births, href: '/naissances', color: 'bg-blue', visible: canReadBirths },
              { label: 'Dossiers CIN', value: data?.cin_cases, href: '/cin', color: 'bg-teal-700', visible: canReadCin },
            ].filter(item => item.visible).map(item => <Link href={item.href} key={item.label} className="group block">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-muted group-hover:text-blue">{item.label}</span><strong className="tabular-nums text-ink">{loading ? '…' : (item.value ?? 0).toLocaleString('fr-FR')}</strong></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color} transition-[width]`} style={{ width: `${total ? Math.min((item.value ?? 0) / total * 100, 100) : 0}%` }}/></div>
            </Link>)}
            {!canReadBirths && !canReadCin && <p className="text-sm text-muted">Aucun module de dossier n’est autorisé pour ce profil.</p>}
          </div>
        </section>
      </div>
    </div>

    <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-sky px-4 py-3 text-sm leading-5 text-navy-2">
      <FileText size={17} className="mt-0.5 shrink-0 text-blue"/>
      <span>Prototype de démonstration. Les données sont fictives et les documents portent la mention « Spécimen — sans valeur officielle ».</span>
    </div>
  </div>;
}
