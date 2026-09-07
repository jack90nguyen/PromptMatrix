import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";
import logoMark from "@/assets/logo.png";

const FIELD =
  "w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-dim/70 outline-none transition " +
  "focus:border-accent focus:ring-1 focus:ring-accent/40 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${FIELD} ${props.className ?? ""}`} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`${FIELD} font-mono leading-relaxed ${props.className ?? ""}`}
    />
  );
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${FIELD} ${props.className ?? ""}`} />;
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="eyebrow mb-1.5 block">
      {children}
    </label>
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "ghost" | "danger" };

export function Button({ variant = "primary", ...props }: ButtonProps) {
  const styles = {
    primary: "bg-accent text-canvas hover:bg-cyan-300",
    ghost: "border border-line text-ink-dim hover:border-line-hi hover:text-ink",
    danger: "border border-red-900/70 text-red-400 hover:border-red-700 hover:bg-red-950/40",
  }[variant];

  return (
    <button
      {...props}
      className={
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 font-mono text-xs " +
        "font-medium uppercase tracking-wider transition disabled:cursor-not-allowed " +
        `disabled:opacity-40 ${styles} ${props.className ?? ""}`
      }
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-line bg-surface/90 ${className ?? ""}`}>
      {children}
    </div>
  );
}

/** Section heading inside a Card. */
export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
      <span className="eyebrow">{children}</span>
      {right}
    </div>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p className="rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 font-mono text-xs text-red-400">
      {children}
    </p>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-ink">
        <span className="text-accent">&#9656;</span>
        {title}
      </h1>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-10 text-center font-mono text-xs text-ink-dim">{children}</p>
  );
}

type BadgeTone = "base" | "muted" | "accent" | "danger";

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: BadgeTone }) {
  const styles: Record<BadgeTone, string> = {
    base: "border-amber-800/70 bg-amber-950/40 text-amber-400",
    muted: "border-line bg-surface-hi text-ink-dim",
    accent: "border-accent/50 bg-accent-dim/30 text-accent",
    danger: "border-red-900/70 bg-red-950/40 text-red-400",
  };
  return (
    <span
      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

/** Toggleable tag pill, shared by the composer and the prompt filters. */
export function Chip({
  active,
  count,
  children,
  ...props
}: ComponentProps<"button"> & { active: boolean; count?: number }) {
  return (
    <button
      {...props}
      type="button"
      className={
        "rounded-full border px-2.5 py-1 font-mono text-[11px] transition " +
        (active
          ? "border-accent bg-accent-dim/40 text-accent"
          : "border-line bg-canvas text-ink-dim hover:border-line-hi hover:text-ink")
      }
    >
      {children}
      {count !== undefined && (
        <span className={active ? "ml-1 text-accent/60" : "ml-1 text-ink-dim/60"}>{count}</span>
      )}
    </button>
  );
}

/** The app mark. Sized by the caller; 24px suits the header. */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src={logoMark}
      alt=""
      priority
      // One class, not a merge: two `size-*` utilities have equal specificity,
      // so which one wins would depend on stylesheet order.
      className={className ?? "size-6"}
    />
  );
}
