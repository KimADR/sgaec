import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  tone?: 'blue' | 'teal' | 'amber' | 'navy';
};

const tones = {
  blue: { border: 'border-l-blue', icon: 'bg-blue/5 text-blue' },
  teal: { border: 'border-l-teal-700', icon: 'bg-teal-50 text-teal-800' },
  amber: { border: 'border-l-amber-600', icon: 'bg-amber-50 text-amber-800' },
  navy: { border: 'border-l-navy', icon: 'bg-slate-100 text-navy' },
};

export default function StatCard({ label, value, detail, href, icon: Icon, tone = 'blue' }: StatCardProps) {
  return <Link href={href} className={`metric-card group flex min-h-[132px] min-w-0 items-start gap-4 border border-line border-l-[3px] bg-white p-5 transition-colors hover:border-blue/50 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${tones[tone].border}`}>
    <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tones[tone].icon}`}><Icon size={19} strokeWidth={1.9}/></span>
    <span className="min-w-0 flex-1">
      <span className="block text-[13px] font-semibold text-muted">{label}</span>
      <strong className="mt-2 block text-[28px] font-bold leading-none tracking-tight tabular-nums text-navy">{value}</strong>
      <span className="mt-3 block text-xs leading-5 text-muted">{detail}</span>
    </span>
  </Link>;
}
