'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { apiGet, apiPost } from '@/lib/api';

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

  useEffect(() => { void loadAdministrationData(); }, []);

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

  return <div className="page-stack">
    <section className="page-head">
      <div><p className="eyebrow">GESTION DES ACCÈS</p><h2>Administration des utilisateurs</h2>
        <p>Les rôles et centres proposés sont limités à la commune active et aux habilitations du compte.</p></div>
    </section>

    {error && <div className="alert-error" role="alert">{error}</div>}
    {notice && <div className="alert-success" role="status">{notice}</div>}

    <section className="panel">
      <div className="panel-heading"><div><h3>Créer un compte</h3><p>Le mot de passe est haché par le service de données et n'est jamais réaffiché.</p></div></div>
      <form className="form-grid" onSubmit={submitUser}>
        <label className="field">Identifiant
          <input required minLength={3} maxLength={80} pattern="[A-Za-z0-9._-]+"
            autoComplete="off" value={form.username}
            onChange={event => setForm({ ...form, username: event.target.value })} />
        </label>
        <label className="field">Nom complet
          <input required minLength={2} maxLength={160} value={form.full_name}
            onChange={event => setForm({ ...form, full_name: event.target.value })} />
        </label>
        <label className="field">Mot de passe temporaire
          <input required type="password" minLength={16} maxLength={256} autoComplete="new-password"
            value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />
        </label>
        <label className="field">Rôle
          <select required value={form.role_code}
            onChange={event => setForm({ ...form, role_code: event.target.value })}>
            {roles.map(role => <option key={role.code} value={role.code}>{role.name}</option>)}
          </select>
        </label>
        <label className="field">Centre d'état civil
          <select required value={form.centre_id}
            onChange={event => setForm({ ...form, centre_id: event.target.value })}>
            {centres.map(centre => <option key={centre.id} value={centre.id}>{centre.name}</option>)}
          </select>
        </label>
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={saving || !roles.length || !centres.length}>
            {saving ? 'Création…' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><h3>Comptes affectés</h3><p>Comptes actifs visibles dans la portée territoriale autorisée.</p></div></div>
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>Identifiant</th><th>Nom</th><th>Rôles</th><th>Centres affectés</th></tr></thead>
        <tbody>
          {users.map(user => <tr key={user.id}>
            <td>{user.username}</td><td>{user.full_name}</td>
            <td>{user.roles.map(role => role.name).join(', ')}</td>
            <td>{user.centres.map(centre => centre.name).join(', ')}</td>
          </tr>)}
          {!loading && users.length === 0 && <tr><td colSpan={4} className="empty-cell">Aucun utilisateur affecté dans cette portée.</td></tr>}
          {loading && <tr><td colSpan={4} className="empty-cell">Chargement des comptes…</td></tr>}
        </tbody>
      </table></div>
    </section>
  </div>;
}
