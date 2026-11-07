import { dateFr } from '@/lib/format';
import type { BirthRecord } from '@/lib/types';
export default function BirthCertificate({ record: r }: { record: BirthRecord }) {
  return <div className="certificate-preview">
    <div className="certificate-heading"><div className="fake-seal">SG</div><div><strong>SGAEC — DOCUMENT DE DÉMONSTRATION</strong><span>{r.district} – {r.municipality}</span><span>EXTRAIT D'ACTE DE NAISSANCE</span></div></div>
    <div className="certificate-number">Référence : <strong>{r.record_number}</strong></div>
    <h3>Copie de démonstration d'un acte de naissance</h3>
    <p>Il est établi, pour les besoins exclusifs de cette démonstration, les informations suivantes :</p>
    <dl><div><dt>Nom</dt><dd>{r.last_name}</dd></div><div><dt>Prénom(s)</dt><dd>{r.first_names}</dd></div>
      <div><dt>Date de naissance</dt><dd>{dateFr(r.birth_date)}</dd></div><div><dt>Lieu de naissance</dt><dd>{r.place_of_birth}</dd></div>
      <div><dt>Sexe</dt><dd>{r.sex === 'M' ? 'Masculin' : 'Féminin'}</dd></div><div><dt>Nationalité</dt><dd>{r.nationality}</dd></div>
      <div><dt>Père</dt><dd>{r.father_name || 'Non renseigné'}</dd></div><div><dt>Mère</dt><dd>{r.mother_name || 'Non renseigné'}</dd></div></dl>
    <div className="watermark">SPÉCIMEN<small>SANS VALEUR OFFICIELLE</small></div>
    <div className="certificate-footer">Document généré par SGAEC (prototype) — Aucune valeur administrative</div>
  </div>;
}
