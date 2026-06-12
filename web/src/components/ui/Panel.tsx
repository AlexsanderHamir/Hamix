import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

export type PanelProps = HTMLAttributes<HTMLElement> & {
  as?: "section" | "div" | "article";
  children: ReactNode;
};

export function Panel({ as: Tag = "section", className, children, ...rest }: PanelProps) {
  return (
    <Tag className={cn("ui-panel", className)} {...rest}>
      {children}
    </Tag>
  );
}
