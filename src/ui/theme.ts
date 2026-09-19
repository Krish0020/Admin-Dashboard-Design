/**
 * Design tokens for "The Society File".
 *
 * The visual idea: a registrar's physical case file that has been digitised.
 * Kraft-folder sidebar, punch holes, rubber-stamp status badges in oxblood
 * and violet ink, typewriter display face. Every screen imports from here so
 * the admin panel and the member app stay in one visual language.
 */
export const c = {
  paper: "#EFEAD9",
  paperLight: "#F8F5EA",
  ink: "#1A1B16",
  inkMuted: "#75705C",
  line: "#DCD3B7",
  purple: "#4B3B78", // "resolved / paid" stamp ink
  red: "#9E2B25", // "pending / due" stamp ink
  kraft: "#C7A467", // folder tan
  gold: "#A67C2E", // seal / warning
  green: "#3E6B4A",
} as const;

export const font = {
  display: "'Special Elite', 'IBM Plex Mono', monospace",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
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
