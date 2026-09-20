import { useState } from "react";
import { addDoc, collection, deleteDoc, doc } from "firebase/firestore";
import { Copy, Plus, Video, X, ArrowLeft } from "lucide-react";
import { db } from "../../lib/firebase";
import { Meeting } from "../../lib/types";
import { useLiveQuery } from "../../lib/useLiveQuery";
import { Btn, Card, Empty, Field, Heading, Input, Modal, Muted, Notice, Select, Spinner, TextArea } from "../../ui/primitives";
import { c, font } from "../../ui/theme";

const empty = {
  title: "",
  agenda: "",
  mode: "Online" as Meeting["mode"],
  venueOrLink: "",
  date: "",
  time: "",
};

/**
 * Society meetings.
 *
 * Online meetings open a Jitsi Meet room inside the dashboard. Jitsi needs no
 * accounts and no downloads, which matters when half the committee is on an
 * old phone. The room name is derived from the meeting title, so everyone who
 * opens the same meeting lands in the same room.
 */
export default function Meetings() {
  const { data: meetings, loading } = useLiveQuery<Meeting>(
    () => collection(db, "meetings"),
    [],
    (a, b) => (a.date + a.time).localeCompare(b.date + b.time)
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [roomTitle, setRoomTitle] = useState("Society meeting");
  const [copied, setCopied] = useState(false);

  const schedule = async () => {
    if (!form.title.trim() || !form.date || !form.time) {
      setError("A meeting needs a title, a date and a time.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addDoc(collection(db, "meetings"), {
        ...form,
        title: form.title.trim(),
        roomName: `NSCHS-${form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        createdAt: Date.now(),
      });
      setForm(empty);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const enterRoom = (name: string, title: string) => {
    setRoom(name);
    setRoomTitle(title);
  };

  const copyLink = (name: string) => {
    navigator.clipboard?.writeText(`https://meet.jit.si/${name}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (loading) return <Spinner />;

  /* ---------------- the live room ---------------- */
  if (room) {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        <button onClick={() => setRoom(null)} className="flex items-center gap-2 text-sm" style={{ color: c.inkMuted }}>
          <ArrowLeft size={15} /> Back to meetings
        </button>

        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5" style={{ borderColor: c.line }}>
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: c.red }} />
              <div>
                <p className="text-sm font-semibold" style={{ fontFamily: font.display }}>
                  {roomTitle}
                </p>
                <p className="text-[11px]" style={{ color: c.inkMuted, fontFamily: font.mono }}>
                  {room}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="outline" onClick={() => copyLink(room)}>
                <Copy size={13} /> {copied ? "Link copied" : "Copy join link"}
              </Btn>
              <Btn variant="danger" onClick={() => setRoom(null)}>
                Leave meeting
              </Btn>
            </div>
          </div>

          <iframe
            title="Society meeting"
            src={`https://meet.jit.si/${room}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{ width: "100%", height: "72vh", border: 0, display: "block" }}
          />
        </Card>

        <Muted>
          Share the join link with residents — they open it in any browser, no account or
          app needed. Your camera and microphone are asked for by Jitsi, not by this portal.
        </Muted>
      </div>
    );
  }

  /* ---------------- the lobby ---------------- */
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="gold-edge text-center">
        <span
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ border: `1.5px solid ${c.purple}`, color: c.purple }}
        >
          <Video size={24} />
        </span>
        <Heading size="lg">Hold a society meeting</Heading>
        <Muted className="mx-auto mt-2 max-w-md">
          Open a video room now for an urgent discussion, or schedule one so residents can
          plan around it. Members join from a link — no account, no download.
        </Muted>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Btn onClick={() => enterRoom(`NSCHS-${Math.random().toString(36).slice(2, 8)}`, "Society meeting")}>
            <Video size={16} /> Start meeting now
          </Btn>
          <Btn variant="outline" onClick={() => setOpen(true)}>
            <Plus size={15} /> Schedule for later
          </Btn>
        </div>
      </Card>

      <Card padded={false}>
        <div className="border-b px-6 py-4" style={{ borderColor: c.line }}>
          <Heading>Scheduled meetings</Heading>
        </div>
        {meetings.length === 0 ? (
          <Empty title="Nothing scheduled." action={<Btn onClick={() => setOpen(true)}>Schedule a meeting</Btn>} />
        ) : (
          <ul className="divide-y" style={{ borderColor: c.line }}>
            {meetings.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-[11px]" style={{ color: c.inkMuted, fontFamily: font.mono }}>
                    {m.date} at {m.time} · {m.mode}
                    {m.venueOrLink ? ` · ${m.venueOrLink}` : ""}
                  </p>
                  {m.agenda && (
                    <p className="mt-1 text-xs" style={{ color: c.inkMuted }}>
                      {m.agenda}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.mode === "Online" && (
                    <Btn onClick={() => enterRoom(m.roomName || `NSCHS-${m.id.slice(0, 6)}`, m.title)}>
                      <Video size={14} /> Start meeting
                    </Btn>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("Cancel this meeting?")) deleteDoc(doc(db, "meetings", m.id));
                    }}
                    style={{ color: c.inkMuted }}
                    aria-label="Cancel meeting"
                  >
                    <X size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open && (
        <Modal title="Schedule a meeting" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Annual general meeting"
              />
            </Field>
            <Field label="Agenda">
              <TextArea rows={2} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label="Time">
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mode">
                <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as Meeting["mode"] })}>
                  <option>Online</option>
                  <option>Offline</option>
                </Select>
              </Field>
              <Field label={form.mode === "Online" ? "Joining note" : "Venue"}>
                <Input
                  value={form.venueOrLink}
                  onChange={(e) => setForm({ ...form, venueOrLink: e.target.value })}
                  placeholder={form.mode === "Online" ? "Link shared on the notice board" : "Society hall"}
                />
              </Field>
            </div>
            {error && <Notice>{error}</Notice>}
            <Btn block loading={busy} onClick={schedule}>
              Schedule meeting
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}