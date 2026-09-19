import { Printer } from "lucide-react";
import { Payment } from "../../lib/types";
import { printReceipt } from "../../lib/receipt";
import { Btn } from "../../ui/primitives";
import { c, font, formatINR, formatDateTime } from "../../ui/theme";

export default function ReceiptSlip({ payment, onDone }: { payment: Payment; onDone?: () => void }) {
  const rows: [string, string][] = [
    ["Receipt no.", payment.transactionId],
    ["Member", payment.memberName],
    ["Flat", payment.flat],
    ["Purpose", payment.purpose],
    ...(payment.monthLabel ? ([["Billing period", payment.monthLabel]] as [string, string][]) : []),
    ["Payment mode", payment.method],
    ["Paid on", formatDateTime(payment.createdAt)],
  ];

  return (
    <div>
      <div className="rounded p-5" style={{ background: c.paperLight, border: `1.5px dashed ${c.gold}` }}>
        <p
          className="border-b pb-3 text-center text-[11px] tracking-[0.2em]"
          style={{ color: c.inkMuted, borderColor: c.line, fontFamily: font.mono }}
        >
          PAYMENT RECEIPT
        </p>

        <dl className="mt-4 space-y-2.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4">
              <dt style={{ color: c.inkMuted }}>{k}</dt>
              <dd className="text-right font-semibold" style={{ fontFamily: font.mono }}>
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: c.line }}>
          <span className="font-semibold">Amount paid</span>
          <span className="text-lg font-bold" style={{ color: c.purple, fontFamily: font.mono }}>
            {formatINR(payment.amount)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Btn variant="outline" block onClick={() => printReceipt(payment)}>
          <Printer size={15} /> Save or print
        </Btn>
        {onDone && (
          <Btn block onClick={onDone}>
            Done
          </Btn>
        )}
      </div>
    </div>
  );
}
