'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useCan } from '@/components/AccessContext';
import AccessDenied from '@/components/AccessDenied';
import { apiGet, apiPost } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

type RoleOption = { code: string; name: string };
type CentreOption = { id: string; code: string; name: string };
type UserOption = {
  id: string;
  username: string;
  full_name: string;
  roles: RoleOption[];
  centres: Array<{ id: string | null; code: string | null; name: string }>;
};

const initialForm = {
  username: '',
  full_name: '',
  password: '',
  role_code: '',
  centre_id: '',
};

export default function AdministrationPage() {
  const canManage = useCan('users:manage');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [centres, setCentres] = useState<CentreOption[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadAdministrationData() {
    setError('');
    try {
      const [userRows, options] = await Promise.all([
        apiGet<UserOption[]>('/users'),
        apiGet<{ roles: RoleOption[]; centres: CentreOption[] }>('/user-options'),
      ]);
      setUsers(userRows);
      setRoles(options.roles);
      setCentres(options.centres);
      setForm(current => ({
        ...current,
        role_code: options.roles.some(role => role.code === current.role_code)
          ? current.role_code : options.roles[0]?.code || '',
        centre_id: options.centres.some(centre => centre.id === current.centre_id)
          ? current.centre_id : options.centres[0]?.id || '',
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (canManage) void loadAdministrationData(); }, [canManage]);

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiPost('/users', {
        username: form.username,
        full_name: form.full_name,
        password: form.password,
        role_code: form.role_code,
        centre_id: form.centre_id,
      });
      setForm(current => ({ ...initialForm, role_code: current.role_code, centre_id: current.centre_id }));
      setNotice('Le compte utilisateur a été créé et affecté à la commune sélectionnée.');
      await loadAdministrationData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Création impossible.');
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = 'flex min-w-0 flex-col gap-2 text-sm font-semibold text-ink';
  const inputClass = 'min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20';
  if (!canManage) return <AccessDenied action="administrer les comptes utilisateurs"/>;
  return <div className="flex flex-col gap-6">
    <PageHeader eyebrow="Gestion des accès" title="Administration des utilisateurs"
      description="Les rôles et centres proposés sont limités à la commune active et aux habilitations du compte."/>

    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
    {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</div>}

    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="border-b border-line px-5 py-4"><h3 className="m-0 text-base font-bold text-ink">Créer un compte</h3><p className="mt-1 text-sm text-muted">Le mot de passe est haché par le service de données et n'est jamais réaffiché.</p></div>
      <form className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2" onSubmit={submitUser}>
        <label className={fieldClass}>Identifiant
          <input className={inputClass} required minLength={3} maxLength={80} pattern="[A-Za-z0-9._-]+"
            autoComplete="off" value={form.username}
            onChange={event => setForm({ ...form, username: event.target.value })} />
        </label>
        <label className={fieldClass}>Nom complet
          <input className={inputClass} required minLength={2} maxLength={160} value={form.full_name}
            onChange={event => setForm({ ...form, full_name: event.target.value })} />
        </label>
        <label className={fieldClass}>Mot de passe temporaire
          <input className={inputClass} required type="password" minLength={16} maxLength={256} autoComplete="new-password"
            value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />
        </label>
        <label className={fieldClass}>Rôle
          <select className={inputClass} required value={form.role_code}
            onChange={event => setForm({ ...form, role_code: event.target.value })}>
            {roles.map(role => <option key={role.code} value={role.code}>{role.name}</option>)}
          </select>
        </label>
        <label className={fieldClass}>Centre d'état civil
          <select className={inputClass} required value={form.centre_id}
            onChange={event => setForm({ ...form, centre_id: event.target.value })}>
            {centres.map(centre => <option key={centre.id} value={centre.id}>{centre.name}</option>)}
          </select>
        </label>
        <div className="flex items-end sm:col-span-2 sm:justify-end">
          <button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue px-4 text-sm font-semibold text-white hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={saving || !roles.length || !centres.length}>
            {saving ? 'Création…' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </section>

    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="border-b border-line px-5 py-4"><h3 className="m-0 text-base font-bold text-ink">Comptes affectés</h3><p className="mt-1 text-sm text-muted">Comptes actifs visibles dans la portée territoriale autorisée.</p></div>
      {loading ? <p className="p-6 text-center text-sm text-muted" role="status">Chargement des comptes…</p>
        : !users.length ? <p className="p-6 text-center text-sm text-muted">Aucun utilisateur affecté dans cette portée.</p>
        : <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">{users.map(user => <article key={user.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-line p-4">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-sky-50 text-sm font-bold text-navy">{user.full_name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toLocaleUpperCase('fr-FR')}</span>
          <div className="min-w-0"><h4 className="m-0 break-words text-sm font-bold text-ink">{user.full_name}</h4><p className="mt-1 break-all text-xs text-muted">{user.username}</p>
            <p className="mt-3 text-xs font-semibold text-navy-2">{user.roles.map(role => role.name).join(', ') || 'Aucun rôle'}</p>
            <p className="mt-1 break-words text-xs leading-5 text-muted">{user.centres.map(centre => centre.name).join(', ') || 'Aucun centre affecté'}</p>
          </div>
        </article>)}</div>}
    </section>
  </div>;
}
