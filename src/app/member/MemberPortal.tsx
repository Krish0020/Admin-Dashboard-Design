import { useMemo, useState } from "react";
import { addDoc, collection, doc, query, updateDoc, where } from "firebase/firestore";
import {
  Home,
  Megaphone,
  Landmark,
  MessageSquareWarning,
  UserCircle2,
  MessagesSquare,
  ChevronRight,
  Phone,
  Send,
  LogOut,
  Receipt as ReceiptIcon,
} from "lucide-react";
import { db } from "../../lib/firebase";
import { ChatMessage, Complaint, Fund, Notice as NoticeDoc, Payment } from "../../lib/types";
import { byNewest, useLiveQuery } from "../../lib/useLiveQuery";
import { useAuth, authErrorMessage } from "../../auth/AuthContext";
import {
  Btn,
  Card,
  Empty,
  Field,
  Heading,
  Input,
  Modal,
  Muted,
  Notice,
  Select,
  Spinner,
  Stamp,
  TextArea,
} from "../../ui/primitives";
import { c, font, formatINR, formatDate, monthLabel, MAINTENANCE_AMOUNT, SOCIETY_NAME } from "../../ui/theme";
import PayModal, { PayRequest } from "./PayModal";
import ReceiptSlip from "./ReceiptSlip";

const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "notices", label: "Notices", icon: Megaphone },
  { id: "payments", label: "Payments", icon: Landmark },
  { id: "complaints", label: "Issues", icon: MessageSquareWarning },
  { id: "chat", label: "Chat", icon: MessagesSquare },
  { id: "profile", label: "Profile", icon: UserCircle2 },
] as const;
type TabId = (typeof TABS)[number]["id"];

const COMPLAINT_CATEGORIES = [
  "Water supply",
  "Electricity",
  "Lift",
  "Plumbing / drainage",
  "Cleanliness",
  "Security",
  "Parking",
  "Other",
];

const CONTACTS = [
  { role: "Society secretary", phone: "+91 98200 00000" },
  { role: "Watchman", phone: "+91 90000 11111" },
  { role: "Plumber (on call)", phone: "+91 90000 22222" },
];

export default function MemberPortal() {
  const { profile, logout } = useAuth();
  const [tab, setTab] = useState<TabId>("home");
  const uid = profile?.uid;

  /* ---------------- live data ---------------- */

  const notices = useLiveQuery<NoticeDoc>(() => collection(db, "notices"), [], byNewest);
  const funds = useLiveQuery<Fund>(() => collection(db, "funds"), [], byNewest);
  const payments = useLiveQuery<Payment>(
    () => (uid ? query(collection(db, "payments"), where("uid", "==", uid)) : null),
    [uid],
    byNewest
  );
  const complaints = useLiveQuery<Complaint>(
    () => (uid ? query(collection(db, "complaints"), where("uid", "==", uid)) : null),
    [uid],
    byNewest
  );
  const messages = useLiveQuery<ChatMessage>(
    () => (uid ? query(collection(db, "messages"), where("chatId", "==", uid)) : null),
    [uid],
    (a, b) => a.createdAt - b.createdAt
  );

  /* ---------------- local UI state ---------------- */

  const [payRequest, setPayRequest] = useState<PayRequest | null>(null);
  const [freshReceipt, setFreshReceipt] = useState<Payment | null>(null);
  const [openReceipt, setOpenReceipt] = useState<Payment | null>(null);

  const thisMonth = monthLabel();
  const maintenancePaid = useMemo(
    () => payments.data.some((p) => p.type === "Maintenance" && p.monthLabel === thisMonth),
    [payments.data, thisMonth]
  );
  const unpaidFunds = useMemo(
    () => funds.data.filter((f) => !payments.data.some((p) => p.fundId === f.id)),
    [funds.data, payments.data]
  );
  const openComplaints = complaints.data.filter((x) => x.status !== "Resolved").length;

  if (!profile) return <Spinner />;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-24" style={{ background: c.paper, fontFamily: font.sans }}>
      {/* Header */}
      <header
        className="paper-rule relative rounded-b-3xl px-6 pb-7 pt-9 text-center"
        style={{ background: c.deep }}
      >
        <button
          onClick={() => logout()}
          className="absolute right-5 top-7 rounded p-2"
          style={{ color: "#B7C4BB" }}
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
        <p className="text-[11px] tracking-[0.18em]" style={{ color: c.purple, fontFamily: font.mono }}>
          Resident portal
        </p>
        <h1 className="mt-1.5 text-xl" style={{ color: c.ink, fontFamily: font.display }}>
          {SOCIETY_NAME}
        </h1>
        <p className="mt-1 text-xs" style={{ color: "#8FA396", fontFamily: font.mono }}>
          {profile.name} · Flat {profile.flat}
        </p>
      </header>

      <div className="px-5 pt-6">
        {tab === "home" && (
          <div className="space-y-5">
            {/* Maintenance */}
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Heading>Monthly maintenance</Heading>
                  <Muted className="mt-1">{thisMonth}</Muted>
                </div>
                <Stamp label={maintenancePaid ? "Paid" : "Due"} tone={maintenancePaid ? "ok" : "warn"} />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span
                  className="text-2xl font-semibold"
                  style={{ fontFamily: font.mono, color: maintenancePaid ? c.purple : c.red }}
                >
                  {formatINR(MAINTENANCE_AMOUNT)}
                </span>
                {!maintenancePaid && (
                  <Btn
                    onClick={() =>
                      setPayRequest({
                        type: "Maintenance",
                        purpose: "Monthly maintenance",
                        amount: MAINTENANCE_AMOUNT,
                      })
                    }
                  >
                    Pay now
                  </Btn>
                )}
              </div>
            </Card>

            {/* Event funds still open */}
            {unpaidFunds.map((fund) => (
              <Card key={fund.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Heading>{fund.eventName}</Heading>
                    <Muted className="mt-1">Due by {fund.dueDate}</Muted>
                  </div>
                  <Stamp label="Due" tone="warn" />
                </div>
                {fund.note && <Muted className="mt-2">{fund.note}</Muted>}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-semibold" style={{ fontFamily: font.mono, color: c.red }}>
                    {formatINR(fund.amount)}
                  </span>
                  <Btn
                    onClick={() =>
                      setPayRequest({
                        type: "Event",
                        purpose: fund.eventName,
                        amount: fund.amount,
                        fundId: fund.id,
                      })
                    }
                  >
                    Pay now
                  </Btn>
                </div>
              </Card>
            ))}

            {/* Latest notice */}
            {notices.data[0] && (
              <button onClick={() => setTab("notices")} className="w-full text-left">
                <Card className="flex items-center gap-3" >
                  <Megaphone size={18} style={{ color: notices.data[0].urgent ? c.red : c.purple }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{notices.data[0].title}</span>
                    <span className="block text-[11px]" style={{ color: c.inkMuted }}>
                      {formatDate(notices.data[0].createdAt)}
                    </span>
                  </span>
                  <ChevronRight size={16} style={{ color: c.inkMuted }} />
                </Card>
              </button>
            )}

            <button onClick={() => setTab("complaints")} className="w-full text-left">
              <Card className="flex items-center gap-3">
                <MessageSquareWarning size={18} style={{ color: c.purple }} />
                <span className="flex-1 text-sm font-medium">
                  {openComplaints > 0 ? `${openComplaints} issue${openComplaints > 1 ? "s" : ""} being handled` : "Report an issue"}
                </span>
                <ChevronRight size={16} style={{ color: c.inkMuted }} />
              </Card>
            </button>

            <Card>
              <Heading size="sm">Useful numbers</Heading>
              <div className="mt-3 space-y-2.5">
                {CONTACTS.map((x) => (
                  <a key={x.role} href={`tel:${x.phone.replace(/\s/g, "")}`} className="flex items-center justify-between text-sm">
                    <span>{x.role}</span>
                    <span className="flex items-center gap-1.5" style={{ color: c.purple, fontFamily: font.mono }}>
                      <Phone size={13} />
                      {x.phone}
                    </span>
                  </a>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "notices" && <NoticesTab notices={notices.data} loading={notices.loading} />}

        {tab === "payments" && (
          <PaymentsTab payments={payments.data} loading={payments.loading} onOpen={setOpenReceipt} />
        )}

        {tab === "complaints" && <ComplaintsTab complaints={complaints.data} loading={complaints.loading} />}

        {tab === "chat" && <ChatTab messages={messages.data} loading={messages.loading} />}

        {tab === "profile" && <ProfileTab />}
      </div>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 border-t"
        style={{ background: c.paperLight, borderColor: c.line }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
              style={{ color: active ? c.purple : c.inkMuted }}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full"
                  style={{ background: c.purple }}
                />
              )}
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Payment flow */}
      {payRequest && profile && (
        <PayModal
          request={payRequest}
          profile={profile}
          onClose={() => setPayRequest(null)}
          onPaid={(p) => {
            setPayRequest(null);
            setFreshReceipt(p);
          }}
        />
      )}

      {freshReceipt && (
        <Modal title="Payment recorded" onClose={() => setFreshReceipt(null)}>
          <ReceiptSlip payment={freshReceipt} onDone={() => setFreshReceipt(null)} />
        </Modal>
      )}

      {openReceipt && (
        <Modal title="Receipt" onClose={() => setOpenReceipt(null)}>
          <ReceiptSlip payment={openReceipt} />
        </Modal>
      )}
    </div>
  );
}

/* ================================================================== */
/* Tabs                                                                */
/* ================================================================== */

function NoticesTab({ notices, loading }: { notices: NoticeDoc[]; loading: boolean }) {
  if (loading) return <Spinner />;
  if (notices.length === 0)
    return (
      <Card padded={false}>
        <Empty title="No notices posted yet. The committee's announcements will appear here." />
      </Card>
    );

  return (
    <div className="space-y-3">
      {notices.map((n) => (
        <Card key={n.id} className={n.urgent ? "" : ""} >
          <div className="mb-2 flex items-center justify-between">
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
            <span className="text-[11px]" style={{ color: c.inkMuted }}>
              {formatDate(n.createdAt)}
            </span>
          </div>
          <Heading size="sm">{n.title}</Heading>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: c.ink }}>
            {n.body}
          </p>
        </Card>
      ))}
    </div>
  );
}

function PaymentsTab({
  payments,
  loading,
  onOpen,
}: {
  payments: Payment[];
  loading: boolean;
  onOpen: (p: Payment) => void;
}) {
  const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <Muted>Paid so far</Muted>
        <p className="mt-1 text-2xl font-semibold" style={{ fontFamily: font.mono, color: c.purple }}>
          {formatINR(total)}
        </p>
        <Muted className="mt-1">
          {payments.length} receipt{payments.length === 1 ? "" : "s"} on record
        </Muted>
      </Card>

      <Card padded={false}>
        <div className="border-b px-5 py-3.5" style={{ borderColor: c.line }}>
          <Heading size="sm">Payment history</Heading>
        </div>
        {payments.length === 0 ? (
          <Empty title="Nothing paid yet. Receipts appear here the moment a payment goes through." />
        ) : (
          <ul className="divide-y" style={{ borderColor: c.line }}>
            {payments.map((p) => (
              <li key={p.id}>
                <button onClick={() => onOpen(p)} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.purpose}</span>
                    <span className="block text-[11px]" style={{ color: c.inkMuted, fontFamily: font.mono }}>
                      {formatDate(p.createdAt)} · {p.transactionId}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: c.purple, fontFamily: font.mono }}>
                      {formatINR(p.amount)}
                    </span>
                    <ReceiptIcon size={15} style={{ color: c.inkMuted }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ComplaintsTab({ complaints, loading }: { complaints: Complaint[]; loading: boolean }) {
  const { profile } = useAuth();
  const [category, setCategory] = useState(COMPLAINT_CATEGORIES[0]);
  const [issue, setIssue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!profile || issue.trim().length < 10) {
      setError("Describe the problem in a sentence or two so the committee can act on it.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addDoc(collection(db, "complaints"), {
        uid: profile.uid,
        flat: profile.flat,
        memberName: profile.name,
        category,
        issue: issue.trim(),
        status: "Pending",
        createdAt: Date.now(),
      });
      setIssue("");
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <Heading size="sm">Report an issue</Heading>
        <div className="mt-3 space-y-3">
          <Field label="What is it about?">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {COMPLAINT_CATEGORIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Field label="Describe the problem">
            <TextArea
              rows={3}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="The lift on B wing stops between the 2nd and 3rd floor since Friday."
            />
          </Field>
          {error && <Notice>{error}</Notice>}
          {sent && <Notice tone="ok">Logged with the committee. You'll see the status change here.</Notice>}
          <Btn block loading={busy} onClick={submit}>
            Submit issue
          </Btn>
        </div>
      </Card>

      <Card padded={false}>
        <div className="border-b px-5 py-3.5" style={{ borderColor: c.line }}>
          <Heading size="sm">Your issues</Heading>
        </div>
        {loading ? (
          <Spinner />
        ) : complaints.length === 0 ? (
          <Empty title="Nothing reported yet." />
        ) : (
          <ul className="divide-y" style={{ borderColor: c.line }}>
            {complaints.map((x) => (
              <li key={x.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm">{x.issue}</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: c.inkMuted }}>
                      {x.category} · {formatDate(x.createdAt)}
                    </p>
                  </div>
                  <Stamp
                    label={x.status}
                    tone={x.status === "Resolved" ? "ok" : x.status === "In Progress" ? "neutral" : "warn"}
                  />
                </div>
                {x.adminNote && (
                  <p className="mt-2 rounded px-3 py-2 text-xs" style={{ background: c.paper, color: c.inkMuted }}>
                    Committee: {x.adminNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ChatTab({ messages, loading }: { messages: ChatMessage[]; loading: boolean }) {
  const { profile } = useAuth();
  const [text, setText] = useState("");

  const send = async () => {
    if (!text.trim() || !profile) return;
    const body = text.trim();
    setText("");
    await addDoc(collection(db, "messages"), {
      chatId: profile.uid,
      senderUid: profile.uid,
      senderRole: "member",
      senderName: profile.name,
      text: body,
      readByAdmin: false,
      readByMember: true,
      createdAt: Date.now(),
    });
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 260px)" }}>
      <Card className="flex-1 overflow-y-auto" >
        {loading ? (
          <Spinner />
        ) : messages.length === 0 ? (
          <Empty title="No messages yet. Write to the committee about anything that isn't a formal complaint." />
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const mine = m.senderRole === "member";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[78%] rounded px-3.5 py-2 text-sm"
                    style={
                      mine
                        ? { background: c.purple, color: c.paperLight, borderBottomRightRadius: 2 }
                        : { background: c.paper, border: `1px solid ${c.line}`, borderBottomLeftRadius: 2 }
                    }
                  >
                    <p>{m.text}</p>
                    <p className="mt-1 text-[10px] opacity-70">
                      {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="mt-3 flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message the committee"
          style={{ background: c.paperLight }}
        />
        <Btn onClick={send} aria-label="Send" style={{ padding: "0.7rem" }}>
          <Send size={16} />
        </Btn>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { profile, logout } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return <Spinner />;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateDoc(doc(db, "users", profile.uid), { name: name.trim(), phone: phone.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <Heading size="sm">Your details</Heading>
        <div className="mt-4 space-y-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ fontFamily: font.mono }} />
          </Field>
          <Field label="Email" hint="Contact the secretary to change the email on your account.">
            <Input value={profile.email} disabled style={{ opacity: 0.7 }} />
          </Field>
          <Field label="Flat" hint="Flat numbers are set by the committee from the society register.">
            <Input value={profile.flat} disabled style={{ fontFamily: font.mono, opacity: 0.7 }} />
          </Field>
          {error && <Notice>{error}</Notice>}
          {saved && <Notice tone="ok">Details updated.</Notice>}
          <Btn block loading={busy} onClick={save}>
            Save changes
          </Btn>
        </div>
      </Card>

      <Btn variant="outline" block onClick={() => logout()}>
        <LogOut size={15} /> Sign out
      </Btn>
    </div>
  );
}