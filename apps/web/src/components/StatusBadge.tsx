import { ORDER_STATUS_LABELS, type OrderStatus } from "@vortex/shared";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status-badge status-${status}`}>{ORDER_STATUS_LABELS[status]}</span>;
}
