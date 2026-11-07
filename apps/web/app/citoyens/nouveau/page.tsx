'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserRoundPlus } from 'lucide-react';
import CitizenForm from '@/components/CitizenForm';
import { apiPost } from '@/lib/api';
import type { Citizen, CitizenInput } from '@/lib/types';

const initialCitizen: CitizenInput = {
  last_name: '',
  first_names: '',
  sex: 'M',
  birth_date: '',
  nationality: 'Malagasy',
  birth_place: '',
};

export default function NewCitizenPage() {
  const router = useRouter();

  async function createCitizen(value: CitizenInput) {
    const citizen = await apiPost<Citizen>('/citizens', value);
    router.push(`/citoyens/${citizen.id}`);
  }

  return <div className="page-stack">
    <div className="breadcrumbs"><Link href="/citoyens">Citoyens</Link><span>›</span>Nouveau</div>
    <section className="panel form-panel">
      <div className="form-title"><UserRoundPlus size={24}/><div><h2>Créer une fiche citoyen</h2><p>La fiche sera rattachée à la commune active et à un centre autorisé.</p></div></div>
      <CitizenForm initial={initialCitizen} submitLabel="Créer le citoyen"
        onSubmit={createCitizen} onCancel={() => router.push('/citoyens')}/>
    </section>
  </div>;
}
