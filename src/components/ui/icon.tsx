import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

/** Thin wrapper around HugeiconsIcon so pages import a single `Icon`. */
export function Icon(props: ComponentProps<typeof HugeiconsIcon>) {
  return <HugeiconsIcon strokeWidth={1.8} {...props} />;
}
