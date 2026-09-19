import { useState } from "react";
import { addDoc, collection, deleteDoc, doc } from "firebase/firestore";
import { Plus, Trash2 } from "lucide-react";
import { db } from "../../lib/firebase";
import { Notice as NoticeDoc } from "../../lib/types";
import { Btn, Card, Empty, Field, Heading, Input, Modal, Muted, Notice, Spinner, TextArea } from "../../ui/primitives";
import { c, font, formatDateTime } from "../../ui/theme";

export default function Notices({
  notices,
  loading,
  adminName,
}: {
  notices: NoticeDoc[];
  loading: boolean;
  adminName: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", urgent: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError("A notice needs a title and the details residents should read.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addDoc(collection(db, "notices"), {
        number: String(notices.length + 1).padStart(3, "0"),
        title: form.title.trim(),
        body: form.body.trim(),
        urgent: form.urgent,
        postedBy: adminName,
        createdAt: Date.now(),
      });
      setForm({ title: "", body: "", urgent: false });
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Muted>
          {notices.length} notice{notices.length === 1 ? "" : "s"} published
        </Muted>
        <Btn onClick={() => setOpen(true)}>
          <Plus size={16} /> Post a notice
        </Btn>
      </div>

      {loading ? (
        <Spinner />
      ) : notices.length === 0 ? (
        <Card padded={false}>
          <Empty
            title="The board is empty. Anything you post here reaches every resident's phone immediately."
            action={<Btn onClick={() => setOpen(true)}>Post the first notice</Btn>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <Card key={n.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: n.urgent ? `${c.red}18` : `${c.purple}18`,
                    color: n.urgent ? c.red : c.purple,
                    fontFamily: font.mono,
                  }}
                >
                  {n.urgent ? "Urgent" : "Notice"} #{n.number}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px]" style={{ color: c.inkMuted }}>
                    {formatDateTime(n.createdAt)}
                  </span>
                  <button
                    onClick={() => {
                      if (confirm("Take this notice off the board?")) deleteDoc(doc(db, "notices", n.id));
                    }}
                    style={{ color: c.inkMuted }}
                    aria-label="Delete notice"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <Heading size="sm">{n.title}</Heading>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#4A4838" }}>
                {n.body}
              </p>
              <p className="mt-3 text-[11px]" style={{ color: c.inkMuted }}>
                Posted by {n.postedBy}
              </p>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <Modal title="Post a notice" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Water supply interrupted on Thursday"
              />
            </Field>
            <Field label="Details">
              <TextArea
                rows={5}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Tank cleaning between 10 AM and 4 PM. Please store water in advance."
              />
            </Field>
            <label
              className="flex cursor-pointer items-center gap-2.5 rounded p-3"
              style={{ background: `${c.red}0D`, border: `1px solid ${c.red}33` }}
            >
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.urgent}
                onChange={(e) => setForm({ ...form, urgent: e.target.checked })}
              />
              <span className="text-sm font-semibold" style={{ color: c.red }}>
                Mark as urgent
              </span>
            </label>
            {error && <Notice>{error}</Notice>}
            <Btn block loading={busy} onClick={publish}>
              Publish to all residents
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
