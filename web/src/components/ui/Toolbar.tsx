import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

export type ToolbarProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Toolbar({ className, children, ...rest }: ToolbarProps) {
  return (
    <div className={cn("ui-toolbar", className)} role="toolbar" {...rest}>
      {children}
    </div>
  );
}
