import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "ui-btn",
        `ui-btn--${variant}`,
        loading && "ui-btn--loading",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <>
          <span className="ui-btn__spinner" aria-hidden />
          <span className="ui-btn__label--hidden">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
