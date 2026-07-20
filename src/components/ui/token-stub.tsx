import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The signature BookEase "token stub": a softly shadowed card with a
 * circular notch cut into each vertical edge, like a queue token / ticket
 * stub. Used consistently for every appointment across the app.
 */
export const TokenStub = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "token-stub relative bg-card text-card-foreground rounded-2xl shadow-[0_2px_12px_-4px_rgba(42,38,34,0.18)]",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
TokenStub.displayName = "TokenStub";
