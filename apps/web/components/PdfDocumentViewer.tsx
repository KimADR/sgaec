'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Printer } from 'lucide-react';
import { apiGetBlob } from '@/lib/api';
import { useCan } from '@/components/AccessContext';

type PdfDocumentViewerProps = {
  path: string;
  filename: string;
};

export default function PdfDocumentViewer({ path, filename }: PdfDocumentViewerProps) {
  const authorized = useCan('documents:preview');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    let objectUrl = '';
    setLoading(true);
    setError('');
    setUrl('');

    apiGetBlob(path)
      .then(pdf => {
        if (!active) return;
        objectUrl = URL.createObjectURL(pdf);
        setUrl(objectUrl);
      })
      .catch((cause: Error) => {
        if (active) {
          setError(cause.message || 'Impossible de charger le document PDF.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, authorized]);

  function downloadPdf() {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
  }

  function printPdf() {
    if (!url) return;
    try {
      const frameWindow = frameRef.current?.contentWindow;
      if (!frameWindow) throw new Error('Visionneuse non disponible');
      frameWindow.focus();
      frameWindow.print();
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  if (!authorized) return <section className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">Prévisualisation PDF non autorisée pour ce profil.</section>;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm" aria-label="Document PDF de démonstration">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h3 className="m-0 text-base font-bold text-ink">Document PDF généré par le serveur</h3>
          <p className="mb-0 mt-1 text-xs text-muted">Aperçu fidèle du fichier proposé au téléchargement.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy-2 hover:bg-slate-50"
            >
              <ExternalLink size={16} /> Ouvrir le PDF
            </a>
          )}
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy-2 hover:bg-slate-50 disabled:opacity-50"
            type="button"
            onClick={printPdf}
            disabled={!url}
          >
            <Printer size={16} /> Imprimer
          </button>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue px-3 text-sm font-semibold text-white hover:bg-blue-dark disabled:opacity-50"
            type="button"
            onClick={downloadPdf}
            disabled={!url}
          >
            <Download size={16} /> Télécharger
          </button>
        </div>
      </div>
      {loading && <div className="p-8 text-center text-sm text-muted" role="status">Chargement du PDF…</div>}
      {error && <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}. Vous pouvez revenir à la liste, puis rouvrir le document.</div>}
      {url && (
        <iframe
          ref={frameRef}
          className="h-[58vh] min-h-[400px] w-full bg-slate-100 sm:h-[70vh] sm:min-h-[620px]"
          src={url}
          title="Aperçu du PDF de démonstration"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError('Le PDF reçu ne peut pas être affiché dans cette visionneuse.');
            setLoading(false);
          }}
        />
      )}
    </section>
  );
}
