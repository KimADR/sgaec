'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, FolderPlus, IdCard } from 'lucide-react';
import { apiPost } from '@/lib/api';
import type { CinCase, CinCreate } from '@/lib/types';

const initial: CinCreate = {
  last_name: '', first_names: '', birth_date: '', birth_place: 'Antananarivo',
  address: '', district: 'Antananarivo II', profession: '',
  father_name: '', mother_name: '', has_birth_certificate: false,
  has_residence_proof: false, photos_count: 0,
};

export default function CinForm() {
  const router = useRouter();
  const [form, setForm] = useState<CinCreate>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function update<K extends keyof CinCreate>(key: K, value: CinCreate[K]) { setForm(prev => ({ ...prev, [key]: value })); }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (![form.last_name, form.first_names, form.birth_date, form.birth_place, form.address, form.district].every(v => v.trim().length)) {
      setError('Veuillez renseigner tous les champs obligatoires.'); return;
    }
    if (form.birth_date > new Date().toISOString().slice(0, 10)) { setError('Date de naissance future non autorisée.'); return; }
    setSaving(true); setError('');
    try { const created = await apiPost<CinCase>('/cin', form); router.push(`/cin/${created.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur inconnue'); setSaving(false); }
  }
  return <form onSubmit={submit} noValidate className="birth-form">
    <div className="form-body"><section className="form-section"><div className="section-head"><IdCard size={19}/> Informations du demandeur</div>
      <div className="form-grid">
        <label className="field">Nom <b>*</b><input value={form.last_name} onChange={e => update('last_name', e.target.value.toUpperCase())} maxLength={120}/></label>
        <label className="field">Prénom(s) <b>*</b><input value={form.first_names} onChange={e => update('first_names', e.target.value)} maxLength={160}/></label>
        <label className="field">Date de naissance <b>*</b><input type="date" value={form.birth_date} max={new Date().toISOString().slice(0,10)} onChange={e => update('birth_date', e.target.value)}/></label>
        <label className="field">Lieu de naissance <b>*</b><input value={form.birth_place} onChange={e => update('birth_place', e.target.value)}/></label>
        <label className="field wide">Adresse du domicile <b>*</b><input value={form.address} onChange={e => update('address', e.target.value)} maxLength={220} placeholder="Adresse complète du demandeur"/></label>
        <label className="field">Arrondissement <b>*</b><select value={form.district} onChange={e => update('district', e.target.value)}>{[1,2,3,4,5,6].map(n => <option key={n} value={`Antananarivo ${['','I','II','III','IV','V','VI'][n]}`}>{`Antananarivo ${['','I','II','III','IV','V','VI'][n]}`}</option>)}</select></label>
        <label className="field">Profession<input value={form.profession} onChange={e => update('profession', e.target.value)} maxLength={100}/></label>
      </div></section>
      <section className="form-section"><div className="section-head"><FolderPlus size={19}/> Parents et pièces fournies</div>
        <div className="form-grid"><label className="field">Nom du père<input value={form.father_name} maxLength={160} onChange={e => update('father_name', e.target.value)}/></label>
          <label className="field">Nom de la mère<input value={form.mother_name} maxLength={160} onChange={e => update('mother_name', e.target.value)}/></label>
          <div className="field wide"><span>Pièces déclarées</span><div className="check-row"><label><input type="checkbox" checked={form.has_birth_certificate} onChange={e => update('has_birth_certificate', e.target.checked)}/> Copie d'acte de naissance</label>
            <label><input type="checkbox" checked={form.has_residence_proof} onChange={e => update('has_residence_proof', e.target.checked)}/> Justificatif de domicile</label></div></div>
          <label className="field">Nombre de photos d'identité<input type="number" min={0} max={8} value={form.photos_count} onChange={e => update('photos_count', Number(e.target.value))}/></label>
        </div><p className="context-note">La liste des justificatifs est indicative. Aucun fichier réel n'est téléversé dans le prototype.</p>
      </section></div>
    {error && <div className="alert-error" role="alert">{error}</div>}
    <div className="form-footer"><Link className="outline-button" href="/cin"><ArrowLeft size={16}/> Annuler</Link>
      <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le dossier'} <Check size={16}/></button></div>
  </form>;
}
