import { useState } from "react";
import { addDoc, collection, deleteDoc, doc } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { db } from "../../lib/firebase";
import { Fund, Payment, UserProfile } from "../../lib/types";
import { Btn, Card, Empty, Field, Heading, Input, Muted, Notice, Spinner, TextArea } from "../../ui/primitives";
import { c, font, formatINR } from "../../ui/theme";

/**
 * Event funds (Ganesh Chaturthi, painting contribution, and so on). Raising a
 * fund makes it appear as a due on every resident's home screen until they
 * pay it; the progress bar here is computed from the actual payments.
 */
export default function Funds({
  funds,
  payments,
  users,
  loading,
}: {
  funds: Fund[];
  payments: Payment[];
  users: (UserProfile & { id: string })[];
  loading: boolean;
}) {
  const [form, setForm] = useState({ eventName: "", amount: "", dueDate: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberCount = users.filter((u) => u.role === "member" && u.status === "active").length;

  const raise = async () => {
    if (!form.eventName.trim() || !Number(form.amount) || !form.dueDate) {
      setError("A fund needs a name, an amount per flat and a due date.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addDoc(collection(db, "funds"), {
        eventName: form.eventName.trim(),
        amount: Number(form.amount),
        dueDate: form.dueDate,
        note: form.note.trim(),
        createdAt: Date.now(),
      });
      setForm({ eventName: "", amount: "", dueDate: "", note: "" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <Heading>Raise a fund</Heading>
        <Muted className="mt-1">Every approved flat sees this as a due until they pay it.</Muted>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Field label="Event or purpose">
              <Input
                value={form.eventName}
                onChange={(e) => setForm({ ...form, eventName: e.target.value })}
                placeholder="Ganesh Chaturthi 2026"
              />
            </Field>
          </div>
          <Field label="Amount per flat">
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="500"
              style={{ fontFamily: font.mono }}
            />
          </Field>
          <Field label="Due date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Note for residents (optional)">
            <TextArea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Covers decoration, prasad and the sound system."
            />
          </Field>
        </div>

        {error && <div className="mt-3">{<Notice>{error}</Notice>}</div>}

        <div className="mt-4">
          <Btn loading={busy} onClick={raise}>
            Raise fund
          </Btn>
        </div>
      </Card>

      <Card padded={false}>
        <div className="border-b px-6 py-4" style={{ borderColor: c.line }}>
          <Heading>Open funds</Heading>
        </div>

        {funds.length === 0 ? (
          <Empty title="No funds raised yet." />
        ) : (
          <ul className="divide-y" style={{ borderColor: c.line }}>
            {funds.map((f) => {
              const paid = payments.filter((p) => p.fundId === f.id);
              const collected = paid.reduce((s, p) => s + Number(p.amount || 0), 0);
              const target = f.amount * Math.max(memberCount, 1);
              const pct = Math.min(100, Math.round((collected / target) * 100));

              return (
                <li key={f.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{f.eventName}</p>
                      <p className="text-xs" style={{ color: c.inkMuted }}>
                        {formatINR(f.amount)} per flat · due {f.dueDate}
                      </p>
                      {f.note && (
                        <p className="mt-1 text-xs" style={{ color: c.inkMuted }}>
                          {f.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold" style={{ color: c.purple, fontFamily: font.mono }}>
                          {formatINR(collected)}
                        </p>
                        <p className="text-[11px]" style={{ color: c.inkMuted }}>
                          {paid.length} of {memberCount} flats
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm("Close this fund? Residents will stop seeing it as a due.")) {
                            deleteDoc(doc(db, "funds", f.id));
                          }
                        }}
                        style={{ color: c.inkMuted }}
                        aria-label="Close fund"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: c.line }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.purple }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
