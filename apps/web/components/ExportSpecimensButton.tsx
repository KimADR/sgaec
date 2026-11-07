'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { apiGetDownloadBlob } from '@/lib/api';

export default function ExportSpecimensButton() {
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
      link.download = `sgaec-specimens-${new Date().toISOString().slice(0, 10)}.zip`;
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

  return <div className="export-specimens">
    <button className="outline-button" type="button" onClick={download} disabled={exporting}>
      <Download size={16}/>{exporting ? 'Préparation des PDF…' : 'Exporter les PDF de la commune'}
    </button>
    {error && <span className="export-message error" role="alert">{error}</span>}
    {notice && <span className="export-message" role="status">{notice}</span>}
  </div>;
}
