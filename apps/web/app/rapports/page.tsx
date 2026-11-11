'use client';

import { useEffect, useState } from 'react';
import { Download, FileBarChart2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { dateFr, todayInAntananarivo } from '@/lib/format';
import { reportsCsv } from '@/lib/reports';
import type { ReportsData, WorkflowStatus } from '@/lib/types';
import { Status } from '@/components/Status';
import PageHeader from '@/components/PageHeader';

function daysBefore(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1, day - days));
  return target.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const today = todayInAntananarivo();
  const [startDate, setStartDate] = useState(() => daysBefore(today, 29));
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState<ReportsData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<ReportsData>(`/reports?start_date=${startDate}&end_date=${endDate}`)
      .then(result => { if (active) { setReport(result); setError(''); } })
      .catch((cause: Error) => { if (active) { setReport(null); setError(cause.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [startDate, endDate]);

  function downloadCsv() {
    if (!report) return;
    const blob = new Blob([reportsCsv(report)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sgaec-rapport-demo-${report.start_date}-${report.end_date}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const maxTypeTotal = Math.max(...(report?.by_type.map(item => item.total) ?? [0]), 1);
  const statusOrder: WorkflowStatus[] = ['REGISTERED', 'IN_REVIEW', 'VALIDATED', 'ISSUED', 'REJECTED'];

  return <div className="flex flex-col gap-5">
    <PageHeader eyebrow="Pilotage · Données agrégées" title="Rapports et statistiques"
      description="Volumes de dossiers agrégés depuis les registres de démonstration autorisés."
      actions={<button className="btn-primary disabled:cursor-not-allowed" type="button" onClick={downloadCsv} disabled={!report || loading}>
        <Download size={17}/> Exporter en CSV
      </button>}/>
    <section className="grid grid-cols-1 gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_180px_180px] md:items-end">
      <div className="flex items-start gap-3"><FileBarChart2 size={20} className="mt-1 shrink-0 text-navy"/><div><h3 className="m-0 text-base font-bold text-ink">Période du rapport</h3>
        <p className="mt-1 text-sm text-muted">Jusqu’à 366 jours inclus. Les dates suivent le calendrier local d’Antananarivo.</p></div></div>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">Du
        <input className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20" type="date" value={startDate} max={endDate || today} onChange={event => setStartDate(event.target.value)}/>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">Au
        <input className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20" type="date" value={endDate} min={startDate} max={today} onChange={event => setEndDate(event.target.value)}/>
      </label>
    </section>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="note">
      Données fictives de démonstration. Ce rapport ne constitue pas un document officiel et
      n’inclut aucun renseignement nominatif. Les définitions métier restent à valider par
      l’autorité compétente.
    </div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">Impossible de charger le rapport : {error}</div>}
    {loading && <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted shadow-sm" role="status">Calcul des agrégats…</div>}
    {report && !loading && <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Totaux de la période">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm"><span className="text-sm text-muted">Total des dossiers</span><strong className="mt-2 block text-3xl font-bold tabular-nums text-ink">{report.total.toLocaleString('fr-FR')}</strong></div>
        {report.by_type.map(item => <div className="rounded-2xl border border-line bg-white p-5 shadow-sm" key={item.type}>
          <span className="text-sm text-muted">{item.type === 'CIN' ? 'Dossiers CIN' : 'Dossiers de naissance'}</span>
          <strong className="mt-2 block text-3xl font-bold tabular-nums text-ink">{item.total.toLocaleString('fr-FR')}</strong>
        </div>)}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white shadow-sm">
          <div className="border-b border-line px-5 py-4"><h3 className="m-0 text-base font-bold text-ink">Volumes par type</h3>
            <p className="mt-1 text-sm text-muted">Créations enregistrées entre le {dateFr(report.start_date)} et le {dateFr(report.end_date)}</p></div>
          <div className="space-y-5 p-5">{report.by_type.map(item => <div className="grid grid-cols-[110px_minmax(0,1fr)_48px] items-center gap-3 text-sm" key={item.type}>
            <span className="text-muted">{item.type === 'CIN' ? 'Dossiers CIN' : 'Naissances'}</span>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="img"
              aria-label={`${item.type} : ${item.total} dossier(s) sur ${report.total}`}>
              <i className="block h-full rounded-full bg-blue" style={{ width: `${item.total / maxTypeTotal * 100}%` }}/>
            </div><strong className="text-right text-ink">{item.total.toLocaleString('fr-FR')}</strong>
          </div>)}</div>
        </section>
        <section className="rounded-2xl border border-line bg-white shadow-sm">
          <div className="border-b border-line px-5 py-4"><h3 className="m-0 text-base font-bold text-ink">Source et actualisation</h3>
            <p className="mt-1 text-sm text-muted">Horodatage de génération : {dateFr(report.generated_at)}</p></div>
          <p className="p-5 text-sm leading-6 text-muted">Source : dossiers Naissances et CIN persistés, filtrés par commune et affectation active.</p>
          {!report.total && <p className="px-5 pb-5 text-sm text-muted">Aucun dossier sur cette période.</p>}
        </section>
      </div>
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="border-b border-line px-5 py-4"><h3 className="m-0 text-base font-bold text-ink">Répartition par statut</h3>
          <p className="mt-1 text-sm text-muted">Comptage des dossiers créés pendant la période sélectionnée.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted"><tr>{['Statut', 'Naissances', 'CIN', 'Total'].map(title => <th className="px-4 py-3" key={title}>{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{statusOrder.map(status => {
            const row = report.by_status.find(item => item.status === status);
            return <tr key={status} className="hover:bg-slate-50"><td className="px-4 py-3"><Status status={status}/></td>
              <td className="px-4 py-3 tabular-nums">{(row?.births ?? 0).toLocaleString('fr-FR')}</td>
              <td className="px-4 py-3 tabular-nums">{(row?.cin ?? 0).toLocaleString('fr-FR')}</td>
              <td className="px-4 py-3"><strong>{(row?.total ?? 0).toLocaleString('fr-FR')}</strong></td></tr>;
          })}<tr className="bg-slate-50 font-bold text-ink"><th className="px-4 py-3">Total</th>
            <td className="px-4 py-3">{(report.by_type.find(item => item.type === 'Naissance')?.total ?? 0).toLocaleString('fr-FR')}</td>
            <td className="px-4 py-3">{(report.by_type.find(item => item.type === 'CIN')?.total ?? 0).toLocaleString('fr-FR')}</td>
            <td className="px-4 py-3">{report.total.toLocaleString('fr-FR')}</td></tr>
          </tbody>
        </table></div>
      </section>
    </>}
  </div>;
}
