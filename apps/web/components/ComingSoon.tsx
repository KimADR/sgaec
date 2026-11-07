import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';
export default function ComingSoon({ title, detail }: {title: string; detail: string}) {
  return <div className="page-stack"><div className="page-head"><div><h2>{title}</h2><p>{detail}</p></div></div>
    <div className="panel coming-soon"><Construction size={42}/><h3>Module prévu pour une prochaine phase</h3>
      <p>Cette section est représentée dans la navigation, mais elle n'a pas encore été développée. Les deux modules opérationnels de la démonstration sont Naissances et CIN.</p>
      <Link href="/" className="outline-button"><ArrowLeft size={16}/> Retour au tableau de bord</Link>
    </div>
  </div>;
}
