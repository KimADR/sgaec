import { FilePlus2 } from 'lucide-react';
import BirthForm from '@/components/BirthForm';
export default function NewBirth() {
  return <div className="page-stack"><div className="breadcrumbs">État civil <span>›</span> Naissances <span>›</span> Nouvel acte</div>
    <section className="panel form-panel"><div className="form-title"><FilePlus2 size={23}/><div><h2>Enregistrer un acte de naissance</h2><p>Formulaire guidé en trois étapes</p></div></div><BirthForm/></section>
  </div>;
}
