import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card text-card-foreground shadow-[0_1px_8px_-4px_rgba(42,38,34,0.15)]",
        className
      )}
      {...props}
    />
  );
}
