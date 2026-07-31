import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** SPRINT 41B — one-column mobile form field kit (48–52px controls, labels above). */

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-[13px] font-medium text-muted-foreground mb-1.5">
      {children} {required && <span className="text-primary">*</span>}
    </label>
  );
}

export const controlClass =
  "w-full h-12 px-3.5 rounded-[13px] bg-background border border-border text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50";

export function TextField({
  label, value, onChange, placeholder, required, type = "text", inputMode, error, suffix, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  inputMode?: "text" | "decimal" | "numeric";
  error?: string | null;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={cn(controlClass, error && "border-rose-500/60", suffix && "pr-14", disabled && "opacity-60")}
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-[12.5px] text-rose-400 mt-1.5">{error}</p>}
    </div>
  );
}

export function TextAreaField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3.5 py-3 rounded-[13px] bg-background border border-border text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
      />
    </div>
  );
}

/** Opens a selector sheet instead of a floating dropdown. */
export function SelectorField({
  label, value, placeholder, onOpen, required, error, hint,
}: {
  label: string;
  value?: string | null;
  placeholder: string;
  onOpen: () => void;
  required?: boolean;
  error?: string | null;
  hint?: string;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          controlClass,
          "flex items-center justify-between gap-2 text-left",
          error && "border-rose-500/60",
        )}
      >
        <span className={cn("truncate", value ? "text-foreground" : "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {hint && !error && <p className="text-[12.5px] text-muted-foreground mt-1.5">{hint}</p>}
      {error && <p className="text-[12.5px] text-rose-400 mt-1.5">{error}</p>}
    </div>
  );
}

export function SummaryCard({ title, rows }: { title: string; rows: { label: string; value: string; tone?: "default" | "strong" | "danger" }[] }) {
  return (
    <div className="rounded-[16px] border border-border/70 bg-background/40 p-3.5">
      <div className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase mb-2">{title}</div>
      <div className="flex flex-col gap-1.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <span className="text-[13.5px] text-muted-foreground">{r.label}</span>
            <span
              className={cn(
                "text-[14px] text-right",
                r.tone === "strong" ? "font-semibold text-foreground"
                  : r.tone === "danger" ? "font-semibold text-rose-400"
                  : "text-foreground/90",
              )}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormFooter({
  onCancel, onSubmit, submitLabel, disabled, busy, cancelLabel = "İptal",
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
  busy?: boolean;
  cancelLabel?: string;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="h-12 px-5 rounded-[13px] border border-border text-[15px] font-medium text-foreground active:bg-muted"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || busy}
        className="flex-1 h-12 rounded-[13px] bg-primary text-primary-foreground text-[15px] font-semibold disabled:opacity-45 active:opacity-90"
      >
        {busy ? "Kaydediliyor…" : submitLabel}
      </button>
    </div>
  );
}
