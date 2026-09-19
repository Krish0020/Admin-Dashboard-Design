import { useMemo, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { Plus, Printer, Wallet } from "lucide-react";
import { db } from "../../lib/firebase";
import { Payment, UserProfile } from "../../lib/types";
import { newReceiptNumber, printReceipt } from "../../lib/receipt";
import { Btn, Card, Empty, Field, Heading, Input, Modal, Muted, Notice, Select, Spinner } from "../../ui/primitives";
import { c, font, formatINR, formatDate, monthLabel, MAINTENANCE_AMOUNT } from "../../ui/theme";

const OFFLINE_METHODS = ["Cash", "Cheque", "Bank transfer", "UPI (outside app)"];

/**
 * The society's book of account. Residents paying in the app write here
 * themselves; cash and cheque payments collected at the office are entered
 * by the committee with "Record a payment", so the ledger stays complete.
 */
export default function Ledger({
  payments,
  users,
  loading,
}: {
  payments: Payment[];
  users: (UserProfile & { id: string })[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const members = users.filter((u) => u.status === "active");

  const totals = useMemo(() => {
    const all = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const maintenance = payments.filter((p) => p.type === "Maintenance").reduce((s, p) => s + Number(p.amount || 0), 0);
    return { all, maintenance, events: all - maintenance };
  }, [payments]);

  const shown = payments.filter((p) =>
    `${p.flat} ${p.memberName} ${p.purpose} ${p.transactionId}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="grid gap-5 md:grid-cols-3">
        {[
          { label: "Total collected", value: formatINR(totals.all), color: c.purple },
          { label: "From maintenance", value: formatINR(totals.maintenance), color: c.gold },
          { label: "From event funds", value: formatINR(totals.events), color: c.red },
        ].map((s) => (
          <Card key={s.label}>
            <div className="mb-1 flex items-center gap-3" style={{ color: s.color }}>
              <Wallet size={17} />
              <span className="text-[11px] font-medium" style={{ color: c.inkMuted }}>
                {s.label}
              </span>
            </div>
            <p className="text-xl font-semibold" style={{ fontFamily: font.mono }}>
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4" style={{ borderColor: c.line }}>
          <Heading>Full ledger</Heading>
          <div className="flex items-center gap-3">
            <div className="w-52">
              <Input placeholder="Search flat or receipt no." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Btn onClick={() => setOpen(true)}>
              <Plus size={16} /> Record a payment
            </Btn>
          </div>
        </div>

        {shown.length === 0 ? (
          <Empty title="No entries yet. Payments made in the app appear here instantly." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ background: c.paper }}>
                  {["Flat", "Member", "Purpose", "Mode", "Receipt no.", "Amount", "Date", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold" style={{ color: c.inkMuted }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 ? "rgba(0,0,0,0.02)" : "transparent" }}>
                    <td className="px-5 py-3.5 font-medium" style={{ fontFamily: font.mono }}>
                      {p.flat}
                    </td>
                    <td className="px-5 py-3.5">{p.memberName}</td>
                    <td className="px-5 py-3.5" style={{ color: c.inkMuted }}>
                      {p.purpose}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: c.inkMuted }}>
                      {p.method}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs" style={{ color: c.inkMuted, fontFamily: font.mono }}>
                      {p.transactionId}
                    </td>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: c.purple, fontFamily: font.mono }}>
                      {formatINR(p.amount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5" style={{ color: c.inkMuted }}>
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => printReceipt(p)} style={{ color: c.inkMuted }} aria-label="Print receipt">
                        <Printer size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {open && <OfflineEntry members={members} onClose={() => setOpen(false)} />}
    </div>
  );
}

function OfflineEntry({ members, onClose }: { members: (UserProfile & { id: string })[]; onClose: () => void }) {
  const [uid, setUid] = useState(members[0]?.uid || "");
  const [purpose, setPurpose] = useState("Monthly maintenance");
  const [amount, setAmount] = useState(String(MAINTENANCE_AMOUNT));
  const [method, setMethod] = useState(OFFLINE_METHODS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const member = members.find((m) => m.uid === uid);
    const value = Number(amount);
    if (!member) return setError("Choose the flat this payment came from.");
    if (!value || value <= 0) return setError("Enter the amount received.");

    setBusy(true);
    setError(null);
    try {
      await addDoc(collection(db, "payments"), {
        uid: member.uid,
        flat: member.flat,
        memberName: member.name,
        type: purpose === "Monthly maintenance" ? "Maintenance" : "Event",
        purpose,
        ...(purpose === "Monthly maintenance" ? { monthLabel: monthLabel() } : {}),
        amount: value,
        method,
        transactionId: newReceiptNumber(),
        recordedBy: "admin" as const,
        createdAt: Date.now(),
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Record a payment" onClose={onClose}>
      <div className="space-y-4">
        <Muted>For cash, cheque or bank transfers collected outside the app.</Muted>

        <Field label="Flat">
          <Select value={uid} onChange={(e) => setUid(e.target.value)}>
            {members.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.flat} — {m.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Purpose">
          <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Monthly maintenance" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount received">
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ fontFamily: font.mono }} />
          </Field>
          <Field label="Mode">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {OFFLINE_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
        </div>

        {error && <Notice>{error}</Notice>}

        <Btn block loading={busy} onClick={save}>
          Add to ledger
        </Btn>
      </div>
    </Modal>
  );
}
