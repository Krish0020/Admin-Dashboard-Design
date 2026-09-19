import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Complaint, ComplaintStatus } from "../../lib/types";
import { Btn, Card, Empty, Field, Heading, Modal, Muted, Notice, Select, Spinner, Stamp, TextArea } from "../../ui/primitives";
import { c, font, formatDateTime } from "../../ui/theme";

const STATUSES: ComplaintStatus[] = ["Pending", "In Progress", "Resolved"];

export default function Complaints({ complaints, loading }: { complaints: Complaint[]; loading: boolean }) {
  const [filter, setFilter] = useState<"All" | ComplaintStatus>("All");
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<ComplaintStatus>("Pending");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (x: Complaint) => {
    setSelected(x);
    setNote(x.adminNote || "");
    setStatus(x.status);
    setError(null);
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await updateDoc(doc(db, "complaints", selected.id), {
        status,
        adminNote: note.trim(),
        updatedAt: Date.now(),
      });
      setSelected(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const tone = (s: ComplaintStatus) => (s === "Resolved" ? "ok" : s === "In Progress" ? "neutral" : "warn");
  const shown = complaints.filter((x) => filter === "All" || x.status === filter);

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex gap-2">
        {(["All", ...STATUSES] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{
              background: filter === f ? c.ink : "transparent",
              color: filter === f ? c.paperLight : c.inkMuted,
              border: `1px solid ${filter === f ? c.ink : c.line}`,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <Card padded={false}>
        {shown.length === 0 ? (
          <Empty title="Nothing in this view." />
        ) : (
          <ul className="divide-y" style={{ borderColor: c.line }}>
            {shown.map((x) => (
              <li key={x.id}>
                <button onClick={() => open(x)} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      <span style={{ fontFamily: font.mono }}>{x.flat}</span> · {x.category}
                    </span>
                    <span className="mt-0.5 block truncate text-sm" style={{ color: c.inkMuted }}>
                      {x.issue}
                    </span>
                    <span className="mt-0.5 block text-[11px]" style={{ color: c.inkMuted }}>
                      {x.memberName} · {formatDateTime(x.createdAt)}
                    </span>
                  </span>
                  <Stamp label={x.status} tone={tone(x.status)} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selected && (
        <Modal title={`Flat ${selected.flat} — ${selected.category}`} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div className="rounded px-4 py-3" style={{ background: c.paper, border: `1px solid ${c.line}` }}>
              <p className="text-sm">{selected.issue}</p>
              <p className="mt-2 text-[11px]" style={{ color: c.inkMuted }}>
                Raised by {selected.memberName} on {formatDateTime(selected.createdAt)}
              </p>
            </div>

            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as ComplaintStatus)}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>

            <Field label="Note to the resident" hint="This is shown to them inside their portal.">
              <TextArea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Plumber scheduled for Saturday morning."
              />
            </Field>

            {error && <Notice>{error}</Notice>}

            <div className="flex gap-3">
              <Btn variant="outline" block onClick={() => setSelected(null)}>
                Cancel
              </Btn>
              <Btn block loading={busy} onClick={save}>
                Save update
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
