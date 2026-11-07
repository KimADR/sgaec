'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Baby, Check, FileCheck2, UsersRound } from 'lucide-react';
import { apiPost } from '@/lib/api';
import type { BirthCreate, BirthRecord } from '@/lib/types';
import { dateFr } from '@/lib/format';

const steps = [
  { label: "Informations de l'enfant", icon: Baby },
  { label: 'Informations des parents', icon: UsersRound },
  { label: 'Références et validation', icon: FileCheck2 },
];
const initial: BirthCreate = {
  last_name: '', first_names: '', sex: 'M', birth_date: '', nationality: 'Malagasy',
  district: 'Antananarivo II', municipality: 'Antananarivo', place_of_birth: 'Antananarivo II',
  father_name: '', mother_name: '', address: '', declarant_name: '',
};

export default function BirthForm() {
  const router = useRouter();
  const [form, setForm] = useState<BirthCreate>(initial);
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function update<K extends keyof BirthCreate>(key: K, value: BirthCreate[K]) { setForm(prev => ({ ...prev, [key]: value })); }
  function next() {
    if (step === 0) {
      if (![form.last_name, form.first_names, form.birth_date, form.nationality, form.district, form.municipality, form.place_of_birth].every(v => v.trim().length)) {
        setError('Veuillez remplir tous les champs obligatoires.'); return;
      }
      if (form.last_name.length < 2 || form.first_names.length < 2) {
        setError('Le nom et le prénom doivent contenir au moins deux caractères.'); return;
      }
      if (form.birth_date > new Date().toISOString().slice(0, 10)) { setError('La date de naissance ne peut pas être future.'); return; }
    }
    setError(''); setStep(v => Math.min(2, v + 1));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 2) { next(); return; }
    if (!confirmed) { setError('Veuillez confirmer la vérification des informations.'); return; }
    setSaving(true); setError('');
    try {
      const result = await apiPost<BirthRecord>('/births', form);
      router.push(`/naissances/${result.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur inconnue'); setSaving(false); }
  }
  return <form className="birth-form" onSubmit={submit} noValidate>
    <div className="form-steps">{steps.map((s, index) => <div key={s.label} className={`form-step ${index === step ? 'current' : ''} ${index < step ? 'done' : ''}`}>
      <span className="step-index">{index < step ? <Check size={14}/> : index + 1}</span><span>{s.label}</span>
    </div>)}</div>
    <div className="form-body">
      {step === 0 && <section className="form-section"><div className="section-head"><Baby size={19}/> Informations de l'enfant</div>
        <div className="form-grid">
          <label className="field">Nom <b>*</b><input value={form.last_name} maxLength={120} onChange={e => update('last_name', e.target.value.toUpperCase())} placeholder="Nom de famille"/></label>
          <div className="field"><span>Sexe <b>*</b></span><div className="radio-row"><label><input type="radio" checked={form.sex === 'M'} onChange={() => update('sex', 'M')}/> Masculin</label><label><input type="radio" checked={form.sex === 'F'} onChange={() => update('sex', 'F')}/> Féminin</label></div></div>
          <label className="field">Prénom(s) <b>*</b><input value={form.first_names} maxLength={160} onChange={e => update('first_names', e.target.value)} placeholder="Prénom(s)"/></label>
          <label className="field">Nationalité <b>*</b><select value={form.nationality} onChange={e => update('nationality', e.target.value)}><option>Malagasy</option><option>Autre</option></select></label>
          <label className="field">Date de naissance <b>*</b><input type="date" value={form.birth_date} max={new Date().toISOString().slice(0,10)} onChange={e => update('birth_date', e.target.value)}/></label>
          <label className="field">Arrondissement <b>*</b><select value={form.district} onChange={e => update('district', e.target.value)}><option>Antananarivo I</option><option>Antananarivo II</option><option>Antananarivo III</option><option>Antananarivo IV</option><option>Antananarivo V</option><option>Antananarivo VI</option></select></label>
          <label className="field">Lieu de naissance <b>*</b><input value={form.place_of_birth} onChange={e => update('place_of_birth', e.target.value)} maxLength={160}/></label>
          <label className="field">Commune <b>*</b><input value={form.municipality} onChange={e => update('municipality', e.target.value)} maxLength={140}/></label>
        </div>
      </section>}
      {step === 1 && <section className="form-section"><div className="section-head"><UsersRound size={19}/> Informations des parents et du déclarant</div>
        <div className="form-grid">
          <label className="field">Nom complet du père<input value={form.father_name} onChange={e => update('father_name', e.target.value)} maxLength={160} placeholder="Nom et prénom(s)"/></label>
          <label className="field">Nom complet de la mère<input value={form.mother_name} onChange={e => update('mother_name', e.target.value)} maxLength={160} placeholder="Nom et prénom(s)"/></label>
          <label className="field wide">Domicile déclaré<input value={form.address} onChange={e => update('address', e.target.value)} maxLength={220} placeholder="Adresse du domicile"/></label>
          <label className="field wide">Nom du déclarant<input value={form.declarant_name} onChange={e => update('declarant_name', e.target.value)} maxLength={160} placeholder="Personne effectuant la déclaration"/></label>
        </div><p className="context-note">Les règles officielles relatives à la déclaration et aux pièces justificatives devront être validées auprès de la commune.</p>
      </section>}
      {step === 2 && <section className="form-section"><div className="section-head"><FileCheck2 size={19}/> Vérification des informations</div>
        <div className="review-grid"><div><span>Nom et prénom(s)</span><strong>{form.last_name} {form.first_names}</strong></div>
          <div><span>Sexe</span><strong>{form.sex === 'M' ? 'Masculin' : 'Féminin'}</strong></div>
          <div><span>Naissance</span><strong>{dateFr(form.birth_date)} à {form.place_of_birth}</strong></div>
          <div><span>Arrondissement</span><strong>{form.district}</strong></div>
          <div><span>Père</span><strong>{form.father_name || 'Non renseigné'}</strong></div>
          <div><span>Mère</span><strong>{form.mother_name || 'Non renseigné'}</strong></div>
          <div><span>Déclarant</span><strong>{form.declarant_name || 'Non renseigné'}</strong></div>
          <div><span>Référence</span><strong>Attribuée automatiquement (démo)</strong></div>
        </div><label className="confirm-box"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>
          <span>J'ai vérifié les informations saisies. Ce dossier est créé uniquement à des fins de démonstration.</span></label>
      </section>}
    </div>
    {error && <div className="alert-error" role="alert">{error}</div>}
    <div className="form-footer"><div>{step === 0 ? <Link href="/naissances" className="outline-button">Annuler</Link> : <button className="outline-button" type="button" onClick={() => { setStep(v => v - 1); setError(''); }}><ArrowLeft size={16}/> Précédent</button>}</div>
      {step < 2 ? <button type="button" className="primary-button" onClick={next}>Suivant <ArrowRight size={16}/></button> :
      <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le dossier'} <Check size={16}/></button>}</div>
  </form>;
}
