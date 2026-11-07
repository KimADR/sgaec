import { IdCard } from 'lucide-react';
import CinForm from '@/components/CinForm';
export default function NewCin() {
  return <div className="page-stack"><div className="breadcrumbs">Documents administratifs <span>›</span> CIN <span>›</span> Nouveau dossier</div>
    <section className="panel form-panel"><div className="form-title"><IdCard size={24}/><div><h2>Enregistrer une demande de CIN</h2><p>Informations du demandeur et pièces fournies</p></div></div><CinForm/></section>
  </div>;
}
