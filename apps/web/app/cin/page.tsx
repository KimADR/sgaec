'use client';
import { useCan } from '@/components/AccessContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, IdCard, Plus, Search } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { dateFr, fullName } from '@/lib/format';
import type { CinCase, PageResult, WorkflowStatus } from '@/lib/types';
import { Status } from '@/components/Status';
import ExportSpecimensButton from '@/components/ExportSpecimensButton';
import Pagination from '@/components/Pagination';

const statusOptions: Array<{ value: WorkflowStatus | ''; label: string }> = [
  { value: '', label: 'Tous les statuts' },
  { value: 'REGISTERED', label: 'Enregistré' },
  { value: 'IN_REVIEW', label: 'En cours' },
  { value: 'VALIDATED', label: 'Validé' },
  { value: 'ISSUED', label: 'Clôturé' },
  { value: 'REJECTED', label: 'Rejeté' },
];

export default function CinPage() {
  const canCreate = useCan('cin:create');
  const [rows, setRows] = useState<CinCase[]>([]);
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
      apiGet<PageResult<CinCase>>(
        `/cin?q=${encodeURIComponent(query)}&status=${status}&page=${page}&page_size=${pageSize}`,
      )
        .then(v => {
          if (active) {
            setRows(v.items);
            setTotal(v.total);
            setError('');
            if (page > v.total_pages) setPage(Math.max(v.total_pages, 1));
          }
        })
        .catch((e: Error) => { if (active) { setRows([]); setTotal(0); setError(e.message); } })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(timeout); };
  }, [query, status, page, pageSize, refresh]);
  return <div className="flex flex-col gap-5">
    <p className="m-0 text-xs font-medium text-muted">Documents administratifs <span className="px-1">›</span> CIN</p>
    <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="m-0 text-2xl font-bold text-ink">Dossiers de Carte Nationale d'Identité</h2><p className="mt-2 text-sm text-muted">Suivi de demandes et contrôle des pièces (prototype).</p></div><div className="flex flex-wrap gap-2"><ExportSpecimensButton/>{canCreate && <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue px-4 text-sm font-semibold text-white hover:bg-blue-dark" href="/cin/nouveau"><Plus size={17}/> Nouveau dossier CIN</Link>}</div></header>
    <section id="cin-resultats" aria-busy={loading} className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><h3 className="m-0 flex items-center gap-2 text-base font-bold text-ink"><IdCard size={19} className="text-navy"/> Dossiers CIN</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-muted">{loading ? '…' : total.toLocaleString('fr-FR')} dossier(s)</span></div>
      <div className="grid grid-cols-1 gap-3 border-b border-line p-4 md:grid-cols-[minmax(240px,1fr)_220px]"><label className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/><input className="min-h-11 w-full rounded-lg border border-line bg-white py-2 pl-10 pr-3 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20" aria-label="Rechercher un dossier CIN" value={query}
        onChange={e => { setPage(1); setQuery(e.target.value); }} placeholder="Rechercher un demandeur ou un n° de dossier…"/></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted"><span>Statut</span><select className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20" value={status}
          onChange={event => { setPage(1); setStatus(event.target.value as WorkflowStatus | ''); }}>
          {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
      </div>
      {error && <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert"><span>{error}</span><button className="min-h-9 rounded-lg border border-red-200 bg-white px-3 font-semibold hover:bg-red-50" type="button" onClick={() => setRefresh(value => value + 1)}>Réessayer</button></div>}
      {error ? null : loading ? <p className="p-8 text-center text-sm text-muted" role="status">Actualisation des résultats…</p> : !rows.length ? <p className="p-8 text-center text-sm text-muted" role="status">Aucun dossier correspondant.</p>
      : <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map(r => <article key={r.id} className="flex min-w-0 flex-col gap-4 rounded-xl border border-line p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-navy"><IdCard size={19}/></span><div className="min-w-0 flex-1"><p className="m-0 break-words text-sm font-bold text-navy">{r.file_number}</p><p className="mt-1 break-words text-sm font-semibold text-ink">{fullName(r)}</p></div><Status status={r.status}/></div>
        <dl className="grid grid-cols-2 gap-3 text-xs"><div><dt className="text-muted">Date d'enregistrement</dt><dd className="mt-1 font-medium text-ink">{dateFr(r.created_at)}</dd></div><div><dt className="text-muted">Naissance</dt><dd className="mt-1 font-medium text-ink">{dateFr(r.birth_date)}</dd></div></dl>
        <p className="m-0 text-xs text-muted">Pièces déclarées : acte {r.has_birth_certificate ? 'fourni' : 'non déclaré'} · domicile {r.has_residence_proof ? 'fourni' : 'non déclaré'} · {r.photos_count} photo(s)</p>
        <Link href={`/cin/${r.id}`} className="mt-auto inline-flex min-h-10 items-center gap-2 self-start rounded-lg px-3 text-sm font-semibold text-blue hover:bg-sky-50" aria-label={`Consulter le dossier ${r.file_number}`}>Consulter <ArrowRight size={17}/></Link>
      </article>)}</div>}
      {!error && <Pagination page={page} total={total} pageSize={pageSize} loading={loading}
        onPageSizeChange={size => { setPage(1); setPageSize(size); }}
        onPageChange={nextPage => { setPage(nextPage); document.getElementById('cin-resultats')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}/>}
    </section>
  </div>;
}
