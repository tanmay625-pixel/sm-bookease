import * as React from "react";
import { TokenStub } from "@/components/ui/token-stub";
import { StatusBadge } from "@/components/ui/status-badge";
import { Icon } from "@/components/ui/icon";
import { Clock01Icon, UserIcon, Scissor01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

type Status = "pending" | "confirmed" | "cancelled";

const accent: Record<Status, string> = {
  pending: "bg-status-pending",
  confirmed: "bg-status-confirmed",
  cancelled: "bg-status-cancelled",
};

export function AppointmentStub({
  clientName,
  serviceName,
  staffName,
  timeLabel,
  status,
  actions,
  className,
  emphasis = false,
}: {
  clientName: string;
  serviceName: string;
  staffName?: string;
  timeLabel: string;
  status: Status;
  actions?: React.ReactNode;
  className?: string;
  emphasis?: boolean;
}) {
  return (
    <TokenStub
      className={cn(
        "flex items-stretch gap-0 overflow-hidden",
        status === "cancelled" && "opacity-75",
        className
      )}
    >
      <div className={cn("w-1.5 shrink-0", accent[status])} aria-hidden />
      <div className="flex flex-1 items-center gap-4 py-3.5 pl-4 pr-5">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-medium text-foreground",
              emphasis ? "text-lg" : "text-[15px]"
            )}
          >
            {clientName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon icon={Scissor01Icon} size={14} />
              {serviceName}
            </span>
            {staffName && (
              <span className="inline-flex items-center gap-1">
                <Icon icon={UserIcon} size={14} />
                {staffName}
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
              <Icon icon={Clock01Icon} size={14} />
              {timeLabel}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={status} />
          {actions}
        </div>
      </div>
    </TokenStub>
  );
}
