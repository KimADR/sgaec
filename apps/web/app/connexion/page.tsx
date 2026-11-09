'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, FileCheck2, Landmark, LockKeyhole, MapPinned, ShieldCheck } from 'lucide-react';
import { apiPost } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiPost('/auth/login', { username: username.trim(), password });
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass = 'flex flex-col gap-2 text-sm font-semibold text-ink';
  const inputClass = 'min-h-12 w-full rounded-lg border border-line bg-white px-4 py-2 text-sm font-normal text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/15';
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top_left,#e4eff9_0%,#f5f7fa_58%)] p-4 sm:p-6">
    <div className="grid w-full max-w-[970px] overflow-hidden rounded-[24px] border border-line bg-white shadow-[0_24px_70px_rgba(10,28,42,.10)] md:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)]">
      <aside className="relative hidden min-h-[550px] overflow-hidden bg-navy px-9 py-10 text-white md:flex md:flex-col" aria-label="Présentation du système">
        <div className="absolute -right-32 -top-28 size-80 rounded-full border border-white/10" aria-hidden="true"/>
        <div className="absolute -right-16 -top-10 size-64 rounded-full border border-white/10" aria-hidden="true"/>
        <div className="relative flex items-center gap-3"><div className="grid size-12 place-items-center rounded-xl border border-white/15 bg-white/10"><Landmark size={26}/></div>
          <div><strong className="block text-2xl tracking-tight">SGAEC</strong><span className="block text-xs text-slate-300">Prototype territorial</span></div>
        </div>
        <div className="relative mt-16"><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Gestion administrative et état civil</p>
          <h1 className="mt-4 max-w-sm text-3xl font-bold leading-[1.18] tracking-tight">Un espace unique pour suivre les démarches et les dossiers.</h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">Une démonstration structurée autour des besoins des communes, des agents et du pilotage territorial.</p>
        </div>
        <div className="relative mt-auto space-y-4 pt-10">
          <div className="flex items-center gap-3 text-sm text-slate-200"><FileCheck2 size={19} className="text-amber-300"/>Suivi des dossiers et des statuts</div>
          <div className="flex items-center gap-3 text-sm text-slate-200"><MapPinned size={19} className="text-amber-300"/>Périmètre d’accès par commune</div>
          <div className="flex items-center gap-3 text-sm text-slate-200"><ShieldCheck size={19} className="text-amber-300"/>Rôles et habilitations différenciés</div>
          <p className="border-t border-white/15 pt-5 text-xs text-slate-300">Données fictives · Aucun document officiel délivré</p>
        </div>
      </aside>
      <section className="flex min-h-[510px] flex-col justify-center p-6 sm:p-10 md:px-11">
        <div className="mb-8 flex items-center gap-3 md:hidden"><span className="grid size-11 place-items-center rounded-xl bg-navy text-white"><Landmark size={24}/></span><strong className="text-xl text-navy">SGAEC</strong></div>
        <div className="mb-7"><span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950"><ShieldCheck size={14}/> Environnement de démonstration</span>
          <h2 className="mt-5 text-[27px] font-bold tracking-tight text-navy">Connexion à votre espace</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Utilisez le compte de démonstration configuré sur votre installation locale.</p>
        </div>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <label className={fieldClass}>Identifiant
            <input className={inputClass} autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={80} value={username}
              onChange={event => setUsername(event.target.value)} placeholder="Votre identifiant"/>
          </label>
          <label className={fieldClass}>Mot de passe
            <span className="relative block"><input className={`${inputClass} pr-12`} type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={256} value={password}
              onChange={event => setPassword(event.target.value)} placeholder="Votre mot de passe"/>
              <button type="button" className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-lg text-muted hover:text-blue" onClick={() => setShowPassword(show => !show)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPassword}>
                {showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></span>
          </label>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
          <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue px-4 text-sm font-semibold text-white transition hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={submitting}>
            <LockKeyhole size={17}/>{submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-muted">Prototype de démonstration · Les identifiants restent sur votre installation et ne doivent pas être partagés.</p>
      </section>
    </div>
  </main>;
}
