'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function AccessDenied({ action = 'consulter cette rubrique' }: { action?: string }) {
  return <section className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8" role="status">
    <span className="grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-800"><ShieldAlert size={23}/></span>
    <h2 className="mt-4 text-xl font-bold text-navy">Accès non autorisé</h2>
    <p className="mt-2 text-sm leading-6 text-muted">Votre profil n’est pas habilité à {action} dans la commune actuellement sélectionnée. Contactez un administrateur communal si cette opération fait partie de vos missions.</p>
    <Link href="/" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold text-blue hover:bg-sky-50"><ArrowLeft size={17}/> Retour au tableau de bord</Link>
  </section>;
}
