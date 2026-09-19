import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Plus, Trash2 } from "lucide-react";
import { db } from "../../lib/firebase";
import { WorkItem, WorkStatus } from "../../lib/types";
import { byNewest, useLiveQuery } from "../../lib/useLiveQuery";
import { Btn, Card, Empty, Field, Heading, Input, Modal, Muted, Notice, Select, Spinner, TextArea } from "../../ui/primitives";
import { c, font, formatINR } from "../../ui/theme";

const STATUSES: WorkStatus[] = ["Pending", "In Progress", "Completed", "Cancelled"];
const CATEGORIES = ["Plumbing", "Electrical", "Painting", "Cleaning", "Gardening", "Security", "Civil / structural", "Other"];

const empty = {
  title: "",
  description: "",
  category: CATEGORIES[0],
  priority: "Medium" as WorkItem["priority"],
  assignedTo: "",
  workerPhone: "",
  estimatedCost: "",
  finalCost: "",
  startDate: "",
  expectedDate: "",
  progress: "0",
  remarks: "",
};

/** Repairs and contracts, tracked by status from raised to completed. */
export default function Work() {
  const { data: items, loading } = useLiveQuery<WorkItem>(() => collection(db, "work_items"), [], byNewest);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<WorkItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startNew = () => {
    setForm(empty);
    setEditing(null);
    setError(null);
    setOpen(true);
  };

  const startEdit = (item: WorkItem) => {
    setForm({
      title: item.title,
      description: item.description,
      category: item.category,
      priority: item.priority,
      assignedTo: item.assignedTo,
      workerPhone: item.workerPhone,
      estimatedCost: item.estimatedCost,
      finalCost: item.finalCost,
      startDate: item.startDate,
      expectedDate: item.expectedDate,
      progress: String(item.progress ?? 0),
      remarks: item.remarks,
    });
    setEditing(item.id);
    setSelected(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError("Give the job a title, for example 'Sewage line cleaning — B wing'.");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = { ...form, progress: Math.max(0, Math.min(100, Number(form.progress) || 0)) };
    try {
      if (editing) {
        await updateDoc(doc(db, "work_items", editing), payload);
      } else {
        await addDoc(collection(db, "work_items"), { ...payload, status: "Pending" as WorkStatus, createdAt: Date.now() });
      }
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: WorkStatus) => {
    await updateDoc(doc(db, "work_items", id), { status });
  };

  const columnColor = (s: WorkStatus) =>
    s === "Completed" ? c.purple : s === "In Progress" ? c.gold : s === "Cancelled" ? c.inkMuted : c.red;

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Muted>
          {items.length} job{items.length === 1 ? "" : "s"} on record
        </Muted>
        <Btn onClick={startNew}>
          <Plus size={16} /> Add a job
        </Btn>
      </div>

      {items.length === 0 ? (
        <Card padded={false}>
          <Empty
            title="Nothing in the work register. Add repairs and contracts here to keep costs and timelines in one place."
            action={<Btn onClick={startNew}>Add the first job</Btn>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {STATUSES.map((status) => {
            const column = items.filter((w) => w.status === status);
            const color = columnColor(status);
            return (
              <Card key={status} padded={false}>
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: c.line }}>
                  <span className="text-xs font-semibold" style={{ color, fontFamily: font.mono }}>
                    {status}
                  </span>
                  <span className="rounded-full px-1.5 text-[10px] font-semibold" style={{ background: `${color}18`, color }}>
                    {column.length}
                  </span>
                </div>
                <div className="min-h-[120px] space-y-2.5 p-2.5">
                  {column.map((item) => {
                    const priorityColor =
                      item.priority === "High" ? c.red : item.priority === "Medium" ? c.gold : c.purple;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className="w-full rounded p-3 text-left"
                        style={{ background: c.paper, border: `1px solid ${c.line}`, borderLeft: `3px solid ${priorityColor}` }}
                      >
                        <p className="mb-1 text-sm font-medium">{item.title}</p>
                        <p className="mb-2 text-[11px]" style={{ color: c.inkMuted }}>
                          {item.category}
                          {item.assignedTo ? ` · ${item.assignedTo}` : ""}
                        </p>
                        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: c.line }}>
                          <div className="h-full rounded-full" style={{ width: `${item.progress || 0}%`, background: color }} />
                        </div>
                      </button>
                    );
                  })}
                  {column.length === 0 && (
                    <p className="py-4 text-center text-[11px]" style={{ color: c.inkMuted }}>
                      Nothing here
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail */}
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)} wide>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selected.status}
                onChange={(e) => {
                  const next = e.target.value as WorkStatus;
                  setStatus(selected.id, next);
                  setSelected({ ...selected, status: next });
                }}
                style={{ width: "auto", fontFamily: font.mono }}
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
              <span
                className="rounded px-2 py-1 text-[10px] font-semibold"
                style={{
                  color: selected.priority === "High" ? c.red : selected.priority === "Medium" ? c.gold : c.purple,
                  background: `${selected.priority === "High" ? c.red : selected.priority === "Medium" ? c.gold : c.purple}18`,
                }}
              >
                {selected.priority} priority
              </span>
            </div>

            {selected.description && <Muted>{selected.description}</Muted>}

            <dl className="grid grid-cols-2 gap-3 text-sm">
              {([
                ["Category", selected.category],
                ["Assigned to", selected.assignedTo || "—"],
                ["Contact", selected.workerPhone || "—"],
                ["Estimated cost", selected.estimatedCost ? formatINR(Number(selected.estimatedCost)) : "—"],
                ["Final cost", selected.finalCost ? formatINR(Number(selected.finalCost)) : "—"],
                ["Started", selected.startDate || "—"],
                ["Expected", selected.expectedDate || "—"],
                ["Progress", `${selected.progress || 0}%`],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px]" style={{ color: c.inkMuted }}>
                    {k}
                  </dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>

            {selected.remarks && (
              <p className="rounded px-3 py-2 text-sm" style={{ background: c.paper, color: c.inkMuted }}>
                {selected.remarks}
              </p>
            )}

            <div className="flex gap-2">
              <Btn variant="outline" block onClick={() => startEdit(selected)}>
                Edit
              </Btn>
              <Btn
                variant="danger"
                onClick={async () => {
                  if (confirm("Remove this job from the register?")) {
                    await deleteDoc(doc(db, "work_items", selected.id));
                    setSelected(null);
                  }
                }}
              >
                <Trash2 size={16} />
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Create / edit */}
      {open && (
        <Modal title={editing ? "Edit job" : "Add a job"} onClose={() => setOpen(false)} wide>
          <div className="space-y-3">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Sewage line cleaning — B wing"
              />
            </Field>
            <Field label="Description">
              <TextArea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Priority">
                <Select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as WorkItem["priority"] })}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Assigned to">
                <Input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
              </Field>
              <Field label="Contact number">
                <Input
                  value={form.workerPhone}
                  onChange={(e) => setForm({ ...form, workerPhone: e.target.value })}
                  style={{ fontFamily: font.mono }}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estimated cost">
                <Input
                  type="number"
                  value={form.estimatedCost}
                  onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
                  style={{ fontFamily: font.mono }}
                />
              </Field>
              <Field label="Final cost">
                <Input
                  type="number"
                  value={form.finalCost}
                  onChange={(e) => setForm({ ...form, finalCost: e.target.value })}
                  style={{ fontFamily: font.mono }}
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Start date">
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </Field>
              <Field label="Expected by">
                <Input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
              </Field>
              <Field label="Progress %">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={(e) => setForm({ ...form, progress: e.target.value })}
                  style={{ fontFamily: font.mono }}
                />
              </Field>
            </div>
            <Field label="Remarks">
              <TextArea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </Field>

            {error && <Notice>{error}</Notice>}

            <Btn block loading={busy} onClick={save}>
              {editing ? "Save changes" : "Add to register"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
