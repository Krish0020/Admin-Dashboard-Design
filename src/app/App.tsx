import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import {
  LayoutDashboard, Bell, Search, Megaphone, MessageSquareWarning, Wallet, Settings,
  ChevronRight, Plus, CheckCircle2, Clock, IndianRupee, Users, AlertTriangle, X, Menu, Circle, BadgeCheck, Video
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
type NavItem = { id: string; label: string; icon: React.ReactNode };
type ComplaintStatus = "Pending" | "Resolved";
type Complaint = { id: string; flat: string; issue: string; status: ComplaintStatus; date: string; createdAt?: number };
type Notice = { id: string | number; title: string; subtitle: string; time: string; urgent: boolean; createdAt?: number };
type Payment = { id: string | number; member: string; flat: string; amount: number; date: string; method: string; createdAt?: number };

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "notice", label: "Notice Board", icon: <Megaphone size={18} /> },
  { id: "complaints", label: "Complaints", icon: <MessageSquareWarning size={18} /> },
  { id: "accounting", label: "Accounting", icon: <Wallet size={18} /> },
  { id: "meeting", label: "Live Meeting", icon: <Video size={18} /> },
  { id: "settings", label: "Settings", icon: <Settings size={18} /> },
];

// ─── Sub-components ─────────────────────────────────────────────────────────
function Sidebar({ active, setActive, collapsed, setCollapsed, pendingCount }: any) {
  return (
    <aside className="flex flex-col h-full transition-all duration-300" style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)", width: collapsed ? "68px" : "228px", borderRight: "1px solid var(--sidebar-border)" }}>
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 36, height: 36, background: "var(--primary)" }}><span className="text-white font-bold text-sm">NS</span></div>
        {!collapsed && <div><p className="text-white text-xs font-semibold leading-tight">New Shrushti</p><p className="text-xs opacity-60">Co-op Housing Society</p></div>}
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto shrink-0 p-1 hover:bg-white/10"><Menu size={15} /></button>
      </div>
      <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => setActive(item.id)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all text-left w-full relative"
              style={{ fontWeight: isActive ? 600 : 400, background: isActive ? "var(--sidebar-accent)" : "transparent", color: isActive ? "#ffffff" : "var(--sidebar-foreground)", borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent" }}>
              <span style={{ color: isActive ? "var(--primary)" : "inherit", opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              
              {/* WhatsApp like Popup Badge for Complaints */}
              {item.id === 'complaints' && pendingCount > 0 && !collapsed && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-sm shadow-red-500/50">
                  {pendingCount} New
                </span>
              )}
              {item.id === 'complaints' && pendingCount > 0 && collapsed && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function Header({ notifications }: any) {
  return (
    <header className="flex items-center gap-4 px-6 py-3.5 border-b" style={{ background: "var(--card)", borderColor: "var(--border)", minHeight: 60 }}>
      <div className="flex-1 max-w-sm">
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} /><input placeholder="Search members, flats, notices…" className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border" style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)" }} /></div>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <button className="relative p-2 rounded-lg hover:bg-accent" style={{ color: "var(--muted-foreground)" }}>
          <Bell size={18} />
          {notifications > 0 && <span className="absolute top-1 right-1 flex items-center justify-center rounded-full text-white bg-red-500 shadow-sm shadow-red-500/50 animate-bounce" style={{ width: 16, height: 16, fontSize: 9 }}>{notifications}</span>}
        </button>
        <div className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center rounded-full text-white text-xs font-bold shrink-0" style={{ width: 34, height: 34, background: "linear-gradient(135deg, #1A6FC4 0%, #0F4D91 100%)" }}>AD</div>
          <div className="hidden sm:block"><p className="text-sm font-semibold leading-none">Admin</p><p className="text-xs mt-0.5 text-muted-foreground">Secretary</p></div>
        </div>
      </div>
    </header>
  );
}

function KpiCard({ icon, label, value, sub, color }: any) {
  return (
    <div className="rounded-xl p-5 border flex items-start gap-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 44, height: 44, background: color + "18" }}><span style={{ color }}>{icon}</span></div>
      <div className="flex-1 min-w-0"><p className="text-xs font-medium uppercase tracking-wider mb-1 text-muted-foreground">{label}</p><p className="text-2xl font-bold leading-none">{value}</p><p className="text-xs mt-1" style={{ color }}>{sub}</p></div>
    </div>
  );
}

function NoticeBoardWidget({ notices, onAdd }: any) {
  return (
    <div className="rounded-xl border flex flex-col" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div><h2 className="text-sm font-bold">Notice Board</h2><p className="text-xs mt-0.5 text-muted-foreground">{notices.length} active notices</p></div>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-semibold" style={{ background: "var(--primary)" }}><Plus size={13} /> New Notice</button>
      </div>
      <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
        {notices.map((n: any) => (
          <div key={n.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-accent/40">
            <div className="mt-0.5 shrink-0">{n.urgent ? <AlertTriangle size={14} color="#D97706" /> : <Circle size={14} className="opacity-50" />}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><p className="text-sm font-semibold truncate">{n.title}</p>{n.urgent && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">URGENT</span>}</div>
              <p className="text-xs mt-0.5 truncate text-muted-foreground">{n.subtitle}</p><p className="text-xs mt-1 opacity-60">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplaintsWidget({ complaints, onResolve }: any) {
  return (
    <div className="rounded-xl border flex flex-col" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-sm font-bold">Recent Complaints</h2><p className="text-xs mt-0.5 text-muted-foreground">{complaints.filter((c:any) => c.status === "Pending").length} pending</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}><th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Flat No.</th><th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Issue</th><th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th><th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Action</th></tr></thead>
          <tbody>
            {complaints.length === 0 && <tr><td colSpan={4} className="p-5 text-center text-muted-foreground">No complaints yet.</td></tr>}
            {complaints.map((c: any) => (
              <tr key={c.id} className="border-b transition-colors hover:bg-accent/30" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-3 font-semibold text-primary">{c.flat}</td>
                <td className="px-4 py-3"><span className="line-clamp-1 text-xs">{c.issue}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.status==='Pending'?'bg-yellow-100 text-yellow-800':'bg-green-100 text-green-800'}`}>{c.status}</span></td>
                <td className="px-4 py-3">
                  {c.status === "Pending" ? (
                    <button onClick={() => onResolve(c.id)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border hover:bg-green-50 text-green-700 border-green-600 transition-colors">
                      <CheckCircle2 size={13} /> Resolve
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-green-700">
                      <BadgeCheck size={13} /> Done
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountingWidget({ payments }: any) {
  const total = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  return (
    <div className="rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div><h2 className="text-sm font-bold">Accounting Snapshot</h2><p className="text-xs mt-0.5 text-muted-foreground">Real-time payments sync</p></div>
        <div className="text-right"><p className="text-xs text-muted-foreground">COLLECTED THIS MONTH</p><p className="text-lg font-bold text-primary">₹{total.toLocaleString("en-IN")}</p></div>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {payments.length === 0 && <p className="p-5 text-center text-sm text-muted-foreground">No payments yet. Scan QR to pay!</p>}
        {payments.map((p: any) => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/30 transition-colors">
            <div className="flex items-center justify-center rounded-full shrink-0 text-white text-xs font-bold bg-blue-600" style={{ width: 34, height: 34 }}>{p.member.substring(0,2).toUpperCase()}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{p.member}</p><p className="text-xs text-muted-foreground">{p.flat} · {p.date}</p></div>
            <div className="flex items-center gap-2.5 shrink-0"><span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-800">{p.method}</span><span className="text-sm font-bold">₹{Number(p.amount).toLocaleString("en-IN")}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeetingWidget() {
  const roomName = "ShrushtiSocietyVirtualTownhall2026";
  const meetLink = `https://meet.jit.si/${roomName}`;
  return (
    <div className="rounded-xl border flex flex-col shadow-sm" style={{ background: "var(--card)", borderColor: "var(--border)", height: "70vh", minHeight: "500px" }}>
      <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: "var(--border)" }}>
        <div><h2 className="text-sm font-bold">Society Virtual Townhall</h2><p className="text-xs mt-0.5 flex items-center gap-1.5 text-green-600 font-semibold"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live Now</p></div>
        <button onClick={() => { navigator.clipboard.writeText(meetLink); alert("Link Copied!"); }} className="px-4 py-1.5 rounded-lg text-xs text-white font-semibold bg-primary">Copy Invite Link</button>
      </div>
      <div className="flex-1 w-full bg-black rounded-b-xl overflow-hidden relative"><iframe src={meetLink} allow="camera; microphone; fullscreen; display-capture" className="w-full h-full border-0 absolute top-0 left-0"></iframe></div>
    </div>
  );
}

function NewNoticeModal({ onClose, onSave }: any) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="rounded-2xl w-full max-w-md shadow-2xl border bg-white"><div className="flex justify-between px-6 py-4 border-b"><h3 className="font-bold">Post Notice</h3><button onClick={onClose}><X size={16}/></button></div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full px-3 py-2 rounded-lg border text-sm" />
          <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Details..." className="w-full px-3 py-2 rounded-lg border text-sm" />
        </div>
        <div className="px-6 py-4 border-t flex gap-3 justify-end"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border">Cancel</button><button onClick={() => { if(title) onSave({ title, subtitle, time: "Just now", urgent: false }); }} className="px-4 py-2 rounded-lg text-sm text-white bg-blue-600">Post</button></div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]); 
  const [complaints, setComplaints] = useState<Complaint[]>([]); // REAL-TIME COMPLAINTS
  const [showModal, setShowModal] = useState(false);

  // Fetch from Firebase
  useEffect(() => {
    const unNotices = onSnapshot(query(collection(db, "notices"), orderBy("createdAt", "desc")), (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));
    });

    const unPayments = onSnapshot(query(collection(db, "payments"), orderBy("createdAt", "desc")), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });
    
    // Fetch Complaints live
    const unComplaints = onSnapshot(query(collection(db, "complaints"), orderBy("createdAt", "desc")), (snapshot) => {
      setComplaints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint)));
    });

    return () => { unNotices(); unPayments(); unComplaints(); };
  }, []);

  const pendingCount = complaints.filter(c => c.status === "Pending").length;
  const totalFunds = payments.reduce((s, p) => s + Number(p.amount), 0);

  const addNoticeToFirebase = async (n: any) => {
    try {
      await addDoc(collection(db, "notices"), { ...n, createdAt: Date.now() });
      setShowModal(false);
    } catch (e) { alert("Error saving to db"); }
  };
  
  // Update complaint status in Firebase
  const resolveComplaint = async (id: string) => {
    try {
      await updateDoc(doc(db, "complaints", id), { status: "Resolved" });
    } catch (e) { console.error("Error updating complaint", e); }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "DM Sans, sans-serif", background: "var(--background)" }}>
      <Sidebar active={activeNav} setActive={setActiveNav} collapsed={collapsed} setCollapsed={setCollapsed} pendingCount={pendingCount} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header notifications={pendingCount} />
        <main className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarWidth: "thin" }}>
          <div className="mb-6 border-b pb-4"><h1 className="text-2xl font-extrabold capitalize">{activeNav === "dashboard" ? "Dashboard Overview" : activeNav.replace('-', ' ')}</h1><p className="text-sm mt-1 text-muted-foreground">New Shrushti Co-operative Housing Society Ltd.</p></div>
          
          {activeNav === "dashboard" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <KpiCard icon={<Users size={20} />} label="Total Members" value="120" sub="Active" color="#1A6FC4" />
                <KpiCard icon={<Clock size={20} />} label="Pending Complaints" value={String(pendingCount)} sub={pendingCount > 0 ? "Requires attention" : "All clear!"} color="#D97706" />
                <KpiCard icon={<IndianRupee size={20} />} label="Funds Collected" value={`₹${totalFunds.toLocaleString()}`} sub="Updated Real-Time" color="#16A34A" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4"><NoticeBoardWidget notices={notices} onAdd={() => setShowModal(true)} /><ComplaintsWidget complaints={complaints} onResolve={resolveComplaint} /></div>
            </div>
          )}
          {activeNav === "notice" && <div className="max-w-4xl mx-auto"><NoticeBoardWidget notices={notices} onAdd={() => setShowModal(true)} /></div>}
          {activeNav === "complaints" && <div className="max-w-5xl mx-auto"><ComplaintsWidget complaints={complaints} onResolve={resolveComplaint} /></div>}
          {activeNav === "accounting" && <div className="max-w-4xl mx-auto"><AccountingWidget payments={payments} /></div>}
          {activeNav === "meeting" && <div className="max-w-5xl mx-auto"><MeetingWidget /></div>}
          <div className="h-6" />
        </main>
      </div>
      {showModal && <NewNoticeModal onClose={() => setShowModal(false)} onSave={addNoticeToFirebase} />}
    </div>
  );
}
