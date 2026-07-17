import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import {
  LayoutDashboard, Bell, Search, Megaphone, MessageSquareWarning, Landmark,
  CheckCircle2, AlertTriangle, X, Menu, ShieldCheck, Video, Plus, ArrowRight, ScrollText
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

/**
 * ── Design tokens ────────────────────────────────────────────────────────
 * "Registrar's ledger" direction: this is a record-keeping tool for a
 * housing society — closer in spirit to a registry book and notice board
 * than a generic SaaS product. Deep ink-green + brass instead of the usual
 * blue-and-white dashboard; monospace for figures and reference numbers
 * (like a ledger column); a stamp motif for resolved/verified states.
 *
 * Add these to your index.html <head> (or import via @font-face):
 *   <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
 */
const SOCIETY_NAME = "New Shrushti CHS";

type NavItem = { id: string; label: string; icon: React.ReactNode };
type ComplaintStatus = "Pending" | "Resolved";
type Complaint = { id: string; flat: string; issue: string; status: ComplaintStatus; date: string; createdAt?: number };
type Notice = { id: string; number: string; title: string; subtitle: string; time: string; urgent: boolean; createdAt?: number };
type Payment = { id: string; number: string; member: string; flat: string; amount: number; date: string; method: string; createdAt?: number; type?: string; fundId?: string; eventName?: string };
type CustomFund = { id: string; eventName: string; amount: number; dueDate: string; createdAt: number };

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

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

/** Small reusable "stamp" badge — the page's one signature element. */
function StampBadge({ label, tone }: { label: string; tone: "resolved" | "pending" }) {
  const color = tone === "resolved" ? "#2F5233" : "#8B3A3A";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase"
      style={{
        color,
        border: `1.5px dashed ${color}`,
        transform: "rotate(-2deg)",
        fontFamily: "'IBM Plex Mono', monospace",
      }}
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
  const [newFund, setNewFund] = useState({ eventName: "", amount: "", dueDate: "" });
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: "", subtitle: "", urgent: false });

  useEffect(() => {
    const qNotices = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsubNotices = onSnapshot(qNotices, (snapshot) => setNotices(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notice))));

    const qComplaints = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const unsubComplaints = onSnapshot(qComplaints, (snapshot) => setComplaints(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Complaint))));

    const qPayments = query(collection(db, "payments"), orderBy("createdAt", "desc"));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => setPayments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment))));

    const qFunds = query(collection(db, "custom_funds"), orderBy("createdAt", "desc"));
    const unsubFunds = onSnapshot(qFunds, (snapshot) => setFunds(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomFund))));

    return () => { unsubNotices(); unsubComplaints(); unsubPayments(); unsubFunds(); };
  }, []);

  const handleComplaintStatusChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Pending" ? "Resolved" : "Pending";
    await updateDoc(doc(db, "complaints", id), { status: newStatus });
  };

  const handleCreateFund = async () => {
    if (!newFund.eventName || !newFund.amount || !newFund.dueDate) return alert("Fill all fields");
    await addDoc(collection(db, "custom_funds"), { ...newFund, amount: Number(newFund.amount), createdAt: Date.now() });
    setNewFund({ eventName: "", amount: "", dueDate: "" });
    alert("Fund published to the notice board.");
  };

  const handleCreateNotice = async () => {
    if (!newNotice.title || !newNotice.subtitle) return alert("Fill title and subtitle");
    await addDoc(collection(db, "notices"), {
      number: "N" + Math.floor(Math.random() * 1000),
      title: newNotice.title,
      subtitle: newNotice.subtitle,
      time: new Date().toLocaleDateString("en-IN"),
      urgent: newNotice.urgent,
      createdAt: Date.now(),
    });
    setNewNotice({ title: "", subtitle: "", urgent: false });
    setShowNoticeModal(false);
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

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#F7F4EC", fontFamily: "'IBM Plex Sans', sans-serif", color: "#1E2A22" }}
    >
      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out`}
        style={{ background: "#1E2A22" }}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b" style={{ borderColor: "#33453A" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0"
              style={{ borderColor: "#B4872A", color: "#B4872A" }}
            >
              <Landmark size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#8FA396" }}>Registrar's Panel</p>
              <h1 className="text-sm font-semibold leading-tight" style={{ color: "#F7F4EC", fontFamily: "'IBM Plex Serif', serif" }}>
                {SOCIETY_NAME}
              </h1>
            </div>
          </div>
          <button className="md:hidden" style={{ color: "#8FA396" }} onClick={() => setIsMobileMenuOpen(false)}>
            <X size={22} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item, i) => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveNav(item.id); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150 text-sm"
                style={{
                  background: active ? "#2F5233" : "transparent",
                  color: active ? "#F7F4EC" : "#B7C4BB",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <span className="opacity-90 text-[10px] font-mono w-4 shrink-0" style={{ color: active ? "#B4872A" : "#5C6E62" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
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
        <div
          className="flex items-center justify-between mb-6 bg-white px-5 py-3.5 rounded-xl border"
          style={{ borderColor: "#DED7C2" }}
        >
          <div className="flex items-center gap-3">
            <button className="md:hidden" style={{ color: "#5C6E62" }} onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={22} />
            </button>
            <div className="hidden md:block">
              <p className="text-[11px] tracking-wide" style={{ color: "#8B8168" }}>Registry / {activeNav.replace("-", " ")}</p>
              <h2 className="text-lg font-semibold capitalize" style={{ fontFamily: "'IBM Plex Serif', serif" }}>
                {activeNav.replace("-", " ")}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: "#8B8168" }} />
              <input
                type="text"
                placeholder="Search records..."
                className="pl-9 pr-4 py-2 rounded-lg text-sm w-60 focus:outline-none"
                style={{ background: "#F7F4EC", border: "1px solid #DED7C2" }}
              />
            </div>
            <button className="relative p-2 rounded-full transition-colors" style={{ color: "#5C6E62" }}>
              <Bell size={19} />
              {(pendingCount > 0) && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full border-2 border-white"
                  style={{ background: "#8B3A3A" }}
                />
              )}
            </button>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs border-2"
              style={{ color: "#2F5233", borderColor: "#2F5233", fontFamily: "'IBM Plex Mono', monospace" }}
            >
              AD
            </div>
          </div>
        </div>

        {/* DASHBOARD */}
        {activeNav === "dashboard" && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Hero / welcome ledger card */}
            <div
              className="relative overflow-hidden rounded-2xl px-8 py-9 text-white"
              style={{
                background: "#1E2A22",
                backgroundImage:
                  "repeating-linear-gradient(180deg, rgba(180,135,42,0.06) 0px, rgba(180,135,42,0.06) 1px, transparent 1px, transparent 34px)",
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: "#B4872A" }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" style={{ fontFamily: "'IBM Plex Serif', serif" }}>
                Today's entry, Admin
              </h2>
              <p className="max-w-xl text-sm" style={{ color: "#B7C4BB" }}>
                {pendingCount > 0
                  ? `${pendingCount} complaint${pendingCount > 1 ? "s" : ""} awaiting resolution. Everything else is up to date.`
                  : "No open complaints — the register is clear."}
              </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: "Total Flats", value: ALL_FLATS.length, icon: <LayoutDashboard size={20} />, color: "#2F5233" },
                { label: "Pending Issues", value: pendingCount, icon: <AlertTriangle size={20} />, color: "#8B3A3A" },
                { label: "Collected (May)", value: formatINR(totalCollected), icon: <Landmark size={20} />, color: "#B4872A" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white p-5 rounded-xl border transition-shadow hover:shadow-md"
                  style={{ borderColor: "#DED7C2" }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${stat.color}14`, color: stat.color }}
                    >
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#8B8168" }}>{stat.label}</p>
                      <h3 className="text-2xl font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{stat.value}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl border" style={{ borderColor: "#DED7C2" }}>
                <h3 className="text-base font-semibold mb-5" style={{ fontFamily: "'IBM Plex Serif', serif" }}>Collections, month by month</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEAD8" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8B8168", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8B8168", fontSize: 12 }} />
                      <Tooltip cursor={{ fill: "#F7F4EC" }} contentStyle={{ borderRadius: 8, border: "1px solid #DED7C2", fontSize: 12 }} />
                      <Bar dataKey="amount" fill="#2F5233" radius={[4, 4, 0, 0]} barSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border" style={{ borderColor: "#DED7C2" }}>
                <h3 className="text-base font-semibold mb-5" style={{ fontFamily: "'IBM Plex Serif', serif" }}>Complaint status</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={complaintStats} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                        <Cell fill={CHART_COLORS.resolved} />
                        <Cell fill={CHART_COLORS.pending} />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DED7C2", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-5 mt-3 text-xs" style={{ color: "#5C6E62" }}>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS.resolved }} />Resolved</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS.pending }} />Pending</span>
                </div>
              </div>
            </div>

            {/* Ledger + quick actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#DED7C2" }}>
                <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: "#DED7C2" }}>
                  <h3 className="text-base font-semibold" style={{ fontFamily: "'IBM Plex Serif', serif" }}>Recent entries</h3>
                  <button
                    onClick={() => setActiveNav("accounting")}
                    className="text-xs font-medium flex items-center gap-1 hover:underline"
                    style={{ color: "#2F5233" }}
                  >
                    View ledger <ArrowRight size={13} />
                  </button>
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
                        <td className="px-6 py-3.5 font-semibold" style={{ color: "#2F5233", fontFamily: "'IBM Plex Mono', monospace" }}>{formatINR(Number(p.amount))}</td>
                        <td className="px-6 py-3.5" style={{ color: "#8B8168" }}>{p.date}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-8 text-center" style={{ color: "#8B8168" }}>No entries recorded yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-white p-5 rounded-xl border" style={{ borderColor: "#DED7C2" }}>
                <h3 className="text-base font-semibold mb-4" style={{ fontFamily: "'IBM Plex Serif', serif" }}>Quick actions</h3>
                <div className="space-y-2">
                  {[
                    { label: "Post a notice", icon: <Megaphone size={17} />, onClick: () => setShowNoticeModal(true) },
                    { label: "Raise a fund", icon: <Landmark size={17} />, onClick: () => setActiveNav("funds") },
                    { label: "Host a meeting", icon: <Video size={17} />, onClick: () => setActiveNav("meeting") },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors group"
                      style={{ background: "#F7F4EC", border: "1px solid #EFEAD8" }}
                    >
                      <span className="flex items-center gap-3 text-sm font-medium" style={{ color: "#1E2A22" }}>
                        <span style={{ color: "#2F5233" }}>{action.icon}</span>
                        {action.label}
                      </span>
                      <Plus size={16} style={{ color: "#8B8168" }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Complaint stamps preview, if any */}
            {complaints.length > 0 && (
              <div className="bg-white p-5 rounded-xl border" style={{ borderColor: "#DED7C2" }}>
                <h3 className="text-base font-semibold mb-4" style={{ fontFamily: "'IBM Plex Serif', serif" }}>Complaint register</h3>
                <div className="space-y-2">
                  {complaints.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#F1EDDD" }}>
                      <div className="text-sm">
                        <span className="font-medium">{c.flat}</span>
                        <span style={{ color: "#8B8168" }}> &middot; {c.issue}</span>
                      </div>
                      <button onClick={() => handleComplaintStatusChange(c.id, c.status)}>
                        <StampBadge label={c.status} tone={c.status === "Resolved" ? "resolved" : "pending"} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CUSTOM FUNDS */}
        {activeNav === "funds" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl border flex flex-wrap md:flex-nowrap gap-4 items-end" style={{ borderColor: "#DED7C2" }}>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B8168" }}>Event / fund name</label>
                <input
                  type="text" placeholder="e.g. Ganesh Chaturthi"
                  value={newFund.eventName} onChange={e => setNewFund({ ...newFund, eventName: e.target.value })}
                  className="w-full p-2.5 rounded-lg mt-1.5 focus:outline-none text-sm"
                  style={{ border: "1px solid #DED7C2" }}
                />
              </div>
              <div className="w-full md:w-32">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B8168" }}>Amount (₹)</label>
                <input
                  type="number" placeholder="500"
                  value={newFund.amount} onChange={e => setNewFund({ ...newFund, amount: e.target.value })}
                  className="w-full p-2.5 rounded-lg mt-1.5 focus:outline-none text-sm"
                  style={{ border: "1px solid #DED7C2", fontFamily: "'IBM Plex Mono', monospace" }}
                />
              </div>
              <div className="w-full md:w-44">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B8168" }}>Due date</label>
                <input
                  type="date" value={newFund.dueDate} onChange={e => setNewFund({ ...newFund, dueDate: e.target.value })}
                  className="w-full p-2.5 rounded-lg mt-1.5 focus:outline-none text-sm"
                  style={{ border: "1px solid #DED7C2" }}
                />
              </div>
              <button
                onClick={handleCreateFund}
                className="w-full md:w-auto text-white font-semibold px-6 py-2.5 rounded-lg transition-opacity hover:opacity-90"
                style={{ background: "#2F5233" }}
              >
                Raise fund
              </button>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#DED7C2" }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: "#DED7C2" }}>
                <h3 className="text-base font-semibold" style={{ fontFamily: "'IBM Plex Serif', serif" }}>Active funds</h3>
              </div>
              <div className="divide-y" style={{ borderColor: "#F1EDDD" }}>
                {funds.map(f => (
                  <div key={f.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{f.eventName}</p>
                      <p className="text-xs" style={{ color: "#8B8168" }}>Due {f.dueDate}</p>
                    </div>
                    <p className="font-semibold" style={{ color: "#2F5233", fontFamily: "'IBM Plex Mono', monospace" }}>{formatINR(f.amount)}</p>
                  </div>
                ))}
                {funds.length === 0 && (
                  <div className="px-6 py-8 text-center text-sm" style={{ color: "#8B8168" }}>No funds raised yet</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NOTICE MODAL */}
        {showNoticeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor: "#DED7C2" }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Serif', serif" }}>Post a new notice</h3>
                <button onClick={() => setShowNoticeModal(false)} style={{ color: "#8B8168" }}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B8168" }}>Title</label>
                  <input
                    type="text" placeholder="e.g. Water supply interruption"
                    value={newNotice.title} onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                    className="w-full p-2.5 rounded-lg mt-1.5 text-sm focus:outline-none"
                    style={{ border: "1px solid #DED7C2", background: "#F7F4EC" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B8168" }}>Description</label>
                  <textarea
                    placeholder="Write the details here..."
                    value={newNotice.subtitle} onChange={e => setNewNotice({ ...newNotice, subtitle: e.target.value })}
                    className="w-full p-2.5 rounded-lg mt-1.5 text-sm focus:outline-none min-h-[100px]"
                    style={{ border: "1px solid #DED7C2", background: "#F7F4EC" }}
                  />
                </div>
                <label
                  className="flex items-center gap-2.5 p-3 rounded-lg cursor-pointer"
                  style={{ background: "#8B3A3A0D", border: "1px solid #8B3A3A33" }}
                >
                  <input
                    type="checkbox" checked={newNotice.urgent}
                    onChange={e => setNewNotice({ ...newNotice, urgent: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-semibold" style={{ color: "#8B3A3A" }}>Mark as urgent</span>
                </label>
                <button
                  onClick={handleCreateNotice}
                  className="w-full text-white font-semibold py-3 rounded-lg mt-2 transition-opacity hover:opacity-90"
                  style={{ background: "#2F5233" }}
                >
                  Publish to society
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
