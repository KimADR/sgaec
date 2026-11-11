'use client';

import { useCan } from '@/components/AccessContext';
import AccessDenied from '@/components/AccessDenied';
import { IdCard } from 'lucide-react';
import CinForm from '@/components/CinForm';
import PageHeader from '@/components/PageHeader';
export default function NewCin() {
  const canCreate = useCan('cin:create');
  if (!canCreate) return <AccessDenied action="créer un dossier CIN"/>;
  return <div className="flex flex-col gap-6"><PageHeader eyebrow="Documents administratifs · CIN" title="Nouveau dossier CIN" description="Saisissez les informations du demandeur et les pièces fournies."/>
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"><div className="flex items-start gap-3 border-b border-line px-5 py-5"><IdCard size={24} className="mt-1 shrink-0 text-navy"/><div><h2 className="m-0 text-xl font-bold text-ink">Enregistrer une demande de CIN</h2><p className="mt-1 text-sm text-muted">Informations du demandeur et pièces fournies</p></div></div><CinForm/></section>
  </div>;
}
