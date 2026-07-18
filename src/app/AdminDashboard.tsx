import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import {
  LayoutDashboard, Bell, Search, Megaphone, MessageSquareWarning, Landmark,
  CheckCircle2, AlertTriangle, X, Menu, ShieldCheck, Video, Plus, ArrowRight,
  ScrollText, Building2, Wallet, Clock, Copy,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

/**
 * "Registrar's ledger" design system — deep ink-green + brass gold,
 * IBM Plex Serif/Sans/Mono, dashed stamp badges. Shared with MemberPortal.tsx.
 *
 * Two things in here you won't find in a typical clone of this project:
 * 1. Building Registry — the dashboard renders the actual society as a
 *    grid of flats colour-coded by real-time status (open complaint /
 *    maintenance due / clear), instead of yet another stats table.
 * 2. Meeting tab is a REAL working video room (embedded Jitsi Meet, no
 *    account or API key needed) with a logged history of past meetings —
 *    not a placeholder button.
 *
 * Fonts: <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
 */
const SOCIETY_NAME = "New Shrushti CHS";

type NavItem = { id: string; label: string; icon: React.ReactNode };
type ComplaintStatus = "Pending" | "Resolved";
type Complaint = { id: string; flat: string; issue: string; status: ComplaintStatus; date: string; createdAt?: number };
type Notice = { id: string; number: string; title: string; subtitle: string; time: string; urgent: boolean; createdAt?: number };
type Payment = {
  id: string; number?: string; member: string; flat: string; amount: number; date: string; method: string;
  createdAt?: number; type?: string; fundId?: string; eventName?: string; monthLabel?: string;
};
type CustomFund = { id: string; eventName: string; amount: number; dueDate: string; createdAt: number };
type MeetingRecord = { id: string; roomName: string; startedAt: number };

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "notice", label: "Notice Board", icon: <Megaphone size={18} /> },
  { id: "complaints", label: "Complaints", icon: <MessageSquareWarning size={18} /> },
  { id: "accounting", label: "Accounting", icon: <ScrollText size={18} /> },
  { id: "meeting", label: "Meeting", icon: <Video size={18} /> },
  { id: "funds", label: "Custom Funds", icon: <ShieldCheck size={18} /> },
];

const ALL_FLATS = ["A-101", "A-102", "A-103", "B-101", "B-102"];
const CHART_COLORS = { resolved: "#2F5233", pending: "#8B3A3A" };

const ink = "#1E2A22", forest = "#2F5233", gold = "#B4872A", maroon = "#8B3A3A", muted = "#8B8168", line = "#DED7C2";
const serif = "'IBM Plex Serif', serif", mono = "'IBM Plex Mono', monospace";

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

function StampBadge({ label, tone }: { label: string; tone: "resolved" | "pending" }) {
  const color = tone === "resolved" ? forest : maroon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase"
      style={{ color, border: `1.5px dashed ${color}`, transform: "rotate(-2deg)", fontFamily: mono }}
    >
      {tone === "resolved" ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {label}
    </span>
  );
}

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [funds, setFunds] = useState<CustomFund[]>([]);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);

  const [newFund, setNewFund] = useState({ eventName: "", amount: "", dueDate: "" });
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: "", subtitle: "", urgent: false });
  const [complaintFilter, setComplaintFilter] = useState<"All" | ComplaintStatus>("All");
  const [selectedFlat, setSelectedFlat] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const qNotices = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsubNotices = onSnapshot(qNotices, (snapshot) => setNotices(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notice))));

    const qComplaints = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const unsubComplaints = onSnapshot(qComplaints, (snapshot) => setComplaints(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Complaint))));

    const qPayments = query(collection(db, "payments"), orderBy("createdAt", "desc"));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => setPayments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment))));

    const qFunds = query(collection(db, "custom_funds"), orderBy("createdAt", "desc"));
    const unsubFunds = onSnapshot(qFunds, (snapshot) => setFunds(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomFund))));

    const unsubMeetings = onSnapshot(collection(db, "meetings"), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MeetingRecord)).sort((a, b) => b.startedAt - a.startedAt);
      setMeetings(list);
    });

    return () => { unsubNotices(); unsubComplaints(); unsubPayments(); unsubFunds(); unsubMeetings(); };
  }, []);

  const handleComplaintStatusChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Pending" ? "Resolved" : "Pending";
    await updateDoc(doc(db, "complaints", id), { status: newStatus });
  };

  const handleCreateFund = async () => {
    if (!newFund.eventName || !newFund.amount || !newFund.dueDate) return alert("Fill all fields");
    await addDoc(collection(db, "custom_funds"), { ...newFund, amount: Number(newFund.amount), createdAt: Date.now() });
    setNewFund({ eventName: "", amount: "", dueDate: "" });
  };

  const handleCreateNotice = async () => {
    if (!newNotice.title || !newNotice.subtitle) return alert("Fill title and subtitle");
    await addDoc(collection(db, "notices"), {
      number: "N" + Math.floor(Math.random() * 1000),
      title: newNotice.title, subtitle: newNotice.subtitle,
      time: new Date().toLocaleDateString("en-IN"), urgent: newNotice.urgent, createdAt: Date.now(),
    });
    setNewNotice({ title: "", subtitle: "", urgent: false });
    setShowNoticeModal(false);
  };

  const handleStartMeeting = async () => {
    const roomName = `NSCHS-${Math.random().toString(36).slice(2, 8)}`;
    await addDoc(collection(db, "meetings"), { roomName, startedAt: Date.now() });
    setActiveRoom(roomName);
  };

  const handleCopyLink = (roomName: string) => {
    navigator.clipboard?.writeText(`https://meet.jit.si/${roomName}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  };

  const complaintStats = [
    { name: "Resolved", value: complaints.filter(c => c.status === "Resolved").length },
    { name: "Pending", value: complaints.filter(c => c.status === "Pending").length },
  ];

  const monthlyData = [
    { name: "Jan", amount: 4000 }, { name: "Feb", amount: 3000 },
    { name: "Mar", amount: 2000 }, { name: "Apr", amount: 2780 },
    { name: "May", amount: payments.reduce((acc, p) => acc + Number(p.amount), 0) },
  ];

  const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const pendingCount = complaints.filter(c => c.status === "Pending").length;
  const currentMonthLabel = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const eventCollections = payments.filter(p => p.type === "Event").reduce((a, p) => a + Number(p.amount), 0);
  const maintenanceCollections = payments.filter(p => p.type !== "Event").reduce((a, p) => a + Number(p.amount), 0);

  // Building Registry — real-time status per flat, grouped by wing
  const flatStatus = (flat: string): "issue" | "due" | "clear" => {
    const hasOpenComplaint = complaints.some(c => c.flat === flat && c.status === "Pending");
    if (hasOpenComplaint) return "issue";
    const maintenancePaid = payments.some(p => p.flat === flat && p.type !== "Event" && p.monthLabel === currentMonthLabel);
    if (!maintenancePaid) return "due";
    return "clear";
  };
  const statusColor = { issue: maroon, due: gold, clear: forest };
  const statusLabel = { issue: "Open complaint", due: "Maintenance due", clear: "All clear" };
  const wings = Array.from(new Set(ALL_FLATS.map(f => f.split("-")[0]))).sort();

  const filteredComplaints = complaints.filter(c => complaintFilter === "All" || c.status === complaintFilter);

  return (
    <div className="min-h-screen flex" style={{ background: "#F7F4EC", fontFamily: "'IBM Plex Sans', sans-serif", color: ink }}>
      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out`}
        style={{ background: ink }}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b" style={{ borderColor: "#33453A" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0" style={{ borderColor: gold, color: gold }}>
              <Landmark size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#8FA396" }}>Registrar's Panel</p>
              <h1 className="text-sm font-semibold leading-tight" style={{ color: "#F7F4EC", fontFamily: serif }}>{SOCIETY_NAME}</h1>
            </div>
          </div>
          <button className="md:hidden" style={{ color: "#8FA396" }} onClick={() => setIsMobileMenuOpen(false)}><X size={22} /></button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item, i) => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveNav(item.id); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150 text-sm"
                style={{ background: active ? forest : "transparent", color: active ? "#F7F4EC" : "#B7C4BB", fontWeight: active ? 600 : 500 }}
              >
                <span className="opacity-90 text-[10px] font-mono w-4 shrink-0" style={{ color: active ? gold : "#5C6E62" }}>{String(i + 1).padStart(2, "0")}</span>
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t" style={{ borderColor: "#33453A" }}>
          <p className="text-[11px]" style={{ color: "#5C6E62" }}>Registered society &middot; est. records since onboarding</p>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6 bg-white px-5 py-3.5 rounded-xl border" style={{ borderColor: line }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden" style={{ color: "#5C6E62" }} onClick={() => setIsMobileMenuOpen(true)}><Menu size={22} /></button>
            <div className="hidden md:block">
              <p className="text-[11px] tracking-wide" style={{ color: "#8B8168" }}>Registry / {activeNav.replace("-", " ")}</p>
              <h2 className="text-lg font-semibold capitalize" style={{ fontFamily: serif }}>{activeNav.replace("-", " ")}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: "#8B8168" }} />
              <input type="text" placeholder="Search records..." className="pl-9 pr-4 py-2 rounded-lg text-sm w-60 focus:outline-none" style={{ background: "#F7F4EC", border: `1px solid ${line}` }} />
            </div>
            <button className="relative p-2 rounded-full transition-colors" style={{ color: "#5C6E62" }}>
              <Bell size={19} />
              {pendingCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full border-2 border-white" style={{ background: maroon }} />}
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs border-2" style={{ color: forest, borderColor: forest, fontFamily: mono }}>AD</div>
          </div>
        </div>

        {/* DASHBOARD */}
        {activeNav === "dashboard" && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div
              className="relative overflow-hidden rounded-2xl px-8 py-9 text-white"
              style={{ background: ink, backgroundImage: "repeating-linear-gradient(180deg, rgba(180,135,42,0.06) 0px, rgba(180,135,42,0.06) 1px, transparent 1px, transparent 34px)" }}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: gold }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" style={{ fontFamily: serif }}>Today's entry, Admin</h2>
              <p className="max-w-xl text-sm" style={{ color: "#B7C4BB" }}>
                {pendingCount > 0 ? `${pendingCount} complaint${pendingCount > 1 ? "s" : ""} awaiting resolution. Everything else is up to date.` : "No open complaints — the register is clear."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: "Total Flats", value: ALL_FLATS.length, icon: <LayoutDashboard size={20} />, color: forest },
                { label: "Pending Issues", value: pendingCount, icon: <AlertTriangle size={20} />, color: maroon },
                { label: "Collected (May)", value: formatINR(totalCollected), icon: <Landmark size={20} />, color: gold },
              ].map(stat => (
                <div key={stat.label} className="bg-white p-5 rounded-xl border transition-shadow hover:shadow-md" style={{ borderColor: line }}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}14`, color: stat.color }}>{stat.icon}</div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#8B8168" }}>{stat.label}</p>
                      <h3 className="text-2xl font-semibold" style={{ fontFamily: mono }}>{stat.value}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Building Registry — flagship visual */}
            <div className="bg-white p-6 rounded-xl border" style={{ borderColor: line }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Building2 size={18} style={{ color: forest }} />
                  <h3 className="text-base font-semibold" style={{ fontFamily: serif }}>Building registry</h3>
                </div>
                <div className="flex items-center gap-4 text-[11px]" style={{ color: muted }}>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: forest }} />Clear</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: gold }} />Due</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: maroon }} />Complaint</span>
                </div>
              </div>
              <p className="text-xs mb-5" style={{ color: muted }}>Live status of every registered unit — click a flat for its record.</p>

              <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${wings.length}, minmax(0,1fr))` }}>
                {wings.map(wing => (
                  <div key={wing}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: muted, fontFamily: mono }}>{wing} Wing</p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {ALL_FLATS.filter(f => f.startsWith(wing)).map(flat => {
                        const status = flatStatus(flat);
                        return (
                          <button
                            key={flat}
                            onClick={() => setSelectedFlat(flat)}
                            className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105"
                            style={{ background: `${statusColor[status]}12`, border: `1.5px solid ${statusColor[status]}55` }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ background: statusColor[status] }} />
                            <span className="text-[11px] font-semibold" style={{ fontFamily: mono, color: ink }}>{flat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl border" style={{ borderColor: line }}>
                <h3 className="text-base font-semibold mb-5" style={{ fontFamily: serif }}>Collections, month by month</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEAD8" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8B8168", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8B8168", fontSize: 12 }} />
                      <Tooltip cursor={{ fill: "#F7F4EC" }} contentStyle={{ borderRadius: 8, border: `1px solid ${line}`, fontSize: 12 }} />
                      <Bar dataKey="amount" fill={forest} radius={[4, 4, 0, 0]} barSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border" style={{ borderColor: line }}>
                <h3 className="text-base font-semibold mb-5" style={{ fontFamily: serif }}>Complaint status</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={complaintStats} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                        <Cell fill={CHART_COLORS.resolved} />
                        <Cell fill={CHART_COLORS.pending} />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${line}`, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-5 mt-3 text-xs" style={{ color: "#5C6E62" }}>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS.resolved }} />Resolved</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS.pending }} />Pending</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-xl border overflow-hidden" style={{ borderColor: line }}>
                <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: line }}>
                  <h3 className="text-base font-semibold" style={{ fontFamily: serif }}>Recent entries</h3>
                  <button onClick={() => setActiveNav("accounting")} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: forest }}>View ledger <ArrowRight size={13} /></button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr style={{ background: "#F7F4EC" }}>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B8168" }}>Flat</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B8168" }}>Purpose</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B8168" }}>Amount</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B8168" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 4).map((p, idx) => (
                      <tr key={p.id} style={{ background: idx % 2 === 0 ? "transparent" : "#FBFAF4" }}>
                        <td className="px-6 py-3.5 font-medium">{p.flat}</td>
                        <td className="px-6 py-3.5" style={{ color: "#5C6E62" }}>{p.type === "Event" ? p.eventName : "Maintenance"}</td>
                        <td className="px-6 py-3.5 font-semibold" style={{ color: forest, fontFamily: mono }}>{formatINR(Number(p.amount))}</td>
                        <td className="px-6 py-3.5" style={{ color: "#8B8168" }}>{p.date}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center" style={{ color: "#8B8168" }}>No entries recorded yet</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="bg-white p-5 rounded-xl border" style={{ borderColor: line }}>
                <h3 className="text-base font-semibold mb-4" style={{ fontFamily: serif }}>Quick actions</h3>
                <div className="space-y-2">
                  {[
                    { label: "Post a notice", icon: <Megaphone size={17} />, onClick: () => setShowNoticeModal(true) },
                    { label: "Raise a fund", icon: <Landmark size={17} />, onClick: () => setActiveNav("funds") },
                    { label: "Host a meeting", icon: <Video size={17} />, onClick: () => setActiveNav("meeting") },
                  ].map(action => (
                    <button key={action.label} onClick={action.onClick} className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors group" style={{ background: "#F7F4EC", border: "1px solid #EFEAD8" }}>
                      <span className="flex items-center gap-3 text-sm font-medium" style={{ color: ink }}><span style={{ color: forest }}>{action.icon}</span>{action.label}</span>
                      <Plus size={16} style={{ color: "#8B8168" }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NOTICE BOARD */}
        {activeNav === "notice" && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="flex justify-between items-center">
              <p className="text-sm" style={{ color: muted }}>{notices.length} notice{notices.length !== 1 ? "s" : ""} on record</p>
              <button onClick={() => setShowNoticeModal(true)} className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:opacity-90" style={{ background: forest }}>
                <Plus size={16} />Post notice
              </button>
            </div>
            <div className="space-y-3">
              {notices.length === 0 && (
                <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: line, color: muted }}>No notices posted yet.</div>
              )}
              {notices.map(n => (
                <div key={n.id} className="bg-white rounded-xl p-5 border" style={{ borderColor: n.urgent ? "#8B3A3A55" : line }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: n.urgent ? "#8B3A3A14" : "#2F523314", color: n.urgent ? maroon : forest, fontFamily: mono }}>
                      {n.urgent ? "Urgent" : "Notice"} #{n.number}
                    </span>
                    <span className="text-[11px]" style={{ color: muted }}>{n.time}</span>
                  </div>
                  <h3 className="font-semibold" style={{ fontFamily: serif }}>{n.title}</h3>
                  <p className="text-sm mt-1" style={{ color: "#4A5850" }}>{n.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPLAINTS */}
        {activeNav === "complaints" && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="flex gap-2">
              {(["All", "Pending", "Resolved"] as const).map(f => (
                <button
                  key={f} onClick={() => setComplaintFilter(f)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: complaintFilter === f ? ink : "transparent",
                    color: complaintFilter === f ? "#F7F4EC" : muted,
                    border: `1px solid ${complaintFilter === f ? ink : line}`,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: line }}>
              {filteredComplaints.length === 0 && <div className="p-10 text-center text-sm" style={{ color: muted }}>No complaints in this view.</div>}
              <div className="divide-y" style={{ borderColor: "#F1EDDD" }}>
                {filteredComplaints.map(c => (
                  <div key={c.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c.flat} <span className="font-normal" style={{ color: muted }}>&middot; {c.date}</span></p>
                      <p className="text-sm mt-0.5" style={{ color: "#4A5850" }}>{c.issue}</p>
                    </div>
                    <button onClick={() => handleComplaintStatusChange(c.id, c.status)} className="shrink-0">
                      <StampBadge label={c.status} tone={c.status === "Resolved" ? "resolved" : "pending"} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNTING */}
        {activeNav === "accounting" && (
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: "Total collected", value: formatINR(totalCollected), icon: <Wallet size={18} />, color: forest },
                { label: "From maintenance", value: formatINR(maintenanceCollections), icon: <Landmark size={18} />, color: gold },
                { label: "From event funds", value: formatINR(eventCollections), icon: <ScrollText size={18} />, color: maroon },
              ].map(stat => (
                <div key={stat.label} className="bg-white p-5 rounded-xl border" style={{ borderColor: line }}>
                  <div className="flex items-center gap-3 mb-1" style={{ color: stat.color }}>{stat.icon}<span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: muted }}>{stat.label}</span></div>
                  <h3 className="text-xl font-semibold" style={{ fontFamily: mono }}>{stat.value}</h3>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: line }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: line }}><h3 className="text-base font-semibold" style={{ fontFamily: serif }}>Full ledger</h3></div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ background: "#F7F4EC" }}>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B8168" }}>Flat</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B8168" }}>Purpose</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B8168" }}>Method</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B8168" }}>Amount</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8B8168" }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, idx) => (
                    <tr key={p.id} style={{ background: idx % 2 === 0 ? "transparent" : "#FBFAF4" }}>
                      <td className="px-6 py-3.5 font-medium">{p.flat}</td>
                      <td className="px-6 py-3.5" style={{ color: "#5C6E62" }}>{p.type === "Event" ? p.eventName : "Maintenance"}</td>
                      <td className="px-6 py-3.5" style={{ color: "#8B8168" }}>{p.method}</td>
                      <td className="px-6 py-3.5 font-semibold" style={{ color: forest, fontFamily: mono }}>{formatINR(Number(p.amount))}</td>
                      <td className="px-6 py-3.5" style={{ color: "#8B8168" }}>{p.date}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center" style={{ color: "#8B8168" }}>No entries recorded yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MEETING — real embedded video room */}
        {activeNav === "meeting" && (
          <div className="max-w-4xl mx-auto space-y-5">
            {!activeRoom ? (
              <>
                <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: line }}>
                  <Video size={28} className="mx-auto mb-3" style={{ color: forest }} />
                  <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: serif }}>Host a society meeting</h3>
                  <p className="text-sm mb-5" style={{ color: muted }}>Opens a live video room — no account or app download needed for members to join.</p>
                  <button onClick={handleStartMeeting} className="text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:opacity-90" style={{ background: forest }}>Start meeting</button>
                </div>
                {meetings.length > 0 && (
                  <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: line }}>
                    <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: line }}>
                      <Clock size={15} style={{ color: muted }} />
                      <h3 className="text-sm font-semibold" style={{ fontFamily: serif }}>Past meetings</h3>
                    </div>
                    <div className="divide-y" style={{ borderColor: "#F1EDDD" }}>
                      {meetings.slice(0, 6).map(m => (
                        <div key={m.id} className="px-6 py-3.5 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium" style={{ fontFamily: mono }}>{m.roomName}</p>
                            <p className="text-[11px]" style={{ color: muted }}>{new Date(m.startedAt).toLocaleString("en-IN")}</p>
                          </div>
                          <button onClick={() => setActiveRoom(m.roomName)} className="text-xs font-semibold hover:underline" style={{ color: forest }}>Rejoin</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: line }}>
                <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: line }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: maroon }} />
                    <span className="text-sm font-medium" style={{ fontFamily: mono }}>{activeRoom}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleCopyLink(activeRoom)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ border: `1px solid ${line}`, color: ink }}>
                      <Copy size={13} />{copiedLink ? "Copied!" : "Copy link"}
                    </button>
                    <button onClick={() => setActiveRoom(null)} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: maroon }}>End</button>
                  </div>
                </div>
                <iframe
                  title="Society meeting"
                  src={`https://meet.jit.si/${activeRoom}#config.prejoinPageEnabled=false`}
                  allow="camera; microphone; fullscreen; display-capture"
                  style={{ width: "100%", height: "70vh", border: 0 }}
                />
              </div>
            )}
          </div>
        )}

        {/* CUSTOM FUNDS */}
        {activeNav === "funds" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl border flex flex-wrap md:flex-nowrap gap-4 items-end" style={{ borderColor: line }}>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B8168" }}>Event / fund name</label>
                <input type="text" placeholder="e.g. Ganesh Chaturthi" value={newFund.eventName} onChange={e => setNewFund({ ...newFund, eventName: e.target.value })} className="w-full p-2.5 rounded-lg mt-1.5 focus:outline-none text-sm" style={{ border: `1px solid ${line}` }} />
              </div>
              <div className="w-full md:w-32">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B8168" }}>Amount (₹)</label>
                <input type="number" placeholder="500" value={newFund.amount} onChange={e => setNewFund({ ...newFund, amount: e.target.value })} className="w-full p-2.5 rounded-lg mt-1.5 focus:outline-none text-sm" style={{ border: `1px solid ${line}`, fontFamily: mono }} />
              </div>
              <div className="w-full md:w-44">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B8168" }}>Due date</label>
                <input type="date" value={newFund.dueDate} onChange={e => setNewFund({ ...newFund, dueDate: e.target.value })} className="w-full p-2.5 rounded-lg mt-1.5 focus:outline-none text-sm" style={{ border: `1px solid ${line}` }} />
              </div>
              <button onClick={handleCreateFund} className="w-full md:w-auto text-white font-semibold px-6 py-2.5 rounded-lg transition-opacity hover:opacity-90" style={{ background: forest }}>Raise fund</button>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: line }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: line }}><h3 className="text-base font-semibold" style={{ fontFamily: serif }}>Active funds</h3></div>
              <div className="divide-y" style={{ borderColor: "#F1EDDD" }}>
                {funds.map(f => (
                  <div key={f.id} className="px-6 py-4 flex items-center justify-between">
                    <div><p className="font-medium text-sm">{f.eventName}</p><p className="text-xs" style={{ color: "#8B8168" }}>Due {f.dueDate}</p></div>
                    <p className="font-semibold" style={{ color: forest, fontFamily: mono }}>{formatINR(f.amount)}</p>
                  </div>
                ))}
                {funds.length === 0 && <div className="px-6 py-8 text-center text-sm" style={{ color: "#8B8168" }}>No funds raised yet</div>}
              </div>
            </div>
          </div>
        )}

        {/* Flat detail modal (Building Registry) */}
        {selectedFlat && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setSelectedFlat(null)}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: line }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: serif }}>Flat {selectedFlat}</h3>
                <button onClick={() => setSelectedFlat(null)} style={{ color: muted }}><X size={20} /></button>
              </div>
              <div className="mb-4">
                <StampBadge
                  label={statusLabel[flatStatus(selectedFlat)]}
                  tone={flatStatus(selectedFlat) === "clear" ? "resolved" : "pending"}
                />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: muted }}>Complaints</p>
              <div className="space-y-2 mb-4">
                {complaints.filter(c => c.flat === selectedFlat).length === 0 && <p className="text-sm" style={{ color: muted }}>None on record.</p>}
                {complaints.filter(c => c.flat === selectedFlat).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-3">{c.issue}</span>
                    <StampBadge label={c.status} tone={c.status === "Resolved" ? "resolved" : "pending"} />
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: muted }}>Payments this cycle</p>
              <div className="space-y-1.5">
                {payments.filter(p => p.flat === selectedFlat).length === 0 && <p className="text-sm" style={{ color: muted }}>No payments recorded.</p>}
                {payments.filter(p => p.flat === selectedFlat).slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.type === "Event" ? p.eventName : "Maintenance"}</span>
                    <span style={{ fontFamily: mono, color: forest }}>{formatINR(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notice modal */}
        {showNoticeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor: line }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: serif }}>Post a new notice</h3>
                <button onClick={() => setShowNoticeModal(false)} style={{ color: muted }}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B8168" }}>Title</label>
                  <input type="text" placeholder="e.g. Water supply interruption" value={newNotice.title} onChange={e => setNewNotice({ ...newNotice, title: e.target.value })} className="w-full p-2.5 rounded-lg mt-1.5 text-sm focus:outline-none" style={{ border: `1px solid ${line}`, background: "#F7F4EC" }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B8168" }}>Description</label>
                  <textarea placeholder="Write the details here..." value={newNotice.subtitle} onChange={e => setNewNotice({ ...newNotice, subtitle: e.target.value })} className="w-full p-2.5 rounded-lg mt-1.5 text-sm focus:outline-none min-h-[100px]" style={{ border: `1px solid ${line}`, background: "#F7F4EC" }} />
                </div>
                <label className="flex items-center gap-2.5 p-3 rounded-lg cursor-pointer" style={{ background: "#8B3A3A0D", border: "1px solid #8B3A3A33" }}>
                  <input type="checkbox" checked={newNotice.urgent} onChange={e => setNewNotice({ ...newNotice, urgent: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm font-semibold" style={{ color: maroon }}>Mark as urgent</span>
                </label>
                <button onClick={handleCreateNotice} className="w-full text-white font-semibold py-3 rounded-lg mt-2 transition-opacity hover:opacity-90" style={{ background: forest }}>Publish to society</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}