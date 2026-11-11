import { statusText } from '@/lib/format';
import type { WorkflowStatus } from '@/lib/types';

export function Status({ status, issuedLabel }: { status: WorkflowStatus; issuedLabel?: string }) {
  const tone = {
    REGISTERED: 'border border-slate-200 bg-slate-100 text-slate-700',
    IN_REVIEW: 'border border-amber-200 bg-amber-50 text-amber-900',
    VALIDATED: 'border border-emerald-200 bg-emerald-50 text-emerald-900',
    ISSUED: 'border border-blue-200 bg-blue-50 text-blue-900',
    REJECTED: 'border border-red-200 bg-red-50 text-red-900',
  }[status];
  return <span className={`status-badge ${tone}`}>
    {status === 'ISSUED' && issuedLabel ? issuedLabel : statusText[status]}
  </span>;
}
