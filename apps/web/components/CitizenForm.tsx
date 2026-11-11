'use client';

import { useState, type FormEvent } from 'react';
import type { CitizenInput } from '@/lib/types';
import { todayInAntananarivo } from '@/lib/format';

type CitizenFormProps = {
  initial: CitizenInput;
  submitLabel: string;
  onSubmit: (value: CitizenInput) => Promise<void>;
  onCancel: () => void;
};

export default function CitizenForm({ initial, submitLabel, onSubmit, onCancel }: CitizenFormProps) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update<K extends keyof CitizenInput>(key: K, value: CitizenInput[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = 'flex min-w-0 flex-col gap-2 text-sm font-semibold text-ink';
  const inputClass = 'min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink shadow-sm outline-none transition placeholder:text-muted focus:border-blue focus:ring-2 focus:ring-blue/20';
  return <form className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5" onSubmit={submit}>
    <div className="col-span-full border-b border-line pb-3">
      <h3 className="text-sm font-bold text-navy">Identité et informations de naissance</h3>
      <p className="mt-1 text-xs text-muted">Les champs marqués d’un astérisque sont obligatoires.</p>
    </div>
    <label className={fieldClass}><span>Nom <b className="text-red-600">*</b></span>
      <input className={inputClass} required minLength={2} maxLength={120} value={form.last_name}
        onChange={event => update('last_name', event.target.value)} />
    </label>
    <label className={fieldClass}><span>Prénom(s) <b className="text-red-600">*</b></span>
      <input className={inputClass} required minLength={2} maxLength={160} value={form.first_names}
        onChange={event => update('first_names', event.target.value)} />
    </label>
    <fieldset className={`${fieldClass} min-w-0 border-0 p-0`}>
      <legend>Sexe <b className="text-red-600">*</b></legend>
      <div className="flex min-h-11 flex-wrap items-center gap-x-6 gap-y-3">
        <label><input type="radio" name="sex" checked={form.sex === 'M'} onChange={() => update('sex', 'M')}/> Masculin</label>
        <label><input type="radio" name="sex" checked={form.sex === 'F'} onChange={() => update('sex', 'F')}/> Féminin</label>
      </div>
    </fieldset>
    <label className={fieldClass}><span>Date de naissance <b className="text-red-600">*</b></span>
      <input className={inputClass} required type="date" min="1900-01-01" max={todayInAntananarivo()}
        value={form.birth_date} onChange={event => update('birth_date', event.target.value)} />
    </label>
    <label className={fieldClass}><span>Nationalité <b className="text-red-600">*</b></span>
      <input className={inputClass} required minLength={2} maxLength={80} value={form.nationality}
        onChange={event => update('nationality', event.target.value)} />
    </label>
    <label className={fieldClass}><span>Lieu de naissance <b className="text-red-600">*</b></span>
      <input className={inputClass} required minLength={2} maxLength={160} value={form.birth_place}
        onChange={event => update('birth_place', event.target.value)} />
    </label>
    {error && <div className="col-span-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert" aria-live="polite">{error}</div>}
    <div className="col-span-full flex flex-wrap justify-end gap-3 border-t border-line pt-4">
      <button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-navy-2 transition hover:bg-slate-50 disabled:opacity-50" type="button" onClick={onCancel} disabled={saving}>Annuler</button>
      <button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue px-4 text-sm font-semibold text-white transition hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : submitLabel}</button>
    </div>
  </form>;
}
