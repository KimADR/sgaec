import { statusText } from '@/lib/format';
import type { WorkflowStatus } from '@/lib/types';

export function Status({ status, issuedLabel }: { status: WorkflowStatus; issuedLabel?: string }) {
  const tone = {
    REGISTERED: 'border-slate-200 bg-slate-100 text-slate-700',
    IN_REVIEW: 'border-amber-200 bg-amber-50 text-amber-800',
    VALIDATED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    ISSUED: 'border-blue-200 bg-blue-50 text-blue-800',
    REJECTED: 'border-red-200 bg-red-50 text-red-800',
  }[status];
  return <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
    {status === 'ISSUED' && issuedLabel ? issuedLabel : statusText[status]}
  </span>;
}
