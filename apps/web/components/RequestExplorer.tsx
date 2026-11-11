'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Archive, ArrowRight, ClipboardList, Download, FileText, FilterX, Search } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { requestsCsv } from '@/lib/exports';
import { dateFr } from '@/lib/format';
import type { PageResult, RecentRequest, WorkflowStatus } from '@/lib/types';
import { Status } from '@/components/Status';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';

export default function RequestExplorer({ mode }: { mode: 'requests' | 'archives' }) {
  const isArchive = mode === 'archives';
  const [data, setData] = useState<PageResult<RecentRequest> | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'births' | 'cin'>('all');
  const [status, setStatus] = useState<WorkflowStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timeout = window.setTimeout(() => {
      apiGet<PageResult<RecentRequest>>(
        `/requests?q=${encodeURIComponent(query)}&type=${type}&status=${status}&scope=${isArchive ? 'closed' : 'active'}&page=${page}&page_size=${pageSize}`,
      )
        .then(result => {
          if (active) {
            setData(result);
            setError('');
            if (page > result.total_pages) setPage(Math.max(result.total_pages, 1));
          }
        })
        .catch((cause: Error) => { if (active) { setData(null); setError(cause.message); } })
        .finally(() => { if (active) setLoading(false); });
    }, 220);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [query, type, status, page, pageSize, refresh, isArchive]);

  function resetFilters() {
    setQuery('');
    setType('all');
    setStatus('');
    setPage(1);
  }

  function exportPage() {
    if (loading || !data?.items.length) return;
    const csv = requestsCsv(data.items, isArchive
      ? 'Dossiers clôturés — Démonstration SGAEC'
      : 'Dossiers actifs — Démonstration SGAEC');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `sgaec-${isArchive ? 'clotures' : 'actifs'}-page-${page}-demo.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const fieldClass = 'min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/15';
  const statuses: Array<{ value: WorkflowStatus | ''; label: string }> = isArchive
    ? [{ value: '', label: 'Tous les états clôturés' }, { value: 'ISSUED', label: 'Clôturés' }, { value: 'REJECTED', label: 'Rejetés' }]
    : [{ value: '', label: 'Tous les états actifs' }, { value: 'REGISTERED', label: 'Enregistrés' }, { value: 'IN_REVIEW', label: 'En instruction' }, { value: 'VALIDATED', label: 'Validés' }];
  const TitleIcon = isArchive ? Archive : ClipboardList;

  return <div className="space-y-6">
    <PageHeader eyebrow={`Gestion des dossiers · ${isArchive ? 'Consultation' : 'Traitement'}`}
      title={isArchive ? 'Dossiers clôturés' : 'Demandes à suivre'}
      description={isArchive
        ? 'Retrouvez les demandes finalisées ou rejetées, avec une traçabilité adaptée à votre profil.'
        : 'Votre espace de suivi des demandes en cours : de l’enregistrement jusqu’à la validation.'}
      actions={<button type="button" onClick={exportPage} disabled={loading || !data?.items.length}
        className="btn-secondary"><Download size={16}/> Exporter cette page <span className="hidden text-xs font-normal text-muted md:inline">(CSV)</span></button>}/>

    {isArchive && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-950" role="note">
      <strong>Consultation numérique uniquement.</strong> « Clôturé » ne signifie pas archivé réglementairement : les durées de conservation, le versement et la destruction ne sont pas implémentés.
    </p>}

    <section id="demandes-resultats" aria-busy={loading} className="surface scroll-mt-24 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5 sm:px-6">
        <div className="flex items-center gap-3"><div className="icon-tile"><TitleIcon size={20}/></div>
          <div><h2 className="text-base font-bold text-ink">{isArchive ? 'Historique des dossiers clôturés' : 'File de traitement'}</h2>
            <p className="mt-1 text-xs text-muted">{isArchive ? 'Statuts terminaux' : 'Statuts non terminaux'} · Périmètre de votre commune</p></div>
        </div>
        <span className="rounded-full border border-line bg-slate-50 px-3 py-1.5 text-xs font-bold tabular-nums text-navy">{loading ? '…' : (data?.total ?? 0).toLocaleString('fr-FR')} dossier(s)</span>
      </div>
      <div className="grid gap-3 border-b border-line bg-slate-50/40 p-4 sm:p-5 lg:grid-cols-[minmax(230px,1fr)_180px_200px_auto] lg:items-end">
        <label className="block"><span className="mb-2 block text-xs font-bold text-muted">Recherche</span><span className="relative block"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
          <input className={`${fieldClass} pl-10`} aria-label="Rechercher un dossier" value={query} maxLength={80} onChange={event => { setPage(1); setQuery(event.target.value); }} placeholder="Nom, prénom ou référence…"/></span></label>
        <label className="block"><span className="mb-2 block text-xs font-bold text-muted">Type de dossier</span><select className={fieldClass} value={type} onChange={event => { setPage(1); setType(event.target.value as typeof type); }}>
          <option value="all">Tous les types</option><option value="births">Naissance</option><option value="cin">CIN</option>
        </select></label>
        <label className="block"><span className="mb-2 block text-xs font-bold text-muted">État du dossier</span><select className={fieldClass} value={status} onChange={event => { setPage(1); setStatus(event.target.value as WorkflowStatus | ''); }}>
          {statuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
        <button type="button" className="btn-secondary min-h-11" onClick={resetFilters} disabled={!query && type === 'all' && !status}><FilterX size={16}/> Effacer</button>
      </div>
      {error && <div role="alert" className="m-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button className="btn-secondary" onClick={() => setRefresh(value => value + 1)} type="button">Réessayer</button></div>}
      {!error && (loading ? <div className="space-y-3 p-5" role="status" aria-live="polite">{[1, 2, 3].map(n => <div key={n} className="h-14 animate-pulse rounded-lg bg-slate-100"/>)}<span className="sr-only">Chargement des dossiers…</span></div>
        : !data?.items.length ? <div className="flex flex-col items-center gap-2 px-5 py-14 text-center" role="status"><span className="icon-tile size-12"><FileText size={23}/></span><strong className="mt-2 text-base text-ink">Aucun dossier correspondant</strong><p className="text-sm text-muted">Modifiez vos filtres ou effectuez une autre recherche.</p></div>
        : <>
          <div className="hidden overflow-x-auto md:block"><table className="app-table"><thead><tr><th>Référence</th><th>Demandeur</th><th>Type</th><th>Date d’enregistrement</th><th>Statut</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{data.items.map(item => <tr key={`${item.type}-${item.id}`}><td><Link className="font-bold text-navy hover:text-blue" href={item.url}>{item.number}</Link></td>
              <td><span className="font-semibold text-ink">{item.citizen}</span></td><td>{item.type}</td><td>{dateFr(item.created_at)}</td><td><Status status={item.status} issuedLabel={item.type === 'CIN' ? 'Clôturé' : undefined}/></td>
              <td className="text-right"><Link href={item.url} className="inline-flex items-center gap-1 font-bold text-blue hover:underline" aria-label={`Consulter ${item.number}`}>Ouvrir <ArrowRight size={16}/></Link></td></tr>)}</tbody>
          </table></div>
          <div className="divide-y divide-line md:hidden">{data.items.map(item => <Link href={item.url} key={`${item.type}-${item.id}`} className="flex items-start gap-3 p-4 hover:bg-slate-50"><span className="icon-tile"><FileText size={18}/></span><div className="min-w-0 flex-1"><div className="mb-1 flex flex-wrap items-center gap-2"><strong className="break-words text-sm text-navy">{item.number}</strong><Status status={item.status} issuedLabel={item.type === 'CIN' ? 'Clôturé' : undefined}/></div><p className="text-sm font-semibold text-ink">{item.citizen}</p><p className="mt-1 text-xs text-muted">{item.type} · {dateFr(item.created_at)}</p></div><ArrowRight size={16} className="mt-3 shrink-0 text-blue"/></Link>)}</div>
        </>)}
      {!error && <Pagination page={page} total={data?.total ?? 0} pageSize={pageSize} loading={loading}
        onPageSizeChange={size => { setPage(1); setPageSize(size); }}
        onPageChange={nextPage => { setPage(nextPage); document.getElementById('demandes-resultats')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}/>}
    </section>
  </div>;
}
