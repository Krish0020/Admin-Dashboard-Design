import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import {
  LayoutDashboard, Bell, Search, Megaphone, MessageSquareWarning, Landmark,
  CheckCircle2, AlertTriangle, X, Menu, ShieldCheck, Video, Plus, ArrowRight,
  ScrollText, Building2, Wallet, Clock, Copy, Camera, CameraOff, Phone,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

/**
 * "Command Center" design system — dark glass, glowing green/gold/rose
 * accents, Space Grotesk display + Inter body + IBM Plex Mono for data.
 * Same Firebase logic as before — this is a visual layer swap only.
 *
 * Fonts:
 *   <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
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
  { id: "cctv", label: "CCTV", icon: <Camera size={18} /> },
  { id: "funds", label: "Custom Funds", icon: <ShieldCheck size={18} /> },
];

const ALL_FLATS = ["A-101", "A-102", "A-103", "B-101", "B-102"];

const CAMERAS = [
  { id: "main-gate", name: "Main Gate" },
  { id: "parking", name: "Parking Area" },
  { id: "lobby", name: "Lobby" },
  { id: "back-gate", name: "Back Gate" },
  { id: "terrace", name: "Terrace" },
  { id: "basement", name: "Basement Parking" },
];

const CONTACTS = [
  { role: "Watchman", phone: "+91 90000 11111" },
  { role: "Electrician (VVMC)", phone: "+91 90000 22222" },
  { role: "Water Supply Officer (VVMC)", phone: "+91 90000 33333" },
  { role: "Waste Collection", phone: "+91 90000 44444" },
  { role: "Plumber (on-call)", phone: "+91 90000 55555" },
  { role: "Society Secretary", phone: "+91 98200 00000" },
];

// ── Design tokens ───────────────────────────────────────────────────────
const bg = "#05080A";
const panel = "rgba(255,255,255,0.045)";
const panelHover = "rgba(255,255,255,0.075)";
const border = "rgba(255,255,255,0.09)";
const borderStrong = "rgba(255,255,255,0.18)";
const green = "#34D399";
const gold = "#FBBF24";
const red = "#FB7185";
const text = "#EDF2EF";
const muted = "#8FA097";
const display = "'Space Grotesk', sans-serif";
const mono = "'IBM Plex Mono', monospace";

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ background: bg }}>
      <motion.div
        className="absolute rounded-full"
        style={{ width: 600, height: 600, background: green, filter: "blur(140px)", opacity: 0.16, top: "-10%", left: "-5%" }}
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: 550, height: 550, background: gold, filter: "blur(150px)", opacity: 0.12, bottom: "-15%", right: "-5%" }}
        animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
    </div>
  );
}

function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const [display_, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 1.1, ease: "easeOut", onUpdate: v => setDisplay(v) });
    return () => controls.stop();
  }, [value]);
  return <>{format ? format(display_) : Math.round(display_)}</>;
}

function TiltCard({ children, glow, className = "", style }: { children: React.ReactNode; glow: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -9, y: px * 9 });
  };
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setTilt({ x: 0, y: 0 }); }}
      animate={{ rotateX: tilt.x, rotateY: tilt.y, boxShadow: hovering ? `0 0 46px -10px ${glow}` : "0 0 0px 0px transparent" }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      style={{ transformPerspective: 900, ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StampBadge({ label, tone }: { label: string; tone: "resolved" | "pending" }) {
  const color = tone === "resolved" ? green : red;
  return (
    <motion.span
      whileTap={{ scale: 0.9, rotate: -6 }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase"
      style={{ color, border: `1.5px dashed ${color}`, background: `${color}0F`, fontFamily: mono }}
    >
      {tone === "resolved" ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {label}
    </motion.span>
  );
}

function CameraTile({ name, stream, tick, onClick }: { name: string; stream: MediaStream | null; tick: number; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, [stream]);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="relative rounded-lg overflow-hidden aspect-video text-left"
      style={{ background: "#000", border: `1px solid ${stream ? `${red}55` : border}` }}
    >
      {stream ? (
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ backgroundImage: "repeating-linear-gradient(45deg, #0C0F0D 0px, #0C0F0D 2px, #050706 2px, #050706 9px)" }}>
          <CameraOff size={18} style={{ color: "#3A4540" }} />
          <span className="text-[10px] uppercase tracking-wide" style={{ color: "#3A4540", fontFamily: mono }}>Standby</span>
        </div>
      )}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: "rgba(0,0,0,0.6)", color: stream ? red : muted }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: stream ? red : "#5C6E62", boxShadow: stream ? `0 0 6px ${red}` : "none" }} />
        {stream ? "LIVE" : "OFFLINE"}
      </div>
      <div className="absolute bottom-2 left-2 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.55)", color: text, fontFamily: mono }}>{name}</div>
      {stream && (
        <div className="absolute bottom-2 right-2 text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.55)", color: text, fontFamily: mono }}>
          {new Date(tick).toLocaleTimeString("en-IN")}
        </div>
      )}
    </motion.button>
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

  const [feedStream, setFeedStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [expandedCam, setExpandedCam] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setClockTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => { feedStream?.getTracks().forEach(t => t.stop()); }, [feedStream]);

  useEffect(() => {
    const qNotices = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsubNotices = onSnapshot(qNotices, snapshot => setNotices(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notice))));

    const qComplaints = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const unsubComplaints = onSnapshot(qComplaints, snapshot => setComplaints(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Complaint))));

    const qPayments = query(collection(db, "payments"), orderBy("createdAt", "desc"));
    const unsubPayments = onSnapshot(qPayments, snapshot => setPayments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment))));

    const qFunds = query(collection(db, "custom_funds"), orderBy("createdAt", "desc"));
    const unsubFunds = onSnapshot(qFunds, snapshot => setFunds(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomFund))));

    const unsubMeetings = onSnapshot(collection(db, "meetings"), snapshot => {
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

  const enableFeed = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setFeedStream(stream);
      setCamError(null);
    } catch (e) {
      setCamError("Camera access was denied or isn't available on this device.");
    }
  };

  const disableFeed = () => {
    feedStream?.getTracks().forEach(t => t.stop());
    setFeedStream(null);
    setExpandedCam(null);
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

  const flatStatus = (flat: string): "issue" | "due" | "clear" => {
    const hasOpenComplaint = complaints.some(c => c.flat === flat && c.status === "Pending");
    if (hasOpenComplaint) return "issue";
    const maintenancePaid = payments.some(p => p.flat === flat && p.type !== "Event" && p.monthLabel === currentMonthLabel);
    if (!maintenancePaid) return "due";
    return "clear";
  };
  const statusColor = { issue: red, due: gold, clear: green };
  const statusLabel = { issue: "Open complaint", due: "Maintenance due", clear: "All clear" };
  const wings = Array.from(new Set(ALL_FLATS.map(f => f.split("-")[0]))).sort();
  const filteredComplaints = complaints.filter(c => complaintFilter === "All" || c.status === complaintFilter);

  return (
    <div className="min-h-screen flex relative" style={{ color: text, fontFamily: "'Inter', sans-serif" }}>
      <AnimatedBackground />

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out`}
        style={{ background: "rgba(8,12,10,0.75)", backdropFilter: "blur(24px)", borderRight: `1px solid ${border}` }}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b" style={{ borderColor: border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0" style={{ borderColor: green, color: green, boxShadow: `0 0 16px -2px ${green}66` }}>
              <Landmark size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: muted }}>Command Center</p>
              <h1 className="text-sm font-semibold leading-tight" style={{ color: text, fontFamily: display }}>{SOCIETY_NAME}</h1>
            </div>
          </div>
          <button className="md:hidden" style={{ color: muted }} onClick={() => setIsMobileMenuOpen(false)}><X size={22} /></button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item, i) => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveNav(item.id); setIsMobileMenuOpen(false); }}
                className="relative w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150 text-sm overflow-hidden"
                style={{ color: active ? text : muted, fontWeight: active ? 600 : 500 }}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: `linear-gradient(135deg, ${green}33, ${green}0D)`, border: `1px solid ${green}55`, boxShadow: `0 0 20px -4px ${green}55` }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative text-[10px] w-4 shrink-0" style={{ color: active ? gold : "#4A5A50", fontFamily: mono }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="relative flex items-center gap-3">{item.icon}<span>{item.label}</span></span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t" style={{ borderColor: border }}>
          <p className="text-[11px]" style={{ color: "#4A5A50" }}>Registered society &middot; est. records since onboarding</p>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto relative z-10">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6 px-5 py-3.5 rounded-xl" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden" style={{ color: muted }} onClick={() => setIsMobileMenuOpen(true)}><Menu size={22} /></button>
            <div className="hidden md:block">
              <p className="text-[11px] tracking-wide" style={{ color: muted }}>Registry / {activeNav.replace("-", " ")}</p>
              <h2 className="text-lg font-semibold capitalize" style={{ fontFamily: display }}>{activeNav.replace("-", " ")}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: muted }} />
              <input type="text" placeholder="Search records..." className="pl-9 pr-4 py-2 rounded-lg text-sm w-60 focus:outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${border}`, color: text }} />
            </div>
            <button className="relative p-2 rounded-full" style={{ color: muted }}>
              <Bell size={19} />
              {pendingCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: red, boxShadow: `0 0 8px ${red}` }} />}
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs border-2" style={{ color: green, borderColor: green, fontFamily: mono, boxShadow: `0 0 12px -3px ${green}` }}>AD</div>
          </div>
        </div>

        {/* DASHBOARD */}
        {activeNav === "dashboard" && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl px-8 py-9" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] mb-2" style={{ color: gold }}>
                    {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <h2 className="text-2xl md:text-3xl font-semibold mb-2" style={{ fontFamily: display }}>Today's entry, Admin</h2>
                  <p className="max-w-xl text-sm" style={{ color: muted }}>
                    {pendingCount > 0 ? `${pendingCount} complaint${pendingCount > 1 ? "s" : ""} awaiting resolution. Everything else is up to date.` : "No open complaints — the register is clear."}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: muted }}>Live</p>
                  <p className="text-2xl font-semibold" style={{ fontFamily: mono, color: green, textShadow: `0 0 20px ${green}66` }}>
                    {new Date(clockTick).toLocaleTimeString("en-IN")}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: "Total Flats", value: ALL_FLATS.length, icon: <LayoutDashboard size={20} />, color: green, isCurrency: false },
                { label: "Pending Issues", value: pendingCount, icon: <AlertTriangle size={20} />, color: red, isCurrency: false },
                { label: "Collected (May)", value: totalCollected, icon: <Landmark size={20} />, color: gold, isCurrency: true },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}>
                  <TiltCard glow={`${stat.color}77`} className="p-5 rounded-xl" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}18`, color: stat.color }}>{stat.icon}</div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: muted }}>{stat.label}</p>
                        <h3 className="text-2xl font-semibold" style={{ fontFamily: mono, color: text }}>
                          <CountUp value={stat.value} format={stat.isCurrency ? (v => formatINR(Math.round(v))) : undefined} />
                        </h3>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </div>

            {/* Building Registry */}
            <div className="p-6 rounded-xl" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Building2 size={18} style={{ color: green }} />
                  <h3 className="text-base font-semibold" style={{ fontFamily: display }}>Building Registry</h3>
                </div>
                <div className="flex items-center gap-4 text-[11px]" style={{ color: muted }}>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: green }} />Clear</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: gold }} />Due</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: red }} />Complaint</span>
                </div>
              </div>
              <p className="text-xs mb-5" style={{ color: muted }}>Live status of every registered unit — click a flat for its record.</p>

              <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${wings.length}, minmax(0,1fr))` }}>
                {wings.map(wing => (
                  <div key={wing}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: muted, fontFamily: mono }}>{wing} Wing</p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {ALL_FLATS.filter(f => f.startsWith(wing)).map((flat, i) => {
                        const status = flatStatus(flat);
                        return (
                          <motion.button
                            key={flat}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{
                              opacity: 1, scale: 1,
                              boxShadow: status === "issue" ? [`0 0 0px 0px ${statusColor[status]}00`, `0 0 18px 1px ${statusColor[status]}66`, `0 0 0px 0px ${statusColor[status]}00`] : `0 0 0px 0px transparent`,
                            }}
                            transition={{ opacity: { duration: 0.3, delay: i * 0.05 }, scale: { duration: 0.3, delay: i * 0.05 }, boxShadow: { duration: 1.6, repeat: status === "issue" ? Infinity : 0 } }}
                            whileHover={{ scale: 1.08, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedFlat(flat)}
                            className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1"
                            style={{ background: `${statusColor[status]}14`, border: `1.5px solid ${statusColor[status]}55` }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ background: statusColor[status], boxShadow: `0 0 6px ${statusColor[status]}` }} />
                            <span className="text-[11px] font-semibold" style={{ fontFamily: mono, color: text }}>{flat}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 p-6 rounded-xl" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
                <h3 className="text-base font-semibold mb-5" style={{ fontFamily: display }}>Collections, month by month</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <defs>
                        <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={green} stopOpacity={1} />
                          <stop offset="100%" stopColor={green} stopOpacity={0.35} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: muted, fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: muted, fontSize: 12 }} />
                      <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={{ borderRadius: 8, border: `1px solid ${border}`, fontSize: 12, background: "#0A0F0C", color: text }} />
                      <Bar dataKey="amount" fill="url(#barGlow)" radius={[4, 4, 0, 0]} barSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 rounded-xl" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
                <h3 className="text-base font-semibold mb-5" style={{ fontFamily: display }}>Complaint status</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={complaintStats} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                        <Cell fill={green} />
                        <Cell fill={red} />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${border}`, fontSize: 12, background: "#0A0F0C", color: text }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-5 mt-3 text-xs" style={{ color: muted }}>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: green }} />Resolved</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: red }} />Pending</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
                <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: border }}>
                  <h3 className="text-base font-semibold" style={{ fontFamily: display }}>Recent entries</h3>
                  <button onClick={() => setActiveNav("accounting")} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: green }}>View ledger <ArrowRight size={13} /></button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: muted }}>Flat</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: muted }}>Purpose</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: muted }}>Amount</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: muted }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 4).map((p, idx) => (
                      <tr key={p.id} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                        <td className="px-6 py-3.5 font-medium">{p.flat}</td>
                        <td className="px-6 py-3.5" style={{ color: muted }}>{p.type === "Event" ? p.eventName : "Maintenance"}</td>
                        <td className="px-6 py-3.5 font-semibold" style={{ color: green, fontFamily: mono }}>{formatINR(Number(p.amount))}</td>
                        <td className="px-6 py-3.5" style={{ color: muted }}>{p.date}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center" style={{ color: muted }}>No entries recorded yet</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="p-5 rounded-xl" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
                <h3 className="text-base font-semibold mb-4" style={{ fontFamily: display }}>Quick actions</h3>
                <div className="space-y-2">
                  {[
                    { label: "Post a notice", icon: <Megaphone size={17} />, onClick: () => setShowNoticeModal(true) },
                    { label: "Raise a fund", icon: <Landmark size={17} />, onClick: () => setActiveNav("funds") },
                    { label: "Host a meeting", icon: <Video size={17} />, onClick: () => setActiveNav("meeting") },
                  ].map(action => (
                    <motion.button key={action.label} whileHover={{ x: 3 }} onClick={action.onClick} className="w-full flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${border}` }}>
                      <span className="flex items-center gap-3 text-sm font-medium" style={{ color: text }}><span style={{ color: green }}>{action.icon}</span>{action.label}</span>
                      <Plus size={16} style={{ color: muted }} />
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: display }}>Important contacts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {CONTACTS.map(c => (
                  <a key={c.role} href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex items-center justify-between text-sm py-1">
                    <span style={{ color: text }}>{c.role}</span>
                    <span className="flex items-center gap-1.5 font-medium" style={{ color: green, fontFamily: mono }}><Phone size={13} />{c.phone}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* NOTICE BOARD */}
        {activeNav === "notice" && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="flex justify-between items-center">
              <p className="text-sm" style={{ color: muted }}>{notices.length} notice{notices.length !== 1 ? "s" : ""} on record</p>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowNoticeModal(true)} className="flex items-center gap-2 font-semibold px-4 py-2 rounded-lg text-sm text-black" style={{ background: green }}>
                <Plus size={16} />Post notice
              </motion.button>
            </div>
            <div className="space-y-3">
              {notices.length === 0 && <div className="rounded-xl p-10 text-center" style={{ background: panel, border: `1px solid ${border}`, color: muted }}>No notices posted yet.</div>}
              {notices.map(n => (
                <div key={n.id} className="rounded-xl p-5" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${n.urgent ? `${red}55` : border}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: n.urgent ? `${red}18` : `${green}18`, color: n.urgent ? red : green, fontFamily: mono }}>
                      {n.urgent ? "Urgent" : "Notice"} #{n.number}
                    </span>
                    <span className="text-[11px]" style={{ color: muted }}>{n.time}</span>
                  </div>
                  <h3 className="font-semibold" style={{ fontFamily: display }}>{n.title}</h3>
                  <p className="text-sm mt-1" style={{ color: muted }}>{n.subtitle}</p>
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
                  style={{ background: complaintFilter === f ? green : "transparent", color: complaintFilter === f ? "#000" : muted, border: `1px solid ${complaintFilter === f ? green : border}` }}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
              {filteredComplaints.length === 0 && <div className="p-10 text-center text-sm" style={{ color: muted }}>No complaints in this view.</div>}
              <div className="divide-y" style={{ borderColor: border }}>
                {filteredComplaints.map(c => (
                  <div key={c.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c.flat} <span className="font-normal" style={{ color: muted }}>&middot; {c.date}</span></p>
                      <p className="text-sm mt-0.5" style={{ color: muted }}>{c.issue}</p>
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
                { label: "Total collected", value: totalCollected, icon: <Wallet size={18} />, color: green },
                { label: "From maintenance", value: maintenanceCollections, icon: <Landmark size={18} />, color: gold },
                { label: "From event funds", value: eventCollections, icon: <ScrollText size={18} />, color: red },
              ].map(stat => (
                <div key={stat.label} className="p-5 rounded-xl" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
                  <div className="flex items-center gap-3 mb-1" style={{ color: stat.color }}>{stat.icon}<span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: muted }}>{stat.label}</span></div>
                  <h3 className="text-xl font-semibold" style={{ fontFamily: mono }}><CountUp value={stat.value} format={v => formatINR(Math.round(v))} /></h3>
                </div>
              ))}
            </div>

            <div className="rounded-xl overflow-hidden" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: border }}><h3 className="text-base font-semibold" style={{ fontFamily: display }}>Full ledger</h3></div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: muted }}>Flat</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: muted }}>Purpose</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: muted }}>Method</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: muted }}>Amount</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: muted }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, idx) => (
                    <tr key={p.id} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                      <td className="px-6 py-3.5 font-medium">{p.flat}</td>
                      <td className="px-6 py-3.5" style={{ color: muted }}>{p.type === "Event" ? p.eventName : "Maintenance"}</td>
                      <td className="px-6 py-3.5" style={{ color: muted }}>{p.method}</td>
                      <td className="px-6 py-3.5 font-semibold" style={{ color: green, fontFamily: mono }}>{formatINR(Number(p.amount))}</td>
                      <td className="px-6 py-3.5" style={{ color: muted }}>{p.date}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center" style={{ color: muted }}>No entries recorded yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MEETING */}
        {activeNav === "meeting" && (
          <div className="max-w-4xl mx-auto space-y-5">
            {!activeRoom ? (
              <>
                <div className="rounded-xl p-8 text-center" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
                  <Video size={28} className="mx-auto mb-3" style={{ color: green }} />
                  <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: display }}>Host a society meeting</h3>
                  <p className="text-sm mb-5" style={{ color: muted }}>Opens a live video room — no account or app download needed for members to join.</p>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleStartMeeting} className="font-semibold px-6 py-2.5 rounded-lg text-sm text-black" style={{ background: green }}>Start meeting</motion.button>
                </div>
                {meetings.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
                    <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: border }}>
                      <Clock size={15} style={{ color: muted }} />
                      <h3 className="text-sm font-semibold" style={{ fontFamily: display }}>Past meetings</h3>
                    </div>
                    <div className="divide-y" style={{ borderColor: border }}>
                      {meetings.slice(0, 6).map(m => (
                        <div key={m.id} className="px-6 py-3.5 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium" style={{ fontFamily: mono }}>{m.roomName}</p>
                            <p className="text-[11px]" style={{ color: muted }}>{new Date(m.startedAt).toLocaleString("en-IN")}</p>
                          </div>
                          <button onClick={() => setActiveRoom(m.roomName)} className="text-xs font-semibold hover:underline" style={{ color: green }}>Rejoin</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
                <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: border }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: red, boxShadow: `0 0 8px ${red}` }} />
                    <span className="text-sm font-medium" style={{ fontFamily: mono }}>{activeRoom}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleCopyLink(activeRoom)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ border: `1px solid ${border}`, color: text }}>
                      <Copy size={13} />{copiedLink ? "Copied!" : "Copy link"}
                    </button>
                    <button onClick={() => setActiveRoom(null)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: red, color: "#1A0508" }}>End</button>
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

        {/* CCTV */}
        {activeNav === "cctv" && (
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="rounded-xl p-5 flex flex-wrap items-center justify-between gap-3" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
              <div>
                <h3 className="text-base font-semibold" style={{ fontFamily: display }}>Surveillance Wall</h3>
                <p className="text-xs mt-0.5" style={{ color: muted }}>
                  {feedStream ? `${CAMERAS.length} of ${CAMERAS.length} cameras online` : "Cameras offline — enable the feed to start monitoring"}
                </p>
              </div>
              {!feedStream ? (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={enableFeed} className="font-semibold px-5 py-2.5 rounded-lg text-sm text-black" style={{ background: green }}>Enable live feed</motion.button>
              ) : (
                <button onClick={disableFeed} className="font-semibold px-5 py-2.5 rounded-lg text-sm" style={{ border: `1px solid ${red}`, color: red }}>Disable feed</button>
              )}
            </div>

            {camError && <div className="text-sm px-4 py-3 rounded-lg" style={{ background: `${red}14`, color: red }}>{camError}</div>}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CAMERAS.map(cam => (
                <CameraTile key={cam.id} name={cam.name} stream={feedStream} tick={clockTick} onClick={() => feedStream && setExpandedCam(cam.name)} />
              ))}
            </div>

            <p className="text-[11px]" style={{ color: muted }}>
              Demo note: every tile mirrors this device's camera since no physical CCTV hardware is wired up yet — swap in real RTSP/ONVIF stream URLs per camera once the society installs them.
            </p>
          </div>
        )}

        {/* Expanded camera modal */}
        {expandedCam && feedStream && (
          <div className="fixed inset-0 bg-black/80 z-[65] flex items-center justify-center p-4" onClick={() => setExpandedCam(null)}>
            <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-white font-medium text-sm" style={{ fontFamily: mono }}>{expandedCam}</span>
                <button onClick={() => setExpandedCam(null)} className="text-white/80 hover:text-white"><X size={22} /></button>
              </div>
              <CameraTile name={expandedCam} stream={feedStream} tick={clockTick} onClick={() => {}} />
            </div>
          </div>
        )}

        {/* CUSTOM FUNDS */}
        {activeNav === "funds" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="p-6 rounded-xl flex flex-wrap md:flex-nowrap gap-4 items-end" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: muted }}>Event / fund name</label>
                <input type="text" placeholder="e.g. Ganesh Chaturthi" value={newFund.eventName} onChange={e => setNewFund({ ...newFund, eventName: e.target.value })} className="w-full p-2.5 rounded-lg mt-1.5 focus:outline-none text-sm" style={{ border: `1px solid ${border}`, background: "rgba(255,255,255,0.03)", color: text }} />
              </div>
              <div className="w-full md:w-32">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: muted }}>Amount (₹)</label>
                <input type="number" placeholder="500" value={newFund.amount} onChange={e => setNewFund({ ...newFund, amount: e.target.value })} className="w-full p-2.5 rounded-lg mt-1.5 focus:outline-none text-sm" style={{ border: `1px solid ${border}`, background: "rgba(255,255,255,0.03)", color: text, fontFamily: mono }} />
              </div>
              <div className="w-full md:w-44">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: muted }}>Due date</label>
                <input type="date" value={newFund.dueDate} onChange={e => setNewFund({ ...newFund, dueDate: e.target.value })} className="w-full p-2.5 rounded-lg mt-1.5 focus:outline-none text-sm" style={{ border: `1px solid ${border}`, background: "rgba(255,255,255,0.03)", color: text }} />
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleCreateFund} className="w-full md:w-auto font-semibold px-6 py-2.5 rounded-lg text-black" style={{ background: green }}>Raise fund</motion.button>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ background: panel, backdropFilter: "blur(20px)", border: `1px solid ${border}` }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: border }}><h3 className="text-base font-semibold" style={{ fontFamily: display }}>Active funds</h3></div>
              <div className="divide-y" style={{ borderColor: border }}>
                {funds.map(f => (
                  <div key={f.id} className="px-6 py-4 flex items-center justify-between">
                    <div><p className="font-medium text-sm">{f.eventName}</p><p className="text-xs" style={{ color: muted }}>Due {f.dueDate}</p></div>
                    <p className="font-semibold" style={{ color: green, fontFamily: mono }}>{formatINR(f.amount)}</p>
                  </div>
                ))}
                {funds.length === 0 && <div className="px-6 py-8 text-center text-sm" style={{ color: muted }}>No funds raised yet</div>}
              </div>
            </div>
          </div>
        )}

        {/* Flat detail modal */}
        {selectedFlat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setSelectedFlat(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="rounded-2xl w-full max-w-md p-6" style={{ background: "#0A0F0C", border: `1px solid ${borderStrong}`, boxShadow: `0 0 60px -12px ${statusColor[flatStatus(selectedFlat)]}44` }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: border }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: display }}>Flat {selectedFlat}</h3>
                <button onClick={() => setSelectedFlat(null)} style={{ color: muted }}><X size={20} /></button>
              </div>
              <div className="mb-4">
                <StampBadge label={statusLabel[flatStatus(selectedFlat)]} tone={flatStatus(selectedFlat) === "clear" ? "resolved" : "pending"} />
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
                    <span style={{ fontFamily: mono, color: green }}>{formatINR(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Notice modal */}
        {showNoticeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="rounded-2xl w-full max-w-md p-6" style={{ background: "#0A0F0C", border: `1px solid ${borderStrong}`, boxShadow: `0 0 60px -12px ${green}44` }}
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor: border }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: display }}>Post a new notice</h3>
                <button onClick={() => setShowNoticeModal(false)} style={{ color: muted }}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: muted }}>Title</label>
                  <input type="text" placeholder="e.g. Water supply interruption" value={newNotice.title} onChange={e => setNewNotice({ ...newNotice, title: e.target.value })} className="w-full p-2.5 rounded-lg mt-1.5 text-sm focus:outline-none" style={{ border: `1px solid ${border}`, background: "rgba(255,255,255,0.03)", color: text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: muted }}>Description</label>
                  <textarea placeholder="Write the details here..." value={newNotice.subtitle} onChange={e => setNewNotice({ ...newNotice, subtitle: e.target.value })} className="w-full p-2.5 rounded-lg mt-1.5 text-sm focus:outline-none min-h-[100px]" style={{ border: `1px solid ${border}`, background: "rgba(255,255,255,0.03)", color: text }} />
                </div>
                <label className="flex items-center gap-2.5 p-3 rounded-lg cursor-pointer" style={{ background: `${red}0D`, border: `1px solid ${red}33` }}>
                  <input type="checkbox" checked={newNotice.urgent} onChange={e => setNewNotice({ ...newNotice, urgent: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm font-semibold" style={{ color: red }}>Mark as urgent</span>
                </label>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleCreateNotice} className="w-full font-semibold py-3 rounded-lg mt-2 text-black" style={{ background: green }}>Publish to society</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}