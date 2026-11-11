'use client';

import { useCan } from '@/components/AccessContext';
import AccessDenied from '@/components/AccessDenied';
import { useRouter } from 'next/navigation';
import { UserRoundPlus } from 'lucide-react';
import CitizenForm from '@/components/CitizenForm';
import { apiPost } from '@/lib/api';
import type { Citizen, CitizenInput } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

const initialCitizen: CitizenInput = {
  last_name: '',
  first_names: '',
  sex: 'M',
  birth_date: '',
  nationality: 'Malagasy',
  birth_place: '',
};

export default function NewCitizenPage() {
  const canManage = useCan('citizens:manage');
  const router = useRouter();

  async function createCitizen(value: CitizenInput) {
    const citizen = await apiPost<Citizen>('/citizens', value);
    router.push(`/citoyens/${citizen.id}`);
  }

  if (!canManage) return <AccessDenied action="créer une fiche citoyen"/>;

  return <div className="flex flex-col gap-6">
    <PageHeader eyebrow="Répertoire communal · Citoyens" title="Nouvelle fiche citoyen" description="La fiche sera rattachée à la commune active et à un centre autorisé."/>
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-line px-5 py-5"><UserRoundPlus size={24} className="mt-1 shrink-0 text-navy"/><div><h2 className="m-0 text-xl font-bold text-ink">Créer une fiche citoyen</h2><p className="mt-1 text-sm text-muted">La fiche sera rattachée à la commune active et à un centre autorisé.</p></div></div>
      <CitizenForm initial={initialCitizen} submitLabel="Créer le citoyen"
        onSubmit={createCitizen} onCancel={() => router.push('/citoyens')}/>
    </section>
  </div>;
}
