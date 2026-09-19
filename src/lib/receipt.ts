import { Payment } from "./types";
import { SOCIETY_NAME, formatINR, formatDateTime } from "../ui/theme";

const escapeHtml = (value: string) =>
  String(value).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string
  );

/**
 * Opens the receipt in a print window. The browser's print dialog can save it
 * as a PDF, which keeps the app free of a PDF library and works on phones.
 */
export function printReceipt(p: Payment) {
  const rows: [string, string][] = [
    ["Receipt no.", p.transactionId],
    ["Member", p.memberName],
    ["Flat", p.flat],
    ["Purpose", p.purpose],
    ["Payment mode", p.method],
    ["Paid on", formatDateTime(p.createdAt)],
  ];
  if (p.monthLabel) rows.splice(4, 0, ["Billing period", p.monthLabel]);

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(p.transactionId)}</title>
<style>
  @page { size: A5; margin: 14mm; }
  body { font-family: "IBM Plex Mono", ui-monospace, monospace; color: #1A1B16; background: #fff; }
  .slip { border: 1.5px dashed #A67C2E; padding: 24px; max-width: 460px; margin: 0 auto; }
  h1 { font-size: 15px; letter-spacing: .12em; text-align: center; margin: 0 0 4px; }
  .sub { text-align: center; font-size: 11px; color: #75705C; margin: 0 0 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 6px 0; vertical-align: top; }
  td:last-child { text-align: right; font-weight: 600; }
  .total { border-top: 1px solid #DCD3B7; margin-top: 12px; padding-top: 12px;
           display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; }
  .foot { margin-top: 20px; font-size: 10px; color: #75705C; text-align: center; line-height: 1.6; }
</style></head>
<body onload="window.print()">
  <div class="slip">
    <h1>PAYMENT RECEIPT</h1>
    <p class="sub">${escapeHtml(SOCIETY_NAME)}</p>
    <table>${rows
      .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
      .join("")}</table>
    <div class="total"><span>Amount paid</span><span>${escapeHtml(formatINR(p.amount))}</span></div>
    <p class="foot">Computer-generated receipt. No signature required.<br/>
      Keep this for your records — the society office can verify it using the receipt number.</p>
  </div>
</body></html>`;

  const w = window.open("", "_blank", "width=520,height=720");
  if (!w) {
    alert("Your browser blocked the receipt window. Allow pop-ups for this site and try again.");
    return;
  }
  w.document.write(html);
  w.document.close();
}

/** Human-readable receipt number, e.g. NS-260919-8F3K2. */
export function newReceiptNumber() {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `NS-${stamp}-${rand}`;
}
