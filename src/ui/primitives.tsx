import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { c, font } from "./theme";

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`rounded ${padded ? "p-5" : ""} ${className}`}
      style={{ background: c.paperLight, border: `1px solid ${c.line}` }}
    >
      {children}
    </section>
  );
}

export function Heading({ children, size = "base" }: { children: ReactNode; size?: "sm" | "base" | "lg" }) {
  const px = size === "lg" ? "text-lg" : size === "sm" ? "text-sm" : "text-base";
  return (
    <h2 className={`${px} font-semibold`} style={{ fontFamily: font.display }}>
      {children}
    </h2>
  );
}

export function Muted({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-sm ${className}`} style={{ color: c.inkMuted }}>
      {children}
    </p>
  );
}

/** Empty states are an invitation to act, never a shrug. */
export function Empty({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-sm" style={{ color: c.inkMuted }}>
        {title}
      </p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10" style={{ color: c.inkMuted }}>
      <Loader2 size={16} className="animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Notice({ tone = "error", children }: { tone?: "error" | "info" | "ok"; children: ReactNode }) {
  const color = tone === "error" ? c.red : tone === "ok" ? c.green : c.gold;
  return (
    <p
      className="text-sm px-3 py-2 rounded"
      style={{ background: `${color}14`, color, border: `1px solid ${color}44` }}
      role={tone === "error" ? "alert" : undefined}
    >
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "danger" | "ghost";
  block?: boolean;
  loading?: boolean;
};

export function Btn({ variant = "solid", block, loading, children, style, disabled, ...rest }: BtnProps) {
  const base: React.CSSProperties =
    variant === "solid"
      ? { background: c.purple, color: c.paperLight }
      : variant === "danger"
      ? { background: "transparent", color: c.red, border: `1px solid ${c.red}66` }
      : variant === "ghost"
      ? { background: "transparent", color: c.ink }
      : { background: "transparent", color: c.ink, border: `1px solid ${c.line}` };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 ${
        block ? "w-full" : ""
      }`}
      style={{ ...base, ...style }}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold" style={{ color: c.inkMuted }}>
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <span className="mt-1 block text-[11px]" style={{ color: c.inkMuted }}>
          {hint}
        </span>
      )}
    </label>
  );
}

const controlStyle: React.CSSProperties = {
  border: `1px solid ${c.line}`,
  background: c.paper,
  color: c.ink,
};

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded px-3 py-2.5 text-sm focus:outline-none ${props.className || ""}`}
      style={{ ...controlStyle, ...props.style }}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded px-3 py-2.5 text-sm focus:outline-none ${props.className || ""}`}
      style={{ ...controlStyle, ...props.style }}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded px-3 py-2.5 text-sm focus:outline-none ${props.className || ""}`}
      style={{ ...controlStyle, ...props.style }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Stamps + modal                                                      */
/* ------------------------------------------------------------------ */

/** Rubber-stamp badge. The tilt and ink colour carry the status. */
export function Stamp({ label, tone }: { label: string; tone: "ok" | "warn" | "neutral" }) {
  const color = tone === "ok" ? c.purple : tone === "warn" ? c.red : c.inkMuted;
  const tilt = tone === "ok" ? -5 : 4;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1"
      style={{
        color,
        border: `2px solid ${color}`,
        boxShadow: `0 0 0 1px ${color}33`,
        transform: `rotate(${tilt}deg)`,
        background: `${color}0C`,
        fontFamily: font.display,
        fontSize: "10.5px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {tone === "ok" ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {label}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[88vh] overflow-y-auto rounded p-6`}
        style={{ background: c.paperLight, border: `1px solid ${c.line}` }}
      >
        <div className="mb-4 flex items-center justify-between border-b pb-3" style={{ borderColor: c.line }}>
          <Heading size="lg">{title}</Heading>
          <button onClick={onClose} aria-label="Close" style={{ color: c.inkMuted }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
