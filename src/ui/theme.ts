/**
 * Design tokens — "The Society Ledger".
 *
 * Deep forest green leather, aged cream paper, brass and gold leaf: the
 * colours of a bound society register and a committee room, not a SaaS
 * dashboard. Everything in the app reads its colour from here, so changing a
 * value in this file restyles the whole portal.
 *
 * The token NAMES are kept from the earlier version on purpose, so every
 * screen keeps working without edits — only the values changed.
 */
export const c = {
  /** Page background — deep bottle green. */
  paper: "#0B2018",
  /** Raised surfaces: cards, panels, modals. */
  paperLight: "#123024",
  /** Deepest green, for headers and the sidebar. */
  deep: "#06140E",
  /** Primary text — aged cream. */
  ink: "#F2E8CE",
  /** Secondary text — sage. */
  inkMuted: "#9CB1A0",
  /** Hairlines and borders. */
  line: "#28503C",

  /** Primary accent / "paid" / "resolved" — gold leaf. */
  purple: "#C9A84C",
  /** Warning / "due" — burnished copper. */
  gold: "#C0703A",
  /** Urgent / "open complaint" — oxblood. */
  red: "#B8453B",
  /** Positive secondary. */
  green: "#5E8C6A",
  /** Sidebar leather. */
  kraft: "#08180F",
} as const;

export const font = {
  /** Headings — a bookish serif with real presence. */
  display: "'Playfair Display', Georgia, serif",
  /** Numbers, receipt numbers, flat numbers. */
  mono: "'IBM Plex Mono', ui-monospace, monospace",
  /** Body copy. */
  sans: "'Inter', system-ui, sans-serif",
} as const;

export const SOCIETY_NAME =
  import.meta.env.VITE_SOCIETY_NAME || "New Shrushti CHS";

export const MAINTENANCE_AMOUNT = Number(
  import.meta.env.VITE_MAINTENANCE_AMOUNT || 2500
);

export const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const formatDate = (ms?: number) =>
  ms
    ? new Date(ms).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export const formatDateTime = (ms?: number) =>
  ms ? new Date(ms).toLocaleString("en-IN") : "—";

export const monthLabel = (d: Date = new Date()) =>
  d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });