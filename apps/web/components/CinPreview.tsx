import type { CinCase } from '@/lib/types';
import { dateFr } from '@/lib/format';
import { UserRound } from 'lucide-react';

export default function CinPreview({ record: r }: { record: CinCase }) {
  return <div className="cin-specimen" aria-label="Carte SGAEC de démonstration, spécimen non valable">
    <header className="cin-card-header">
      <div className="cin-brand-mark" aria-hidden="true"><span>SG</span></div>
      <div className="cin-brand-copy"><strong>SGAEC / CARTE D'EXERCICE</strong><span>MAQUETTE ADMINISTRATIVE FICTIVE</span></div>
      <span className="cin-prototype-tag">PROTOTYPE</span>
    </header>
    <div className="cin-card-content">
      <div className="cin-card-person">
        <div className="photo-placeholder"><UserRound size={34} strokeWidth={1.5}/><span>ILLUSTRATION</span></div>
        <div className="cin-identity">
          <span className="cin-section-label">IDENTITÉ DE DÉMONSTRATION</span>
          <strong className="cin-lastname">{r.last_name}</strong>
          <span className="cin-firstnames">{r.first_names}</span>
        </div>
      </div>
      <dl className="cin-details">
        <div><dt>Date de naissance</dt><dd>{dateFr(r.birth_date)}</dd></div>
        <div><dt>Lieu de naissance</dt><dd>{r.birth_place}</dd></div>
        <div><dt>Domicile déclaré</dt><dd>{r.address}</dd></div>
        <div><dt>Référence de dossier</dt><dd>{r.file_number}</dd></div>
      </dl>
    </div>
    <div className="cin-card-bottom">SPÉCIMEN — NON VALABLE</div>
  </div>;
}
