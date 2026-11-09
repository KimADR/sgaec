import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';
export default function ComingSoon({ title, detail }: {title: string; detail: string}) {
  return <div className="flex flex-col gap-5">
    <header><h2 className="m-0 text-2xl font-bold text-ink">{title}</h2><p className="mt-2 text-sm text-muted">{detail}</p></header>
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
      <Construction size={42} className="text-muted"/><h3 className="mt-4 text-xl font-bold text-ink">Module prévu pour une prochaine phase</h3>
      <p className="max-w-2xl leading-6 text-muted">Les parcours de ce module ne sont pas encore disponibles. Les dossiers Naissances, CIN, Citoyens et Demandes restent accessibles selon les habilitations du compte.</p>
      <Link href="/" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 font-semibold text-navy-2 hover:bg-slate-50"><ArrowLeft size={16}/> Retour au tableau de bord</Link>
    </div>
  </div>;
}
