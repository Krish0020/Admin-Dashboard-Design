import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Check, Phone, X } from "lucide-react";
import { db } from "../../lib/firebase";
import { UserProfile } from "../../lib/types";
import { Btn, Card, Empty, Heading, Input, Muted, Notice, Spinner, Stamp } from "../../ui/primitives";
import { c, font, formatDate } from "../../ui/theme";

/**
 * The gate for the whole system: a registration only becomes a usable account
 * when a committee member approves it here. The security rules let nobody but
 * an admin write `status` or `role`, so this screen is the only way in.
 */
export default function Members({
  users,
  loading,
  adminUid,
}: {
  users: (UserProfile & { id: string })[];
  loading: boolean;
  adminUid: string;
}) {
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = users.filter((u) => u.status === "pending");
  const active = users.filter((u) => u.status === "active");
  const rejected = users.filter((u) => u.status === "rejected");

  const decide = async (uid: string, status: "active" | "rejected") => {
    setBusyId(uid);
    setError(null);
    try {
      await updateDoc(doc(db, "users", uid), {
        status,
        approvedAt: Date.now(),
        approvedBy: adminUid,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const match = (u: UserProfile) =>
    `${u.name} ${u.flat} ${u.email} ${u.phone}`.toLowerCase().includes(search.toLowerCase());

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {error && <Notice>{error}</Notice>}

      <Card padded={false}>
        <div className="border-b px-6 py-4" style={{ borderColor: c.line }}>
          <Heading>Waiting for approval</Heading>
          <Muted className="mt-1">
            Check each flat number against the society register before opening the account.
          </Muted>
        </div>

        {pending.length === 0 ? (
          <Empty title="No registrations waiting. New sign-ups land here." />
        ) : (
          <ul className="divide-y" style={{ borderColor: c.line }}>
            {pending.map((u) => (
              <li key={u.uid} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {u.name}{" "}
                    <span style={{ fontFamily: font.mono, color: c.inkMuted }}>· Flat {u.flat}</span>
                  </p>
                  <p className="text-[12px]" style={{ color: c.inkMuted }}>
                    {u.email} · {u.phone} · registered {formatDate(u.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Btn loading={busyId === u.uid} onClick={() => decide(u.uid, "active")}>
                    <Check size={15} /> Approve
                  </Btn>
                  <Btn variant="danger" disabled={busyId === u.uid} onClick={() => decide(u.uid, "rejected")}>
                    <X size={15} /> Reject
                  </Btn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4" style={{ borderColor: c.line }}>
          <Heading>Resident directory</Heading>
          <div className="w-56">
            <Input placeholder="Search name or flat" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {active.filter(match).length === 0 ? (
          <Empty title="No approved residents match that search." />
        ) : (
          <ul className="divide-y" style={{ borderColor: c.line }}>
            {active
              .filter(match)
              .sort((a, b) => a.flat.localeCompare(b.flat))
              .map((u) => (
                <li key={u.uid} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {u.name}
                      {u.role === "admin" && (
                        <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `${c.purple}18`, color: c.purple }}>
                          committee
                        </span>
                      )}
                    </p>
                    <p className="text-[12px]" style={{ color: c.inkMuted }}>
                      Flat {u.flat} · {u.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <a href={`tel:${u.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-sm" style={{ color: c.purple, fontFamily: font.mono }}>
                      <Phone size={13} />
                      {u.phone}
                    </a>
                    {u.uid !== adminUid && u.role === "member" && (
                      <Btn variant="outline" onClick={() => decide(u.uid, "rejected")} disabled={busyId === u.uid}>
                        Suspend
                      </Btn>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </Card>

      {rejected.length > 0 && (
        <Card padded={false}>
          <div className="border-b px-6 py-4" style={{ borderColor: c.line }}>
            <Heading size="sm">Suspended or rejected</Heading>
          </div>
          <ul className="divide-y" style={{ borderColor: c.line }}>
            {rejected.map((u) => (
              <li key={u.uid} className="flex items-center justify-between gap-3 px-6 py-3.5">
                <div>
                  <p className="text-sm">{u.name}</p>
                  <p className="text-[12px]" style={{ color: c.inkMuted }}>
                    Flat {u.flat} · {u.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Stamp label="No access" tone="warn" />
                  <Btn variant="outline" onClick={() => decide(u.uid, "active")} disabled={busyId === u.uid}>
                    Restore
                  </Btn>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
