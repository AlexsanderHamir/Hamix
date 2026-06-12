import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

type FieldProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Field({ id, label, hint, error, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("ui-field", className)}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="ui-field__control" aria-describedby={describedBy}>
        {children}
      </div>
      {hint ? (
        <p className="ui-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="ui-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ className, invalid, ...rest }: InputProps) {
  return (
    <input
      className={cn("ui-input", invalid && "ui-input--error", className)}
      {...rest}
    />
  );
}

export function Label({
  className,
  children,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("ui-field__label", className)} {...rest}>
      {children}
    </label>
  );
}
