'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { paginationModel } from '@/lib/pagination';

type PaginationProps = {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  loading?: boolean;
};

const buttonStyle = 'inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-sm font-semibold text-navy-2 transition hover:border-blue/40 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-40';

export default function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  loading = false,
}: PaginationProps) {
  const model = paginationModel(total, page, pageSize);
  const previousDisabled = loading || model.page <= 1;
  const nextDisabled = loading || model.page >= model.totalPages;

  return <nav className="flex flex-col gap-4 border-t border-line bg-slate-50/60 px-4 py-4 text-sm sm:px-5 xl:flex-row xl:items-center xl:justify-between" aria-label="Pagination des résultats" aria-busy={loading}>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <p className="m-0 text-muted" aria-live="polite">
        {total === 0 ? 'Aucun résultat' : <><strong className="font-semibold tabular-nums text-ink">{model.firstResult.toLocaleString('fr-FR')}–{model.lastResult.toLocaleString('fr-FR')}</strong> sur {total.toLocaleString('fr-FR')} résultats</>}
      </p>
      {onPageSizeChange && <label className="inline-flex items-center gap-2 text-xs font-medium text-muted">
        Afficher
        <select className="min-h-10 rounded-lg border border-line bg-white px-2 text-sm font-semibold text-ink focus:border-blue" value={pageSize}
          onChange={event => onPageSizeChange(Number(event.target.value))} aria-label="Nombre de résultats par page">
          {[5, 10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
        </select>
        par page
      </label>}
    </div>
    {model.totalPages > 1 && <div className="flex items-center gap-2 sm:hidden" aria-label={`Page ${model.page} sur ${model.totalPages}`}>
      <button type="button" className={buttonStyle} onClick={() => onPageChange(model.page - 1)} disabled={previousDisabled} aria-label="Page précédente"><ChevronLeft size={18}/></button>
      <span className="min-w-24 text-center text-xs font-semibold tabular-nums text-navy-2">Page {model.page} / {model.totalPages}</span>
      <button type="button" className={buttonStyle} onClick={() => onPageChange(model.page + 1)} disabled={nextDisabled} aria-label="Page suivante"><ChevronRight size={18}/></button>
    </div>}
    {model.totalPages > 1 && <div className="hidden items-center gap-1.5 sm:flex" aria-label={`Page ${model.page} sur ${model.totalPages}`}>
      <button type="button" className={buttonStyle} onClick={() => onPageChange(model.page - 1)} disabled={previousDisabled} aria-label="Page précédente"><ChevronLeft size={18}/></button>
      {model.items.map((item, index) => item === 'ellipsis'
        ? <span key={`ellipsis-${index}`} className="grid size-8 place-items-center text-muted" aria-hidden="true">…</span>
        : <button key={item} type="button"
            className={`${buttonStyle} ${model.page === item ? 'border-blue bg-blue text-white hover:bg-blue-dark hover:text-white' : ''}`}
            aria-label={`Page ${item}`} aria-current={model.page === item ? 'page' : undefined}
            disabled={loading || model.page === item}
            onClick={() => onPageChange(item)}>{item}</button>)}
      <button type="button" className={buttonStyle} onClick={() => onPageChange(model.page + 1)} disabled={nextDisabled} aria-label="Page suivante"><ChevronRight size={18}/></button>
    </div>}
  </nav>;
}
