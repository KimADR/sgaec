'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { useCan } from '@/components/AccessContext';
import { apiGetDownloadBlob } from '@/lib/api';
import { todayInAntananarivo } from '@/lib/format';

export default function ExportSpecimensButton() {
  const authorized = useCan('documents:preview');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function download() {
    setExporting(true);
    setError('');
    setNotice('');
    try {
      const archive = await apiGetDownloadBlob('/documents/export.zip', 'application/zip');
      const url = URL.createObjectURL(archive);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sgaec-specimens-${todayInAntananarivo()}.zip`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setNotice('Export téléchargé : un PDF par acte de naissance et par dossier CIN autorisé.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'L’export des documents a échoué.');
    } finally {
      setExporting(false);
    }
  }

  if (!authorized) return null;

  return <div className="flex flex-col items-start gap-1">
    <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-navy-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={download} disabled={exporting}>
      <Download size={16}/>{exporting ? 'Préparation des PDF…' : 'Exporter les PDF de la commune'}
    </button>
    {error && <span className="max-w-72 text-xs text-red-800" role="alert">{error}</span>}
    {notice && <span className="max-w-72 text-xs text-emerald-800" role="status">{notice}</span>}
  </div>;
}
