'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActiveCommune } from '@/components/AccessContext';
import { ArrowLeft, ArrowRight, Baby, Check, FileCheck2, UsersRound } from 'lucide-react';
import { apiPost } from '@/lib/api';
import type { BirthCreate, BirthRecord } from '@/lib/types';
import { dateFr, todayInAntananarivo } from '@/lib/format';

const steps = [
  { label: "Informations de l'enfant", icon: Baby },
  { label: 'Informations des parents', icon: UsersRound },
  { label: 'Références et validation', icon: FileCheck2 },
];
const initial: BirthCreate = {
  last_name: '', first_names: '', sex: 'M', birth_date: '', nationality: 'Malagasy',
  district: '', municipality: '', place_of_birth: '',
  father_name: '', mother_name: '', address: '', declarant_name: '',
};
const fieldClass = 'flex min-w-0 flex-col gap-2 text-sm font-semibold text-ink';
const inputClass = 'min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink shadow-sm outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/20';
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

export default function BirthForm() {
  const router = useRouter();
  const activeCommune = useActiveCommune();
  const [form, setForm] = useState<BirthCreate>(() => ({ ...initial, municipality: activeCommune?.name ?? '' }));
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
      if (form.birth_date < '1900-01-01' || form.birth_date > todayInAntananarivo()) { setError('La date de naissance doit être comprise entre 1900 et aujourd’hui.'); return; }
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
  return <form className="p-4 sm:p-6" onSubmit={submit} noValidate>
    <ol className="mb-6 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2" aria-label="Étapes du formulaire">{steps.map((s, index) => <li key={s.label} aria-current={index === step ? 'step' : undefined} className={`flex min-h-14 items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold sm:px-3 sm:text-sm ${index === step ? 'bg-navy text-white shadow-sm' : index < step ? 'bg-emerald-50 text-emerald-800' : 'text-muted'}`}>
      <span className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs ${index === step ? 'border-white/30 bg-white/10' : 'border-current'}`}>{index < step ? <Check size={14}/> : index + 1}</span><span>{s.label}</span>
    </li>)}</ol>
    <div>
      {step === 0 && <section className="overflow-hidden rounded-lg border border-line"><div className="flex items-center gap-2 border-b border-line bg-slate-50 px-4 py-3 text-sm font-bold text-navy-2"><Baby size={19}/> Informations de l'enfant</div>
        <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 sm:p-5">
          <label className={fieldClass}><span>Nom <b className="text-red-600">*</b></span><input className={inputClass} value={form.last_name} maxLength={120} onChange={e => update('last_name', e.target.value.toUpperCase())} placeholder="Nom de famille"/></label>
          <div className={fieldClass}><span>Sexe <b className="text-red-600">*</b></span><div className="flex min-h-11 flex-wrap items-center gap-x-6 gap-y-3"><label className="flex items-center gap-2 font-normal"><input type="radio" checked={form.sex === 'M'} onChange={() => update('sex', 'M')}/> Masculin</label><label className="flex items-center gap-2 font-normal"><input type="radio" checked={form.sex === 'F'} onChange={() => update('sex', 'F')}/> Féminin</label></div></div>
          <label className={fieldClass}><span>Prénom(s) <b className="text-red-600">*</b></span><input className={inputClass} value={form.first_names} maxLength={160} onChange={e => update('first_names', e.target.value)} placeholder="Prénom(s)"/></label>
          <label className={fieldClass}><span>Nationalité <b className="text-red-600">*</b></span><select className={inputClass} value={form.nationality} onChange={e => update('nationality', e.target.value)}><option>Malagasy</option><option>Autre</option></select></label>
          <label className={fieldClass}><span>Date de naissance <b className="text-red-600">*</b></span><input className={inputClass} type="date" value={form.birth_date} min="1900-01-01" max={todayInAntananarivo()} onChange={e => update('birth_date', e.target.value)}/></label>
          <label className={fieldClass}><span>Arrondissement / district <b className="text-red-600">*</b></span><input className={inputClass} value={form.district} onChange={e => update('district', e.target.value)} maxLength={140} placeholder="Circonscription de la déclaration"/></label>
          <label className={fieldClass}><span>Lieu de naissance <b className="text-red-600">*</b></span><input className={inputClass} value={form.place_of_birth} onChange={e => update('place_of_birth', e.target.value)} maxLength={160}/></label>
          <label className={fieldClass}><span>Commune de rattachement</span><input className={`${inputClass} bg-slate-50`} value={form.municipality} readOnly aria-readonly="true" title="La commune est définie par le contexte de connexion"/><small className="font-normal text-muted">Définie par la commune active de votre session.</small></label>
        </div>
      </section>}
      {step === 1 && <section className="overflow-hidden rounded-lg border border-line"><div className="flex items-center gap-2 border-b border-line bg-slate-50 px-4 py-3 text-sm font-bold text-navy-2"><UsersRound size={19}/> Informations des parents et du déclarant</div>
        <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 sm:p-5">
          <label className={fieldClass}>Nom complet du père<input className={inputClass} value={form.father_name} onChange={e => update('father_name', e.target.value)} maxLength={160} placeholder="Nom et prénom(s)"/></label>
          <label className={fieldClass}>Nom complet de la mère<input className={inputClass} value={form.mother_name} onChange={e => update('mother_name', e.target.value)} maxLength={160} placeholder="Nom et prénom(s)"/></label>
          <label className={`${fieldClass} sm:col-span-2`}>Domicile déclaré<input className={inputClass} value={form.address} onChange={e => update('address', e.target.value)} maxLength={220} placeholder="Adresse du domicile"/></label>
          <label className={`${fieldClass} sm:col-span-2`}>Nom du déclarant<input className={inputClass} value={form.declarant_name} onChange={e => update('declarant_name', e.target.value)} maxLength={160} placeholder="Personne effectuant la déclaration"/></label>
        </div><p className="mx-4 mb-4 rounded-lg bg-amber-50 p-3 text-sm leading-5 text-amber-900 sm:mx-5">Les règles officielles relatives à la déclaration et aux pièces justificatives devront être validées auprès de la commune.</p>
      </section>}
      {step === 2 && <section className="overflow-hidden rounded-lg border border-line"><div className="flex items-center gap-2 border-b border-line bg-slate-50 px-4 py-3 text-sm font-bold text-navy-2"><FileCheck2 size={19}/> Vérification des informations</div>
        <dl className="grid grid-cols-1 gap-x-6 p-4 sm:grid-cols-2 sm:p-5">{[
          ['Nom et prénom(s)', `${form.last_name} ${form.first_names}`],
          ['Sexe', form.sex === 'M' ? 'Masculin' : 'Féminin'],
          ['Naissance', `${dateFr(form.birth_date)} à ${form.place_of_birth}`],
          ['Arrondissement', form.district],
          ['Père', form.father_name || 'Non renseigné'],
          ['Mère', form.mother_name || 'Non renseigné'],
          ['Déclarant', form.declarant_name || 'Non renseigné'],
          ['Référence', 'Attribuée automatiquement (démo)'],
        ].map(([label, value]) => <div key={label} className="border-b border-line py-3"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-ink">{value}</dd></div>)}
        </dl><label className="mx-4 mb-4 flex items-start gap-3 rounded-lg border border-blue-100 bg-sky-50 p-4 text-sm leading-5 text-navy-2 sm:mx-5"><input className="mt-1 accent-blue" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>
          <span>J'ai vérifié les informations saisies. Ce dossier est créé uniquement à des fins de démonstration.</span></label>
      </section>}
    </div>
    {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert" aria-live="polite">{error}</div>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"><div>{step === 0 ? <Link href="/naissances" className={`${buttonClass} border border-line bg-white text-navy-2 hover:bg-slate-50`}>Annuler</Link> : <button className={`${buttonClass} border border-line bg-white text-navy-2 hover:bg-slate-50`} type="button" onClick={() => { setStep(v => v - 1); setError(''); }}><ArrowLeft size={16}/> Précédent</button>}</div>
      {step < 2 ? <button type="button" className={`${buttonClass} bg-blue text-white hover:bg-blue-dark`} onClick={next}>Suivant <ArrowRight size={16}/></button> :
      <button className={`${buttonClass} bg-blue text-white hover:bg-blue-dark`} type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le dossier'} <Check size={16}/></button>}</div>
  </form>;
}
