import Link from 'next/link';
import { ArrowRight, CalendarDays, FileText, MapPin } from 'lucide-react';
import { dateFr } from '@/lib/format';
import type { Citizen } from '@/lib/types';

function initials(citizen: Citizen) {
  return `${citizen.last_name.trim().charAt(0)}${citizen.first_names.trim().charAt(0)}`.toLocaleUpperCase('fr-FR');
}

export default function CitizenCard({ citizen }: { citizen: Citizen }) {
  const fullName = `${citizen.last_name} ${citizen.first_names}`;

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <div
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-sky text-sm font-bold text-navy"
        >
          {initials(citizen)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-semibold leading-5 text-ink">{fullName}</h3>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
            citizen.active
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-slate-100 text-slate-700'
          }`}>
            {citizen.active ? 'Actif' : 'Archivé'}
          </span>
        </div>
      </div>

      <dl className="grid gap-2 text-sm text-muted">
        <div className="flex min-w-0 items-start gap-2">
          <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-navy" />
          <div className="min-w-0">
            <dt className="text-xs">Date de naissance</dt>
            <dd className="mt-0.5 break-words font-medium text-ink">{dateFr(citizen.birth_date)}</dd>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-2">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-navy" />
          <div className="min-w-0">
            <dt className="text-xs">Lieu de naissance</dt>
            <dd className="mt-0.5 break-words font-medium text-ink">{citizen.birth_place}</dd>
          </div>
        </div>
      </dl>

      <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3 text-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted">
          <FileText aria-hidden="true" className="size-4 shrink-0 text-navy" />
          <span className="min-w-0 break-words font-medium text-ink">{citizen.centre.name}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{citizen.birth_records.length} acte(s)</span>
        </div>
        <Link
          className="inline-flex min-h-10 shrink-0 items-center gap-1 self-start rounded-lg px-2 font-semibold text-blue hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue lg:self-auto"
          href={`/citoyens/${citizen.id}`}
          aria-label={`Consulter ${fullName}`}
        >
          Consulter <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </article>
  );
}
