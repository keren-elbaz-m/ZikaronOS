"use client";

import { forwardRef } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-45",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4",
        size === "lg" && "h-12 px-6 text-lg",
        variant === "primary" && "bg-brand text-ink hover:bg-brand-strong",
        variant === "secondary" && "border border-line bg-paper text-ink hover:bg-cream",
        variant === "ghost" && "text-ink hover:bg-cream",
        variant === "danger" && "border border-rose/40 bg-paper text-rose hover:bg-rose/10",
        className,
      )}
      {...props}
    />
  );
});

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-xl border border-line bg-paper", className)} {...props} />
);

export const Badge = ({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "brand" | "green" | "rose" | "ink" }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
      tone === "neutral" && "bg-cream text-muted",
      tone === "brand" && "bg-brand/30 text-ink",
      tone === "green" && "bg-green/12 text-green",
      tone === "rose" && "bg-rose/12 text-rose",
      tone === "ink" && "bg-ink text-paper",
      className,
    )}
    {...props}
  />
);

export function Field({
  label, hint, error, required, children, className,
}: { label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-rose"> *</span>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="text-sm text-rose">{error}</span>
      ) : hint ? (
        <span className="text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border border-line bg-paper px-3 text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none aria-[invalid=true]:border-rose";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputBase, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputBase, "min-h-24 py-2", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(inputBase, "h-11 bg-paper", className)} {...props} />;
});

export function Choice<T extends string>({
  options, value, onChange, name,
}: { options: { value: T; label: string; hint?: string }[]; value: T | undefined; onChange: (v: T) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === o.value}
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg border px-4 py-3 text-start transition-colors",
            value === o.value ? "border-ink bg-brand/20" : "border-line bg-paper hover:bg-cream",
          )}
        >
          <span className="block font-medium">{o.label}</span>
          {o.hint && <span className="block text-sm text-muted">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-line bg-paper" role="group" aria-label={label}>
      <button type="button" aria-label="הוספה" className="grid size-11 place-items-center disabled:opacity-35" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="size-4" />
      </button>
      <output className="w-10 text-center text-lg font-semibold tabular-nums" aria-live="polite">{value}</output>
      <button type="button" aria-label="הפחתה" className="grid size-11 place-items-center disabled:opacity-35" disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus className="size-4" />
      </button>
    </div>
  );
}

export function SeatsMeter({ taken, capacity }: { taken: number; capacity: number }) {
  const pct = Math.min(100, Math.round((taken / Math.max(1, capacity)) * 100));
  const left = Math.max(0, capacity - taken);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted">{taken} מתוך {capacity} מקומות תפוסים</span>
        <span className={cn("font-medium", left === 0 ? "text-rose" : left <= 3 ? "text-ink" : "text-green")}>
          {left === 0 ? "מלא" : `נותרו ${left}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-cream">
        <div className={cn("h-full rounded-full", left === 0 ? "bg-rose" : "bg-brand")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-paper px-6 py-12 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="max-w-md text-muted">{children}</div>}
      {action}
    </div>
  );
}
