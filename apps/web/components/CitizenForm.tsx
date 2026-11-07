'use client';

import { useState, type FormEvent } from 'react';
import type { CitizenInput } from '@/lib/types';

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

  return <form className="form-grid citizen-form" onSubmit={submit}>
    <label className="field">Nom <b>*</b>
      <input required minLength={2} maxLength={120} value={form.last_name}
        onChange={event => update('last_name', event.target.value)} />
    </label>
    <label className="field">Prénom(s) <b>*</b>
      <input required minLength={2} maxLength={160} value={form.first_names}
        onChange={event => update('first_names', event.target.value)} />
    </label>
    <fieldset className="field citizen-sex">
      <legend>Sexe <b>*</b></legend>
      <div className="radio-row">
        <label><input type="radio" name="sex" checked={form.sex === 'M'} onChange={() => update('sex', 'M')}/> Masculin</label>
        <label><input type="radio" name="sex" checked={form.sex === 'F'} onChange={() => update('sex', 'F')}/> Féminin</label>
      </div>
    </fieldset>
    <label className="field">Date de naissance <b>*</b>
      <input required type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)}
        value={form.birth_date} onChange={event => update('birth_date', event.target.value)} />
    </label>
    <label className="field">Nationalité <b>*</b>
      <input required minLength={2} maxLength={80} value={form.nationality}
        onChange={event => update('nationality', event.target.value)} />
    </label>
    <label className="field">Lieu de naissance <b>*</b>
      <input required minLength={2} maxLength={160} value={form.birth_place}
        onChange={event => update('birth_place', event.target.value)} />
    </label>
    {error && <div className="alert-error citizen-form-error" role="alert">{error}</div>}
    <div className="form-actions citizen-form-actions">
      <button className="outline-button" type="button" onClick={onCancel} disabled={saving}>Annuler</button>
      <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : submitLabel}</button>
    </div>
  </form>;
}
