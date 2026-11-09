'use client';

import { useCan } from '@/components/AccessContext';
import AccessDenied from '@/components/AccessDenied';
import { IdCard } from 'lucide-react';
import CinForm from '@/components/CinForm';
export default function NewCin() {
  const canCreate = useCan('cin:create');
  if (!canCreate) return <AccessDenied action="créer un dossier CIN"/>;
  return <div className="flex flex-col gap-5"><p className="m-0 text-xs font-medium text-muted">Documents administratifs <span className="px-1">›</span> CIN <span className="px-1">›</span> Nouveau dossier</p>
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"><div className="flex items-start gap-3 border-b border-line px-5 py-5"><IdCard size={24} className="mt-1 shrink-0 text-navy"/><div><h2 className="m-0 text-xl font-bold text-ink">Enregistrer une demande de CIN</h2><p className="mt-1 text-sm text-muted">Informations du demandeur et pièces fournies</p></div></div><CinForm/></section>
  </div>;
}
