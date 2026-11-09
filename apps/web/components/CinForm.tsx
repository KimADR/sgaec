'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, FolderPlus, IdCard } from 'lucide-react';
import { apiPost } from '@/lib/api';
import type { CinCase, CinCreate } from '@/lib/types';
import { todayInAntananarivo } from '@/lib/format';

const initial: CinCreate = {
  last_name: '', first_names: '', birth_date: '', birth_place: '',
  address: '', district: '', profession: '',
  father_name: '', mother_name: '', has_birth_certificate: false,
  has_residence_proof: false, photos_count: 0,
};
const fieldClass = 'flex min-w-0 flex-col gap-2 text-sm font-semibold text-ink';
const inputClass = 'min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink shadow-sm outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/20';

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
    if (form.birth_date < '1900-01-01' || form.birth_date > todayInAntananarivo()) { setError('La date de naissance doit être comprise entre 1900 et aujourd’hui.'); return; }
    setSaving(true); setError('');
    try { const created = await apiPost<CinCase>('/cin', form); router.push(`/cin/${created.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur inconnue'); setSaving(false); }
  }
  return <form onSubmit={submit} noValidate className="p-4 sm:p-6">
    <div className="space-y-5"><section className="overflow-hidden rounded-xl border border-line"><div className="flex items-center gap-2 border-b border-line bg-slate-50 px-4 py-3 text-sm font-bold text-navy-2"><IdCard size={19}/> Informations du demandeur</div>
      <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 sm:p-5">
        <label className={fieldClass}><span>Nom <b className="text-red-600">*</b></span><input className={inputClass} value={form.last_name} onChange={e => update('last_name', e.target.value.toUpperCase())} maxLength={120}/></label>
        <label className={fieldClass}><span>Prénom(s) <b className="text-red-600">*</b></span><input className={inputClass} value={form.first_names} onChange={e => update('first_names', e.target.value)} maxLength={160}/></label>
        <label className={fieldClass}><span>Date de naissance <b className="text-red-600">*</b></span><input className={inputClass} type="date" value={form.birth_date} min="1900-01-01" max={todayInAntananarivo()} onChange={e => update('birth_date', e.target.value)}/></label>
        <label className={fieldClass}><span>Lieu de naissance <b className="text-red-600">*</b></span><input className={inputClass} value={form.birth_place} onChange={e => update('birth_place', e.target.value)}/></label>
        <label className={`${fieldClass} sm:col-span-2`}><span>Adresse du domicile <b className="text-red-600">*</b></span><input className={inputClass} value={form.address} onChange={e => update('address', e.target.value)} maxLength={220} placeholder="Adresse complète du demandeur"/></label>
        <label className={fieldClass}><span>Arrondissement / district <b className="text-red-600">*</b></span><input className={inputClass} value={form.district} onChange={e => update('district', e.target.value)} maxLength={140} placeholder="Arrondissement ou district"/></label>
        <label className={fieldClass}>Profession<input className={inputClass} value={form.profession} onChange={e => update('profession', e.target.value)} maxLength={100}/></label>
      </div></section>
      <section className="overflow-hidden rounded-xl border border-line"><div className="flex items-center gap-2 border-b border-line bg-slate-50 px-4 py-3 text-sm font-bold text-navy-2"><FolderPlus size={19}/> Parents et pièces fournies</div>
        <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 sm:p-5"><label className={fieldClass}>Nom du père<input className={inputClass} value={form.father_name} maxLength={160} onChange={e => update('father_name', e.target.value)}/></label>
          <label className={fieldClass}>Nom de la mère<input className={inputClass} value={form.mother_name} maxLength={160} onChange={e => update('mother_name', e.target.value)}/></label>
          <div className={`${fieldClass} sm:col-span-2`}><span>Pièces déclarées</span><div className="flex min-h-11 flex-wrap items-center gap-x-6 gap-y-3"><label className="flex items-center gap-2 font-normal"><input type="checkbox" checked={form.has_birth_certificate} onChange={e => update('has_birth_certificate', e.target.checked)}/> Copie d'acte de naissance</label>
            <label><input type="checkbox" checked={form.has_residence_proof} onChange={e => update('has_residence_proof', e.target.checked)}/> Justificatif de domicile</label></div></div>
          <label className={fieldClass}>Nombre de photos d'identité<input className={inputClass} type="number" min={0} max={8} value={form.photos_count} onChange={e => update('photos_count', Number(e.target.value))}/></label>
        </div><p className="mx-4 mb-4 rounded-lg bg-amber-50 p-3 text-sm leading-5 text-amber-900 sm:mx-5">La liste des justificatifs est indicative. Aucun fichier réel n'est téléversé dans le prototype.</p>
      </section></div>
    {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
    <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-line pt-4"><Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-navy-2 hover:bg-slate-50" href="/cin"><ArrowLeft size={16}/> Annuler</Link>
      <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue px-4 text-sm font-semibold text-white hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le dossier'} <Check size={16}/></button></div>
  </form>;
}
