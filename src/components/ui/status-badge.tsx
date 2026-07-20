import { cn } from "@/lib/utils";

type Status = "pending" | "confirmed" | "cancelled";

const styles: Record<Status, string> = {
  pending: "bg-status-pending/15 text-[#946213] ring-1 ring-status-pending/30",
  confirmed: "bg-status-confirmed/12 text-status-confirmed ring-1 ring-status-confirmed/25",
  cancelled: "bg-status-cancelled/12 text-status-cancelled ring-1 ring-status-cancelled/25",
};

const dot: Record<Status, string> = {
  pending: "bg-status-pending",
  confirmed: "bg-status-confirmed",
  cancelled: "bg-status-cancelled",
};

const label: Record<Status, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        styles[status],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[status])} aria-hidden />
      {label[status]}
    </span>
  );
}
