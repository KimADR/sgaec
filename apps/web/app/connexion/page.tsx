'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, LockKeyhole } from 'lucide-react';
import { apiPost } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiPost('/auth/login', { username, password });
      router.replace('/');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <div className="auth-brand"><Landmark size={28}/><div><strong>SGAEC</strong><span>Accès sécurisé</span></div></div>
      <div className="auth-title"><LockKeyhole size={20}/><div><h1>Connexion</h1><p>Connectez-vous à votre espace administratif.</p></div></div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">Identifiant
          <input autoComplete="username" required maxLength={80} value={username}
            onChange={event => setUsername(event.target.value)} />
        </label>
        <label className="field">Mot de passe
          <input type="password" autoComplete="current-password" required maxLength={256} value={password}
            onChange={event => setPassword(event.target.value)} />
        </label>
        {error && <div className="alert-error" role="alert">{error}</div>}
        <button className="primary-button auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p className="auth-footnote">Prototype local — les identifiants sont configurés dans le fichier .env.</p>
    </section>
  </main>;
}
