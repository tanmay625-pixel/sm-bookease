import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { IconSvgElement } from "@hugeicons/react";

export function StatCard({
  label,
  value,
  icon,
  tint = "primary",
}: {
  label: string;
  value: number | string;
  icon: IconSvgElement;
  tint?: "primary" | "accent" | "cancelled";
}) {
  const tints: Record<string, string> = {
    primary: "bg-status-confirmed/12 text-status-confirmed",
    accent: "bg-status-pending/15 text-[#946213]",
    cancelled: "bg-status-cancelled/12 text-status-cancelled",
  };
  return (
    <Card className="flex items-center gap-4 p-4">
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", tints[tint])}>
        <Icon icon={icon} size={22} />
      </span>
      <div>
        <p className="font-heading text-2xl leading-none text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
