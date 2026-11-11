'use client';

import { useCan } from '@/components/AccessContext';
import AccessDenied from '@/components/AccessDenied';
import { FilePlus2 } from 'lucide-react';
import BirthForm from '@/components/BirthForm';
import PageHeader from '@/components/PageHeader';
export default function NewBirth() {
  const canCreate = useCan('births:create');
  if (!canCreate) return <AccessDenied action="créer un acte de naissance"/>;
  return <div className="flex flex-col gap-6"><PageHeader eyebrow="État civil · Naissances" title="Nouvel acte de naissance" description="Formulaire guidé pour enregistrer un nouvel acte."/>
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"><div className="flex items-start gap-3 border-b border-line px-5 py-5"><FilePlus2 size={23} className="mt-1 shrink-0 text-navy"/><div><h2 className="m-0 text-xl font-bold text-ink">Enregistrer un acte de naissance</h2><p className="mt-1 text-sm text-muted">Formulaire guidé en trois étapes</p></div></div><BirthForm/></section>
  </div>;
}
