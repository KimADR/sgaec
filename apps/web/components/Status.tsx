import { statusText } from '@/lib/format';
import type { WorkflowStatus } from '@/lib/types';

export function Status({ status }: { status: WorkflowStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}>{statusText[status]}</span>;
}
