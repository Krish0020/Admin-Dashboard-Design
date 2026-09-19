import { useMemo, useState } from "react";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { Search, Send } from "lucide-react";
import { db } from "../../lib/firebase";
import { ChatMessage, UserProfile } from "../../lib/types";
import { useLiveQuery } from "../../lib/useLiveQuery";
import { Btn, Card, Empty, Heading, Input, Spinner } from "../../ui/primitives";
import { c, font } from "../../ui/theme";

/**
 * One thread per resident, keyed by their uid. The same `messages` collection
 * backs the resident's Chat tab, so both sides see the conversation live.
 */
export default function Chat({
  users,
  adminName,
  adminUid,
}: {
  users: (UserProfile & { id: string })[];
  adminName: string;
  adminUid: string;
}) {
  const { data: messages, loading } = useLiveQuery<ChatMessage>(
    () => collection(db, "messages"),
    [],
    (a, b) => a.createdAt - b.createdAt
  );

  const residents = users.filter((u) => u.role === "member" && u.status === "active");
  const [search, setSearch] = useState("");
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [text, setText] = useState("");

  const active = residents.find((r) => r.uid === activeUid) || null;
  const thread = useMemo(() => messages.filter((m) => m.chatId === activeUid), [messages, activeUid]);

  const openThread = async (uid: string) => {
    setActiveUid(uid);
    const unread = messages.filter((m) => m.chatId === uid && m.senderRole === "member" && !m.readByAdmin);
    await Promise.all(unread.map((m) => updateDoc(doc(db, "messages", m.id), { readByAdmin: true })));
  };

  const send = async () => {
    if (!text.trim() || !activeUid) return;
    const body = text.trim();
    setText("");
    await addDoc(collection(db, "messages"), {
      chatId: activeUid,
      senderUid: adminUid,
      senderRole: "admin",
      senderName: adminName,
      text: body,
      readByAdmin: true,
      readByMember: false,
      createdAt: Date.now(),
    });
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-6xl">
      <Card padded={false}>
        <div className="flex" style={{ height: "72vh" }}>
          {/* Threads */}
          <div className="flex w-72 shrink-0 flex-col border-r" style={{ borderColor: c.line }}>
            <div className="border-b p-3" style={{ borderColor: c.line }}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" size={14} style={{ color: c.inkMuted }} />
                <Input
                  className="pl-8"
                  placeholder="Search residents"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {residents
                .filter((r) => `${r.name} ${r.flat}`.toLowerCase().includes(search.toLowerCase()))
                .sort((a, b) => a.flat.localeCompare(b.flat))
                .map((r) => {
                  const rows = messages.filter((m) => m.chatId === r.uid);
                  const last = rows[rows.length - 1];
                  const unread = rows.filter((m) => m.senderRole === "member" && !m.readByAdmin).length;
                  const selected = activeUid === r.uid;
                  return (
                    <button
                      key={r.uid}
                      onClick={() => openThread(r.uid)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                      style={{
                        background: selected ? c.paper : "transparent",
                        borderLeft: `3px solid ${selected ? c.purple : "transparent"}`,
                      }}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                        style={{ background: `${c.purple}18`, color: c.purple, fontFamily: font.mono }}
                      >
                        {r.flat.replace("-", "")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.name}</span>
                        <span className="block truncate text-xs" style={{ color: c.inkMuted }}>
                          {last ? last.text : "No messages yet"}
                        </span>
                      </span>
                      {unread > 0 && (
                        <span className="rounded-full px-1.5 text-[10px] font-semibold text-white" style={{ background: c.red }}>
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              {residents.length === 0 && <Empty title="No approved residents yet." />}
            </div>
          </div>

          {/* Conversation */}
          <div className="flex min-w-0 flex-1 flex-col">
            {!active ? (
              <div className="flex flex-1 items-center justify-center">
                <Empty title="Pick a resident to read the conversation." />
              </div>
            ) : (
              <>
                <div className="border-b px-5 py-3.5" style={{ borderColor: c.line }}>
                  <Heading size="sm">{active.name}</Heading>
                  <p className="text-[11px]" style={{ color: c.inkMuted }}>
                    Flat {active.flat} · {active.phone}
                  </p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-5" style={{ background: c.paper }}>
                  {thread.length === 0 && (
                    <p className="mt-8 text-center text-sm" style={{ color: c.inkMuted }}>
                      No messages yet. Write the first one below.
                    </p>
                  )}
                  {thread.map((m) => {
                    const mine = m.senderRole === "admin";
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className="max-w-[70%] rounded px-3.5 py-2 text-sm"
                          style={
                            mine
                              ? { background: c.purple, color: c.paperLight, borderTopRightRadius: 2 }
                              : { background: c.paperLight, border: `1px solid ${c.line}`, borderTopLeftRadius: 2 }
                          }
                        >
                          <p>{m.text}</p>
                          <p className="mt-1 text-[10px] opacity-70">
                            {new Date(m.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 border-t p-3" style={{ borderColor: c.line }}>
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder={`Reply to ${active.name}`}
                  />
                  <Btn onClick={send} aria-label="Send" style={{ padding: "0.7rem" }}>
                    <Send size={16} />
                  </Btn>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
