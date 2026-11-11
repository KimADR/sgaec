'use client';
import { useCan } from '@/components/AccessContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Plus, Search } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { dateFr, fullName } from '@/lib/format';
import type { BirthRecord, PageResult, WorkflowStatus } from '@/lib/types';
import { Status } from '@/components/Status';
import ExportSpecimensButton from '@/components/ExportSpecimensButton';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';

const statusOptions: Array<{ value: WorkflowStatus | ''; label: string }> = [
  { value: '', label: 'Tous les statuts' },
  { value: 'REGISTERED', label: 'Enregistré' },
  { value: 'IN_REVIEW', label: 'En cours' },
  { value: 'VALIDATED', label: 'Validé' },
  { value: 'ISSUED', label: 'Délivré' },
  { value: 'REJECTED', label: 'Rejeté' },
];

export default function BirthsPage() {
  const canCreate = useCan('births:create');
  const [births, setBirths] = useState<BirthRecord[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<WorkflowStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timeout = setTimeout(() => {
      apiGet<PageResult<BirthRecord>>(
        `/births?q=${encodeURIComponent(query)}&status=${status}&page=${page}&page_size=${pageSize}`,
      )
        .then(v => {
          if (active) {
            setBirths(v.items);
            setTotal(v.total);
            setError('');
            if (page > v.total_pages) setPage(Math.max(v.total_pages, 1));
          }
        })
        .catch((e: Error) => { if (active) { setBirths([]); setTotal(0); setError(e.message); } })
        .finally(() => { if (active) setLoading(false); });
    }, 220);
    return () => { active = false; clearTimeout(timeout); };
  }, [query, status, page, pageSize, refresh]);
  return <div className="flex flex-col gap-6">
    <PageHeader eyebrow="État civil · Registre" title="Registre des naissances" description="Consultez les actes enregistrés et créez de nouveaux dossiers."
      actions={<><ExportSpecimensButton/>{canCreate && <Link className="btn-primary" href="/naissances/nouveau"><Plus size={17}/> Nouvel acte</Link>}</>}/>
    <section id="births-resultats" aria-busy={loading} className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><h3 className="m-0 flex items-center gap-2 text-base font-bold text-ink"><FileText size={19} className="text-navy"/> Actes de naissance</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-muted">{loading ? '…' : total.toLocaleString('fr-FR')} résultat(s)</span></div>
      <div className="grid grid-cols-1 gap-3 border-b border-line p-4 md:grid-cols-[minmax(240px,1fr)_220px]"><label className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/><input className="min-h-11 w-full rounded-lg border border-line bg-white py-2 pl-10 pr-3 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20" aria-label="Rechercher une naissance" value={query}
        onChange={e => { setPage(1); setQuery(e.target.value); }} placeholder="Rechercher un nom ou une référence…"/></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted"><span>Statut</span><select className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20" value={status}
          onChange={event => { setPage(1); setStatus(event.target.value as WorkflowStatus | ''); }}>
          {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
      </div>
      {error && <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert"><span>{error}</span><button className="min-h-9 rounded-lg border border-red-200 bg-white px-3 font-semibold hover:bg-red-50" type="button" onClick={() => setRefresh(value => value + 1)}>Réessayer</button></div>}
      {error ? null : loading ? <p className="p-8 text-center text-sm text-muted" role="status">Actualisation des résultats…</p> : !births.length ? <p className="p-8 text-center text-sm text-muted" role="status">Aucun acte correspondant.</p>
      : <>
        <div className="grid grid-cols-1 gap-3 p-3 lg:hidden">{births.map(r => <article key={r.id} className="min-w-0 rounded-lg border border-line p-3">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="m-0 break-all text-xs font-bold text-navy">{r.record_number}</p><p className="mt-1 break-words text-sm font-semibold text-ink">{fullName(r)}</p></div><Status status={r.status}/></div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-muted">Naissance</dt><dd className="mt-1 font-medium text-ink">{dateFr(r.birth_date)}</dd></div><div className="min-w-0"><dt className="text-muted">Lieu</dt><dd className="mt-1 break-words font-medium text-ink">{r.place_of_birth}</dd></div></dl>
          <Link className="mt-3 inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-blue" href={`/naissances/${r.id}`} aria-label={`Voir ${r.record_number}`}>Ouvrir le dossier <ArrowRight size={16}/></Link>
        </article>)}</div>
        <div className="hidden overflow-x-auto lg:block"><table className="app-table">
          <thead><tr><th>Référence</th><th>Nom complet</th><th>Date de naissance</th><th>Lieu</th><th>Statut</th><th><span className="sr-only">Action</span></th></tr></thead>
          <tbody>{births.map(r => <tr key={r.id}>
            <td className="font-semibold text-navy">{r.record_number}</td><td className="font-medium text-ink">{fullName(r)}</td>
            <td className="whitespace-nowrap text-muted">{dateFr(r.birth_date)}</td><td>{r.place_of_birth}</td>
            <td><Status status={r.status}/></td><td><Link className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 font-semibold text-blue hover:bg-sky" href={`/naissances/${r.id}`} aria-label={`Voir ${r.record_number}`}>Ouvrir <ArrowRight size={15}/></Link></td>
          </tr>)}</tbody>
        </table></div>
      </>}
      {!error && <Pagination page={page} total={total} pageSize={pageSize} loading={loading}
        onPageSizeChange={size => { setPage(1); setPageSize(size); }}
        onPageChange={nextPage => { setPage(nextPage); document.getElementById('births-resultats')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}/>}
    </section>
  </div>;
}
