'use client';
import { useCan } from '@/components/AccessContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, UsersRound } from 'lucide-react';
import { apiGet } from '@/lib/api';
import type { Citizen, PageResult } from '@/lib/types';
import Pagination from '@/components/Pagination';
import CitizenCard from '@/components/CitizenCard';

export default function CitizensPage() {
  const canCreate = useCan('citizens:manage');
  const [rows, setRows] = useState<Citizen[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timeout = window.setTimeout(() => {
      apiGet<PageResult<Citizen>>(
        `/citizens?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`,
      )
        .then(result => {
          if (active) {
            setRows(result.items);
            setTotal(result.total);
            setError('');
            if (page > result.total_pages) setPage(Math.max(result.total_pages, 1));
          }
        })
        .catch((cause: Error) => { if (active) { setRows([]); setTotal(0); setError(cause.message); } })
        .finally(() => { if (active) setLoading(false); });
    }, 220);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [query, page, pageSize, refresh]);

  return <div className="flex flex-col gap-5">
    <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div><h2 className="m-0 text-2xl font-bold text-ink">Citoyens</h2><p className="mt-2 text-sm text-muted">Consultez et gérez les fiches de la commune active.</p></div>
      {canCreate && <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue px-4 text-sm font-semibold text-white hover:bg-blue-dark" href="/citoyens/nouveau"><Plus size={17}/> Nouveau citoyen</Link>}
    </header>
    <section id="citizens-resultats" aria-busy={loading} className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h3 className="m-0 flex items-center gap-2 text-base font-bold text-ink"><UsersRound size={19} className="text-navy"/> Répertoire des citoyens</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-muted">{loading ? '…' : total.toLocaleString('fr-FR')} résultat(s)</span>
      </div>
      <p className="mx-4 mt-4 rounded-lg border border-blue-100 bg-sky-50 p-3 text-sm leading-5 text-navy-2 sm:mx-5">Les actes de naissance liés sont conservés dans leur état d’origine. L’archivage d’une fiche ne supprime aucun acte.</p>
      <div className="border-b border-line p-4"><label className="relative block">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
        <input className="min-h-11 w-full rounded-lg border border-line bg-white py-2 pl-10 pr-3 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20" aria-label="Rechercher un citoyen" value={query} maxLength={80}
          onChange={event => { setPage(1); setQuery(event.target.value); }} placeholder="Nom, prénom ou lieu de naissance…"/>
      </label></div>
      {error && <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert"><span>{error}</span><button className="min-h-9 rounded-lg border border-red-200 bg-white px-3 font-semibold hover:bg-red-50" type="button" onClick={() => setRefresh(value => value + 1)}>Réessayer</button></div>}
      {error ? null : loading ? (
        <p className="p-8 text-center text-sm text-muted" role="status">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted" role="status">Aucun citoyen correspondant.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Fiches citoyen">
          {rows.map(citizen => <CitizenCard key={citizen.id} citizen={citizen} />)}
        </div>
      )}
      {!error && <Pagination page={page} total={total} pageSize={pageSize} loading={loading}
        onPageSizeChange={size => { setPage(1); setPageSize(size); }}
        onPageChange={nextPage => { setPage(nextPage); document.getElementById('citizens-resultats')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}/>}
    </section>
  </div>;
}
