import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import {
  LayoutDashboard, Bell, Search, Megaphone, MessageSquareWarning, Landmark,
  CheckCircle2, AlertTriangle, X, Menu, ShieldCheck, Video, Plus, ArrowRight,
  ScrollText, Building2, Wallet, Clock, Copy, Camera, CameraOff, Phone, MessagesSquare, Send,
  Hammer, CalendarDays, Mail, BellRing, Star, Archive, Paperclip, Trash2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

/**
 * "The Society File" — the admin panel is designed to feel like a physical
 * registrar's case file that's been digitized: kraft folder tabs for
 * navigation, treasury punch-holes on the sidebar, rubber-stamp status
 * badges (purple/oxblood ink), dog-eared corner folds on the Building
 * Registry cards instead of colour dots, and a typewriter display face.
 * This replaces an earlier dark-glass/neon-glow version that, on review,
 * read as a generic "AI dashboard" rather than something built for this
 * specific subject. Motion is intentionally restrained here — the one
 * signature motion moment is the stamp "thud" when a complaint's status
 * is toggled; everything else stays calm.
 *
 * Same Firebase logic as before — this is a visual layer swap only.
 *
 * Fonts:
 *   <link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
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
type ChatMessage = { id: string; chatId: string; sender: string; text: string; createdAt: number; read?: boolean };
type WorkStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";
type WorkItem = {
  id: string; title: string; description: string; category: string; status: WorkStatus;
  assignedTo: string; workerPhone: string; altContact: string; estimatedCost: string; finalCost: string;
  startDate: string; expectedDate: string; actualDate: string; priority: "Low" | "Medium" | "High";
  materials: string; progress: number; remarks: string; createdAt: number;
};
type SocietyEvent = {
  id: string; title: string; description: string; category: string; color: string; location: string;
  date: string; startTime: string; endTime: string; recurring: boolean; createdAt: number;
};
type Reminder = {
  id: string; title: string; description: string; date: string; time: string;
  priority: "Low" | "Medium" | "High"; recurring: boolean; createdAt: number;
};
type ScheduledMeeting = {
  id: string; title: string; agenda: string; mode: "Online" | "Offline"; venueOrLink: string;
  date: string; time: string; organizer: string; createdAt: number;
};
type DemoEmail = {
  id: string; from: string; fromEmail: string; subject: string; preview: string; body: string;
  date: string; unread: boolean; starred: boolean; archived: boolean; attachment?: string;
};

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
  { id: "notice", label: "Notice Board", icon: <Megaphone size={17} /> },
  { id: "complaints", label: "Complaints", icon: <MessageSquareWarning size={17} /> },
  { id: "chat", label: "Correspondence", icon: <MessagesSquare size={17} /> },
  { id: "email", label: "Email", icon: <Mail size={17} /> },
  { id: "work", label: "Work Management", icon: <Hammer size={17} /> },
  { id: "calendar", label: "Calendar", icon: <CalendarDays size={17} /> },
  { id: "accounting", label: "Accounting", icon: <ScrollText size={17} /> },
  { id: "meeting", label: "Meeting", icon: <Video size={17} /> },
  { id: "cctv", label: "CCTV", icon: <Camera size={17} /> },
  { id: "funds", label: "Custom Funds", icon: <ShieldCheck size={17} /> },
];

const ALL_FLATS = ["A-101", "A-102", "A-103", "B-101", "B-102"];
const STAFF_ROLES = ["Watchman", "Electrician", "Plumber", "Waste Collection Staff", "Gardener"];

type ChatContact = { id: string; name: string; group: "Member" | "Staff" };
const CHAT_CONTACTS: ChatContact[] = [
  ...ALL_FLATS.map(flat => ({ id: `member-${flat}`, name: `Flat ${flat}`, group: "Member" as const })),
  ...STAFF_ROLES.map(role => ({ id: `staff-${role.toLowerCase().replace(/\s/g, "-")}`, name: role, group: "Staff" as const })),
];

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

const WORK_STATUSES: WorkStatus[] = ["Pending", "In Progress", "Completed", "Cancelled"];
const WORK_CATEGORIES = ["Plumbing", "Electrical", "Painting", "Cleaning", "Gardening", "Security", "Civil / Structural", "Other"];
const emptyWorkForm = {
  title: "", description: "", category: WORK_CATEGORIES[0], assignedTo: "", workerPhone: "", altContact: "",
  estimatedCost: "", finalCost: "", startDate: "", expectedDate: "", actualDate: "",
  priority: "Medium" as "Low" | "Medium" | "High", materials: "", progress: "0", remarks: "",
};

const EVENT_CATEGORIES = ["Meeting", "Maintenance", "Festival / Function", "Payment Due", "Other"];
const emptyEventForm = { title: "", description: "", category: EVENT_CATEGORIES[0], color: "#4B3B78", location: "", date: "", startTime: "", endTime: "", recurring: false };
const emptyReminderForm = { title: "", description: "", date: "", time: "", priority: "Medium" as "Low" | "Medium" | "High", recurring: false };
const emptyScheduleForm = { title: "", agenda: "", mode: "Online" as "Online" | "Offline", venueOrLink: "", date: "", time: "", organizer: "Admin" };

// Demo inbox — UI-only mock data, not connected to a real mailbox.
// A real integration needs Gmail API OAuth + a Google Cloud project + a
// backend to hold tokens, which is out of scope for this demo build.
const DEMO_EMAILS_SEED = [
  { id: "e1", from: "VVMC Water Supply Dept.", fromEmail: "watersupply@vvmc.gov.in", subject: "Scheduled water supply interruption — Ward 12", preview: "This is to inform all registered societies that water supply will be interrupted on...", body: "This is to inform all registered societies in Ward 12 that water supply will be interrupted for pipeline maintenance work between 10:00 AM and 4:00 PM. Residents are advised to store water in advance.", date: "2 hours ago", unread: true, starred: false, archived: false },
  { id: "e2", from: "MSEDCL Customer Care", fromEmail: "care@msedcl.in", subject: "Electricity bill generated — Society common area", preview: "Your electricity bill for the common area connection has been generated...", body: "Your electricity bill for the common area connection (Consumer No. 4471xxxxx) for this billing cycle has been generated. Amount payable and due date are attached.", date: "Yesterday", unread: true, starred: true, archived: false, attachment: "bill_common_area.pdf" },
  { id: "e3", from: "Sharma Painting Contractors", fromEmail: "sharmapaints@gmail.com", subject: "Quotation for exterior painting work", preview: "As discussed, please find attached our quotation for the building exterior...", body: "As discussed with the committee, please find attached our quotation for the building exterior painting work, including material and labour cost breakdown. Valid for 15 days.", date: "2 days ago", unread: false, starred: true, archived: false, attachment: "quotation.pdf" },
  { id: "e4", from: "VVMC Property Tax Dept.", fromEmail: "propertytax@vvmc.gov.in", subject: "Property tax payment reminder", preview: "This is a reminder that property tax for the current financial year is due...", body: "This is a reminder that the property tax for the current financial year for your society's registered property is due. Please pay before the due date to avoid penalty.", date: "3 days ago", unread: false, starred: false, archived: false },
  { id: "e5", from: "Cooperative Housing Federation", fromEmail: "info@chsfederation.org", subject: "Invitation: Annual co-operative societies meet", preview: "You are cordially invited to the annual meet for registered co-operative...", body: "You are cordially invited to the annual meet for registered co-operative housing societies in the region, covering updates to the Model Bye-Laws and Q&A with the registrar's office.", date: "5 days ago", unread: false, starred: false, archived: false },
  { id: "e6", from: "Fire Safety Compliance Cell", fromEmail: "firesafety@vvmc.gov.in", subject: "Annual fire safety audit due", preview: "As per municipal regulations, your society's fire safety audit is due...", body: "As per municipal regulations, your society's annual fire safety audit (fire extinguishers, hydrant systems, evacuation signage) is due this month. Please schedule an inspection.", date: "1 week ago", unread: false, starred: false, archived: true },
  { id: "e7", from: "Google Workspace", fromEmail: "no-reply@google.com", subject: "Your storage is almost full", preview: "You're running low on storage. Upgrade to keep everything backed up...", body: "You're running low on storage across Gmail, Drive and Photos. Upgrade your plan to keep everything backed up safely.", date: "1 week ago", unread: false, starred: false, archived: true },
];

// ── Design tokens: "digitized case file" ───────────────────────────────
const paper = "#EFEAD9";
const paperLight = "#F8F5EA";
const ink = "#1A1B16";
const inkMuted = "#75705C";
const stampPurple = "#4B3B78";
const stampRed = "#9E2B25";
const kraftTan = "#C7A467";
const goldSeal = "#A67C2E";
const lineColor = "#DCD3B7";
const display = "'Special Elite', 'IBM Plex Mono', monospace";
const mono = "'IBM Plex Mono', monospace";

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

function ClaspMark({ color = stampRed, size = 26 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" style={{ opacity: 0.85 }}>
      <path d="M4 6 L24 22 M24 6 L4 22" stroke={color} strokeWidth="1.4" opacity="0.55" />
      <circle cx="14" cy="14" r="4.2" fill={color} />
      <circle cx="14" cy="14" r="4.2" fill="none" stroke={paperLight} strokeWidth="1" />
    </svg>
  );
}

function StampBadge({ label, tone }: { label: string; tone: "resolved" | "pending" }) {
  const color = tone === "resolved" ? stampPurple : stampRed;
  return (
    <motion.span
      whileTap={{ scale: 0.82, rotate: tone === "resolved" ? -10 : 9 }}
      transition={{ type: "spring", stiffness: 500, damping: 12 }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded uppercase"
      style={{
        color, border: `2px solid ${color}`, boxShadow: `0 0 0 1px ${color}44`,
        transform: `rotate(${tone === "resolved" ? -5 : 4}deg)`,
        fontFamily: display, fontSize: "10.5px", letterSpacing: "0.04em", background: `${color}0C`,
      }}
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
    <button onClick={onClick} className="relative rounded overflow-hidden aspect-video text-left" style={{ background: "#000", border: `1px solid ${stream ? `${stampRed}88` : "#2A2A26"}` }}>
      {stream ? (
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ backgroundImage: "repeating-linear-gradient(45deg, #14140F 0px, #14140F 2px, #0A0A08 2px, #0A0A08 9px)" }}>
          <CameraOff size={18} style={{ color: "#4A4A40" }} />
          <span className="text-[10px] uppercase tracking-wide" style={{ color: "#4A4A40", fontFamily: mono }}>Standby</span>
        </div>
      )}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: "rgba(0,0,0,0.65)", color: stream ? "#E8827A" : "#8A8A7E" }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: stream ? stampRed : "#5A5A50" }} />
        {stream ? "LIVE" : "OFFLINE"}
      </div>
      <div className="absolute bottom-2 left-2 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", color: paperLight, fontFamily: mono }}>{name}</div>
      {stream && (
        <div className="absolute bottom-2 right-2 text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", color: paperLight, fontFamily: mono }}>
          {new Date(tick).toLocaleTimeString("en-IN")}
        </div>
      )}
    </button>
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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [contactSearch, setContactSearch] = useState("");

  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [workForm, setWorkForm] = useState(emptyWorkForm);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);

  const [events, setEvents] = useState<SocietyEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderForm, setReminderForm] = useState(emptyReminderForm);
  const [dueReminderPopup, setDueReminderPopup] = useState<Reminder | null>(null);
  const [firedReminders, setFiredReminders] = useState<Set<string>>(new Set());
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);

  const [demoEmails, setDemoEmails] = useState<DemoEmail[]>(DEMO_EMAILS_SEED);
  const [emailFilter, setEmailFilter] = useState<"Inbox" | "Unread" | "Starred" | "Archived">("Inbox");
  const [selectedEmail, setSelectedEmail] = useState<DemoEmail | null>(null);
  const [emailSearch, setEmailSearch] = useState("");

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

    const unsubMessages = onSnapshot(collection(db, "messages"), snapshot => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
    });

    const unsubWork = onSnapshot(collection(db, "work_items"), snapshot => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WorkItem)).sort((a, b) => b.createdAt - a.createdAt);
      setWorkItems(list);
    });

    const unsubEvents = onSnapshot(collection(db, "events"), snapshot => {
      setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SocietyEvent)));
    });

    const unsubReminders = onSnapshot(collection(db, "reminders"), snapshot => {
      setReminders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Reminder)));
    });

    const unsubSchedule = onSnapshot(collection(db, "scheduled_meetings"), snapshot => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduledMeeting)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      setScheduledMeetings(list);
    });

    return () => { unsubNotices(); unsubComplaints(); unsubPayments(); unsubFunds(); unsubMeetings(); unsubMessages(); unsubWork(); unsubEvents(); unsubReminders(); unsubSchedule(); };
  }, []);

  // Check reminders every clock tick and pop up the first one that's newly due
  useEffect(() => {
    const now = new Date(clockTick);
    const todayStr = now.toISOString().slice(0, 10);
    const nowHHMM = now.toTimeString().slice(0, 5);
    const due = reminders.find(r => r.date === todayStr && r.time <= nowHHMM && !firedReminders.has(r.id));
    if (due) {
      setDueReminderPopup(due);
      setFiredReminders(prev => new Set(prev).add(due.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockTick, reminders]);

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

  const handleScheduleMeeting = async () => {
    if (!scheduleForm.title.trim() || !scheduleForm.date || !scheduleForm.time) return alert("Fill in title, date and time");
    await addDoc(collection(db, "scheduled_meetings"), { ...scheduleForm, createdAt: Date.now() });
    setScheduleForm(emptyScheduleForm);
    setShowScheduleModal(false);
  };

  const handleDeleteScheduled = async (id: string) => {
    await deleteDoc(doc(db, "scheduled_meetings", id));
  };

  const startScheduledMeeting = async (m: ScheduledMeeting) => {
    const roomName = `NSCHS-${m.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20)}`;
    await addDoc(collection(db, "meetings"), { roomName, startedAt: Date.now() });
    setActiveRoom(roomName);
  };

  const openEmail = (mail: DemoEmail) => {
    setSelectedEmail(mail);
    setDemoEmails(prev => prev.map(m => m.id === mail.id ? { ...m, unread: false } : m));
  };
  const toggleStarEmail = (id: string) => setDemoEmails(prev => prev.map(m => m.id === id ? { ...m, starred: !m.starred } : m));
  const toggleArchiveEmail = (id: string) => { setDemoEmails(prev => prev.map(m => m.id === id ? { ...m, archived: !m.archived } : m)); setSelectedEmail(null); };
  const emailUnreadCount = demoEmails.filter(m => m.unread && !m.archived).length;

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

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedContact) return;
    await addDoc(collection(db, "messages"), {
      chatId: selectedContact.id, sender: "admin", text: chatInput.trim(), createdAt: Date.now(), read: true,
    });
    setChatInput("");
  };

  const handleSelectContact = async (contact: ChatContact) => {
    setSelectedContact(contact);
    const unread = messages.filter(m => m.chatId === contact.id && m.sender !== "admin" && !m.read);
    await Promise.all(unread.map(m => updateDoc(doc(db, "messages", m.id), { read: true })));
  };

  const contactMeta = (contact: ChatContact) => {
    const thread = messages.filter(m => m.chatId === contact.id).sort((a, b) => b.createdAt - a.createdAt);
    const last = thread[0];
    const unreadCount = thread.filter(m => m.sender !== "admin" && !m.read).length;
    const lastFromContact = thread.find(m => m.sender === contact.id);
    const isActive = lastFromContact ? Date.now() - lastFromContact.createdAt < 5 * 60 * 1000 : false;
    return { last, unreadCount, isActive, lastFromContact };
  };

  const openNewWorkModal = () => {
    setWorkForm(emptyWorkForm);
    setEditingWorkId(null);
    setShowWorkModal(true);
  };

  const openEditWorkModal = (item: WorkItem) => {
    setWorkForm({
      title: item.title, description: item.description, category: item.category,
      assignedTo: item.assignedTo, workerPhone: item.workerPhone, altContact: item.altContact,
      estimatedCost: item.estimatedCost, finalCost: item.finalCost, startDate: item.startDate,
      expectedDate: item.expectedDate, actualDate: item.actualDate, priority: item.priority,
      materials: item.materials, progress: String(item.progress), remarks: item.remarks,
    });
    setEditingWorkId(item.id);
    setSelectedWork(null);
    setShowWorkModal(true);
  };

  const handleSaveWork = async () => {
    if (!workForm.title.trim()) return alert("Give the work item a title");
    const payload = {
      ...workForm, progress: Math.max(0, Math.min(100, Number(workForm.progress) || 0)),
    };
    if (editingWorkId) {
      await updateDoc(doc(db, "work_items", editingWorkId), payload);
    } else {
      await addDoc(collection(db, "work_items"), { ...payload, status: "Pending" as WorkStatus, createdAt: Date.now() });
    }
    setShowWorkModal(false);
    setEditingWorkId(null);
  };

  const handleWorkStatusChange = async (id: string, status: WorkStatus) => {
    await updateDoc(doc(db, "work_items", id), { status });
  };

  const handleDeleteWork = async (id: string) => {
    if (!confirm("Remove this work item from the register?")) return;
    await deleteDoc(doc(db, "work_items", id));
    setSelectedWork(null);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.date) return alert("Give the event a title and date");
    await addDoc(collection(db, "events"), { ...eventForm, createdAt: Date.now() });
    setEventForm({ ...emptyEventForm, date: selectedDate || "" });
    setShowEventModal(false);
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteDoc(doc(db, "events", id));
  };

  const handleSaveReminder = async () => {
    if (!reminderForm.title.trim() || !reminderForm.date || !reminderForm.time) return alert("Fill in title, date and time");
    await addDoc(collection(db, "reminders"), { ...reminderForm, createdAt: Date.now() });
    setReminderForm(emptyReminderForm);
    setShowReminderModal(false);
  };

  const handleDeleteReminder = async (id: string) => {
    await deleteDoc(doc(db, "reminders", id));
  };

  // Calendar grid helpers
  const monthLabel = calendarMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const calendarDays: { dateStr: string; inMonth: boolean }[] = (() => {
    const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { dateStr: string; inMonth: boolean }[] = [];
    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, month, 1 - (startOffset - i));
      cells.push({ dateStr: d.toISOString().slice(0, 10), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ dateStr: new Date(year, month, d).toISOString().slice(0, 10), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = new Date(cells[cells.length - 1].dateStr);
      last.setDate(last.getDate() + 1);
      cells.push({ dateStr: last.toISOString().slice(0, 10), inMonth: false });
    }
    return cells;
  })();
  const todayStr = new Date(clockTick).toISOString().slice(0, 10);
  const eventsOn = (dateStr: string) => events.filter(e => e.date === dateStr);

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
  const statusColor = { issue: stampRed, due: goldSeal, clear: stampPurple };
  const statusLabel = { issue: "Open complaint", due: "Maintenance due", clear: "All clear" };
  const wings = Array.from(new Set(ALL_FLATS.map(f => f.split("-")[0]))).sort();
  const filteredComplaints = complaints.filter(c => complaintFilter === "All" || c.status === complaintFilter);

  const totalUnreadMessages = CHAT_CONTACTS.reduce((sum, c) => sum + contactMeta(c).unreadCount, 0);
  const todaysEvents = events.filter(e => e.date === todayStr);
  const todaysReminders = reminders.filter(r => r.date === todayStr);
  const todaysMeetings = scheduledMeetings.filter(m => m.date === todayStr);
  const notificationCount = pendingCount + totalUnreadMessages + todaysEvents.length + todaysReminders.length + todaysMeetings.length;

  return (
    <div className="min-h-screen flex" style={{ background: paper, color: ink, fontFamily: "'Inter', sans-serif" }}>
      {/* SIDEBAR — folder tabs + punch holes */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out`}
        style={{ background: kraftTan, borderRight: `1px solid ${goldSeal}55` }}
      >
        {/* punch holes */}
        <div className="absolute left-2.5 top-24 bottom-24 flex flex-col justify-between py-6 pointer-events-none">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: paper, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)" }} />
          ))}
        </div>

        <div className="flex items-center gap-3 h-20 pl-10 pr-5 border-b" style={{ borderColor: "#B4915A" }}>
          <ClaspMark color="#5A4322" size={24} />
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em]" style={{ color: "#5A4322" }}>Society File</p>
            <h1 className="text-sm font-semibold leading-tight" style={{ color: "#2B2110", fontFamily: display }}>{SOCIETY_NAME}</h1>
          </div>
          <button className="md:hidden ml-auto" style={{ color: "#5A4322" }} onClick={() => setIsMobileMenuOpen(false)}><X size={20} /></button>
        </div>

        <nav className="pt-5 pl-8 pr-0 space-y-1.5">
          {navItems.map(item => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveNav(item.id); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 text-sm"
                style={{
                  background: active ? paper : "transparent",
                  color: active ? ink : "#4A3A1E",
                  borderRadius: "6px 0 0 6px",
                  fontWeight: active ? 600 : 500,
                  boxShadow: active ? "-2px 2px 6px rgba(0,0,0,0.12)" : "none",
                  marginRight: active ? -1 : 0,
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 pl-8 pr-4 py-4 border-t" style={{ borderColor: "#B4915A" }}>
          <p className="text-[10px]" style={{ color: "#5A4322", fontFamily: mono }}>Reg. Society &middot; Records since onboarding</p>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        {/* HEADER — file cover strip */}
        <div className="flex items-center justify-between mb-6 px-5 py-3.5 rounded" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden" style={{ color: inkMuted }} onClick={() => setIsMobileMenuOpen(true)}><Menu size={22} /></button>
            <div className="hidden md:block">
              <p className="text-[10px] tracking-wide uppercase" style={{ color: inkMuted, fontFamily: mono }}>File / {activeNav.replace("-", " ")}</p>
              <h2 className="text-lg font-semibold capitalize" style={{ fontFamily: display }}>{activeNav.replace("-", " ")}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: inkMuted }} />
              <input type="text" placeholder="Search records..." className="pl-8 pr-4 py-2 rounded text-sm w-56 focus:outline-none" style={{ background: paper, border: `1px solid ${lineColor}`, color: ink }} />
            </div>
            <div className="relative">
              <button onClick={() => setShowNotifPanel(v => !v)} className="relative p-2" style={{ color: inkMuted }}>
                <BellRing size={18} />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: stampRed }}>
                    {notificationCount}
                  </span>
                )}
              </button>
              {showNotifPanel && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-12 w-80 rounded overflow-hidden z-50 max-h-96 overflow-y-auto"
                  style={{ background: paperLight, border: `1px solid ${lineColor}`, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: lineColor }}>
                    <p className="text-sm font-semibold" style={{ fontFamily: display }}>Notifications</p>
                  </div>
                  {notificationCount === 0 && <p className="p-5 text-center text-sm" style={{ color: inkMuted }}>Nothing new.</p>}
                  {pendingCount > 0 && (
                    <button onClick={() => { setActiveNav("complaints"); setShowNotifPanel(false); }} className="w-full text-left px-4 py-3 border-b flex items-start gap-2.5" style={{ borderColor: lineColor }}>
                      <AlertTriangle size={15} style={{ color: stampRed }} className="mt-0.5 shrink-0" />
                      <p className="text-sm">{pendingCount} complaint{pendingCount > 1 ? "s" : ""} awaiting resolution</p>
                    </button>
                  )}
                  {totalUnreadMessages > 0 && (
                    <button onClick={() => { setActiveNav("chat"); setShowNotifPanel(false); }} className="w-full text-left px-4 py-3 border-b flex items-start gap-2.5" style={{ borderColor: lineColor }}>
                      <MessagesSquare size={15} style={{ color: stampPurple }} className="mt-0.5 shrink-0" />
                      <p className="text-sm">{totalUnreadMessages} unread message{totalUnreadMessages > 1 ? "s" : ""}</p>
                    </button>
                  )}
                  {todaysReminders.map(r => (
                    <div key={r.id} className="px-4 py-3 border-b flex items-start gap-2.5" style={{ borderColor: lineColor }}>
                      <Clock size={15} style={{ color: goldSeal }} className="mt-0.5 shrink-0" />
                      <p className="text-sm">Reminder: {r.title} at {r.time}</p>
                    </div>
                  ))}
                  {todaysEvents.map(e => (
                    <button key={e.id} onClick={() => { setActiveNav("calendar"); setShowNotifPanel(false); }} className="w-full text-left px-4 py-3 border-b flex items-start gap-2.5" style={{ borderColor: lineColor }}>
                      <CalendarDays size={15} style={{ color: e.color }} className="mt-0.5 shrink-0" />
                      <p className="text-sm">Today: {e.title}</p>
                    </button>
                  ))}
                  {todaysMeetings.map(m => (
                    <button key={m.id} onClick={() => { setActiveNav("meeting"); setShowNotifPanel(false); }} className="w-full text-left px-4 py-3 border-b flex items-start gap-2.5" style={{ borderColor: lineColor }}>
                      <Video size={15} style={{ color: stampPurple }} className="mt-0.5 shrink-0" />
                      <p className="text-sm">Meeting today: {m.title} at {m.time}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs border-2" style={{ color: stampPurple, borderColor: stampPurple, fontFamily: mono }}>AD</div>
          </div>
        </div>

        {/* DASHBOARD */}
        {activeNav === "dashboard" && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="relative rounded px-8 py-7 flex items-start justify-between flex-wrap gap-4" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: goldSeal, fontFamily: mono }}>
                  {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: display }}>Today's entry, Admin</h2>
                <p className="max-w-xl text-sm" style={{ color: inkMuted }}>
                  {pendingCount > 0 ? `${pendingCount} complaint${pendingCount > 1 ? "s" : ""} awaiting resolution. Everything else is up to date.` : "No open complaints — the register is clear."}
                </p>
              </div>
              <ClaspMark size={30} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: "Total Flats", value: ALL_FLATS.length, icon: <LayoutDashboard size={19} />, color: stampPurple },
                { label: "Pending Issues", value: pendingCount, icon: <AlertTriangle size={19} />, color: stampRed },
                { label: "Collected (May)", value: formatINR(totalCollected), icon: <Landmark size={19} />, color: goldSeal },
              ].map(stat => (
                <div key={stat.label} className="p-5 rounded" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded flex items-center justify-center shrink-0" style={{ background: `${stat.color}14`, color: stat.color }}>{stat.icon}</div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: inkMuted }}>{stat.label}</p>
                      <h3 className="text-2xl font-semibold" style={{ fontFamily: mono, color: ink }}>{stat.value}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Building Registry — index cards with dog-eared status corner */}
            <div className="p-6 rounded" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Building2 size={17} style={{ color: stampPurple }} />
                  <h3 className="text-base font-semibold" style={{ fontFamily: display }}>Building Registry</h3>
                </div>
                <div className="flex items-center gap-4 text-[11px]" style={{ color: inkMuted }}>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5" style={{ background: stampPurple }} />Clear</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5" style={{ background: goldSeal }} />Due</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5" style={{ background: stampRed }} />Complaint</span>
                </div>
              </div>
              <p className="text-xs mb-5" style={{ color: inkMuted }}>Live status of every registered unit — click a flat for its record.</p>

              <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${wings.length}, minmax(0,1fr))` }}>
                {wings.map(wing => (
                  <div key={wing}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: inkMuted, fontFamily: mono }}>{wing} Wing</p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {ALL_FLATS.filter(f => f.startsWith(wing)).map(flat => {
                        const status = flatStatus(flat);
                        return (
                          <button
                            key={flat}
                            onClick={() => setSelectedFlat(flat)}
                            className="relative aspect-square rounded flex flex-col items-center justify-center overflow-hidden"
                            style={{ background: paper, border: `1px solid ${lineColor}` }}
                          >
                            <div className="absolute top-0 right-0 w-4 h-4" style={{ background: `linear-gradient(135deg, transparent 50%, ${statusColor[status]} 50%)` }} />
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
              <div className="lg:col-span-2 p-6 rounded" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
                <h3 className="text-base font-semibold mb-5" style={{ fontFamily: display }}>Collections, month by month</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={lineColor} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: inkMuted, fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: inkMuted, fontSize: 12 }} />
                      <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} contentStyle={{ borderRadius: 6, border: `1px solid ${lineColor}`, fontSize: 12, background: paperLight }} />
                      <Bar dataKey="amount" fill={stampPurple} radius={[3, 3, 0, 0]} barSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 rounded" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
                <h3 className="text-base font-semibold mb-5" style={{ fontFamily: display }}>Complaint status</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={complaintStats} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                        <Cell fill={stampPurple} />
                        <Cell fill={stampRed} />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 6, border: `1px solid ${lineColor}`, fontSize: 12, background: paperLight }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-5 mt-3 text-xs" style={{ color: inkMuted }}>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: stampPurple }} />Resolved</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: stampRed }} />Pending</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 rounded overflow-hidden" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
                <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: lineColor }}>
                  <h3 className="text-base font-semibold" style={{ fontFamily: display }}>Recent entries</h3>
                  <button onClick={() => setActiveNav("accounting")} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: stampPurple }}>View ledger <ArrowRight size={13} /></button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr style={{ background: paper }}>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: inkMuted }}>Flat</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: inkMuted }}>Purpose</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: inkMuted }}>Amount</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: inkMuted }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 4).map((p, idx) => (
                      <tr key={p.id} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)" }}>
                        <td className="px-6 py-3.5 font-medium">{p.flat}</td>
                        <td className="px-6 py-3.5" style={{ color: inkMuted }}>{p.type === "Event" ? p.eventName : "Maintenance"}</td>
                        <td className="px-6 py-3.5 font-semibold" style={{ color: stampPurple, fontFamily: mono }}>{formatINR(Number(p.amount))}</td>
                        <td className="px-6 py-3.5" style={{ color: inkMuted }}>{p.date}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center" style={{ color: inkMuted }}>No entries recorded yet</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="p-5 rounded" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
                <h3 className="text-base font-semibold mb-4" style={{ fontFamily: display }}>Quick actions</h3>
                <div className="space-y-2">
                  {[
                    { label: "Post a notice", icon: <Megaphone size={16} />, onClick: () => setShowNoticeModal(true) },
                    { label: "Raise a fund", icon: <Landmark size={16} />, onClick: () => setActiveNav("funds") },
                    { label: "Host a meeting", icon: <Video size={16} />, onClick: () => setActiveNav("meeting") },
                  ].map(action => (
                    <button key={action.label} onClick={action.onClick} className="w-full flex items-center justify-between px-4 py-3 rounded" style={{ background: paper, border: `1px solid ${lineColor}` }}>
                      <span className="flex items-center gap-3 text-sm font-medium" style={{ color: ink }}><span style={{ color: stampPurple }}>{action.icon}</span>{action.label}</span>
                      <Plus size={15} style={{ color: inkMuted }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 rounded" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: display }}>Important contacts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {CONTACTS.map(c => (
                  <a key={c.role} href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex items-center justify-between text-sm py-1">
                    <span style={{ color: ink }}>{c.role}</span>
                    <span className="flex items-center gap-1.5 font-medium" style={{ color: stampPurple, fontFamily: mono }}><Phone size={13} />{c.phone}</span>
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
              <p className="text-sm" style={{ color: inkMuted }}>{notices.length} notice{notices.length !== 1 ? "s" : ""} on record</p>
              <button onClick={() => setShowNoticeModal(true)} className="flex items-center gap-2 font-semibold px-4 py-2 rounded text-sm text-white" style={{ background: stampPurple }}>
                <Plus size={16} />Post notice
              </button>
            </div>
            <div className="space-y-3">
              {notices.length === 0 && <div className="rounded p-10 text-center" style={{ background: paperLight, border: `1px solid ${lineColor}`, color: inkMuted }}>No notices posted yet.</div>}
              {notices.map(n => (
                <div key={n.id} className="rounded p-5" style={{ background: paperLight, border: `1px solid ${n.urgent ? `${stampRed}66` : lineColor}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: n.urgent ? `${stampRed}18` : `${stampPurple}18`, color: n.urgent ? stampRed : stampPurple, fontFamily: mono }}>
                      {n.urgent ? "Urgent" : "Notice"} #{n.number}
                    </span>
                    <span className="text-[11px]" style={{ color: inkMuted }}>{n.time}</span>
                  </div>
                  <h3 className="font-semibold" style={{ fontFamily: display }}>{n.title}</h3>
                  <p className="text-sm mt-1" style={{ color: inkMuted }}>{n.subtitle}</p>
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
                  style={{ background: complaintFilter === f ? ink : "transparent", color: complaintFilter === f ? paperLight : inkMuted, border: `1px solid ${complaintFilter === f ? ink : lineColor}` }}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="rounded overflow-hidden" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              {filteredComplaints.length === 0 && <div className="p-10 text-center text-sm" style={{ color: inkMuted }}>No complaints in this view.</div>}
              <div className="divide-y" style={{ borderColor: lineColor }}>
                {filteredComplaints.map(c => (
                  <div key={c.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c.flat} <span className="font-normal" style={{ color: inkMuted }}>&middot; {c.date}</span></p>
                      <p className="text-sm mt-0.5" style={{ color: inkMuted }}>{c.issue}</p>
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

        {/* CORRESPONDENCE (Chat) */}
        {activeNav === "chat" && (
          <div className="max-w-6xl mx-auto">
            <div className="rounded overflow-hidden flex" style={{ background: paperLight, border: `1px solid ${lineColor}`, height: "72vh" }}>
              {/* Contact list */}
              <div className="w-72 shrink-0 border-r flex flex-col" style={{ borderColor: lineColor }}>
                <div className="p-3 border-b" style={{ borderColor: lineColor }}>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" size={14} style={{ color: inkMuted }} />
                    <input
                      type="text" placeholder="Search contacts..." value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded text-sm focus:outline-none"
                      style={{ background: paper, border: `1px solid ${lineColor}` }}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {(["Member", "Staff"] as const).map(group => {
                    const groupContacts = CHAT_CONTACTS.filter(c => c.group === group && c.name.toLowerCase().includes(contactSearch.toLowerCase()));
                    if (groupContacts.length === 0) return null;
                    return (
                      <div key={group}>
                        <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: inkMuted, fontFamily: mono }}>{group}s</p>
                        {groupContacts.map(contact => {
                          const { last, unreadCount, isActive } = contactMeta(contact);
                          const selected = selectedContact?.id === contact.id;
                          return (
                            <button
                              key={contact.id}
                              onClick={() => handleSelectContact(contact)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                              style={{ background: selected ? paper : "transparent", borderLeft: selected ? `3px solid ${stampPurple}` : "3px solid transparent" }}
                            >
                              <div className="relative shrink-0">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: `${stampPurple}18`, color: stampPurple, fontFamily: mono }}>
                                  {contact.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ background: isActive ? "#3E8E5A" : "#B7AE93", borderColor: paperLight }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium truncate">{contact.name}</p>
                                  {last && <span className="text-[10px] shrink-0" style={{ color: inkMuted }}>{new Date(last.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs truncate" style={{ color: inkMuted }}>{last ? last.text : "No messages yet"}</p>
                                  {unreadCount > 0 && (
                                    <span className="text-[10px] font-semibold px-1.5 rounded-full text-white shrink-0" style={{ background: stampRed }}>{unreadCount}</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conversation */}
              <div className="flex-1 flex flex-col min-w-0">
                {!selectedContact ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: inkMuted }}>
                    <MessagesSquare size={26} />
                    <p className="text-sm">Select a contact to view the correspondence.</p>
                  </div>
                ) : (
                  <>
                    <div className="px-5 py-3.5 border-b flex items-center gap-3" style={{ borderColor: lineColor }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: `${stampPurple}18`, color: stampPurple, fontFamily: mono }}>
                        {selectedContact.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ fontFamily: display }}>{selectedContact.name}</p>
                        <p className="text-[11px]" style={{ color: inkMuted }}>
                          {contactMeta(selectedContact).isActive ? "Active now" : contactMeta(selectedContact).lastFromContact ? `Last seen ${new Date(contactMeta(selectedContact).lastFromContact!.createdAt).toLocaleString("en-IN")}` : "No messages yet"}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ background: paper }}>
                      {messages.filter(m => m.chatId === selectedContact.id).sort((a, b) => a.createdAt - b.createdAt).map(m => (
                        <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                          <div
                            className="max-w-[70%] px-3.5 py-2 rounded text-sm"
                            style={m.sender === "admin"
                              ? { background: stampPurple, color: paperLight, borderTopRightRadius: 2 }
                              : { background: paperLight, border: `1px solid ${lineColor}`, borderTopLeftRadius: 2 }}
                          >
                            <p>{m.text}</p>
                            <p className="text-[10px] mt-1 opacity-70">{new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>
                      ))}
                      {messages.filter(m => m.chatId === selectedContact.id).length === 0 && (
                        <p className="text-center text-sm mt-8" style={{ color: inkMuted }}>No correspondence yet — send the first message below.</p>
                      )}
                    </div>

                    <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: lineColor }}>
                      <input
                        type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSendMessage(); }}
                        placeholder="Type a message..."
                        className="flex-1 px-3.5 py-2.5 rounded text-sm focus:outline-none"
                        style={{ background: paper, border: `1px solid ${lineColor}` }}
                      />
                      <button onClick={handleSendMessage} className="w-10 h-10 rounded flex items-center justify-center text-white shrink-0" style={{ background: stampPurple }}>
                        <Send size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <p className="text-[11px] mt-3" style={{ color: inkMuted }}>
              Demo note: this sends and receives real messages via Firestore. Replies from the member/staff side will only appear once a matching chat screen is added to the Member Portal — happy to build that next.
            </p>
          </div>
        )}

        {/* EMAIL (demo mock inbox — not a real Gmail connection) */}
        {activeNav === "email" && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-3 px-1 text-[11px]" style={{ color: inkMuted }}>
              Demo note: this is a mock inbox with sample data for the presentation — it isn't connected to a real mailbox. A real Gmail integration needs OAuth through a Google Cloud project and a backend to hold tokens.
            </div>
            <div className="rounded overflow-hidden flex" style={{ background: paperLight, border: `1px solid ${lineColor}`, height: "70vh" }}>
              <div className="w-64 shrink-0 border-r flex flex-col" style={{ borderColor: lineColor }}>
                <div className="p-3 space-y-1">
                  {([
                    { id: "Inbox", label: "Inbox", icon: <Mail size={15} />, count: demoEmails.filter(m => !m.archived).length },
                    { id: "Unread", label: "Unread", icon: <BellRing size={15} />, count: emailUnreadCount },
                    { id: "Starred", label: "Starred", icon: <Star size={15} />, count: demoEmails.filter(m => m.starred && !m.archived).length },
                    { id: "Archived", label: "Archived", icon: <Archive size={15} />, count: demoEmails.filter(m => m.archived).length },
                  ] as const).map(f => (
                    <button key={f.id} onClick={() => { setEmailFilter(f.id); setSelectedEmail(null); }} className="w-full flex items-center justify-between px-3 py-2 rounded text-sm" style={{ background: emailFilter === f.id ? paper : "transparent", color: emailFilter === f.id ? ink : inkMuted, fontWeight: emailFilter === f.id ? 600 : 500 }}>
                      <span className="flex items-center gap-2">{f.icon}{f.label}</span>
                      {f.count > 0 && <span className="text-[10px] font-semibold" style={{ fontFamily: mono }}>{f.count}</span>}
                    </button>
                  ))}
                </div>
                <div className="px-3 pb-3 mt-auto">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" size={13} style={{ color: inkMuted }} />
                    <input value={emailSearch} onChange={e => setEmailSearch(e.target.value)} placeholder="Search mail..." className="w-full pl-7 pr-2 py-1.5 rounded text-xs focus:outline-none" style={{ background: paper, border: `1px solid ${lineColor}` }} />
                  </div>
                </div>
              </div>

              <div className="w-80 shrink-0 border-r overflow-y-auto" style={{ borderColor: lineColor }}>
                {demoEmails
                  .filter(m => emailFilter === "Inbox" ? !m.archived : emailFilter === "Unread" ? !m.archived && m.unread : emailFilter === "Starred" ? !m.archived && m.starred : m.archived)
                  .filter(m => (m.subject + m.from).toLowerCase().includes(emailSearch.toLowerCase()))
                  .map(mail => (
                    <button key={mail.id} onClick={() => openEmail(mail)} className="w-full text-left px-4 py-3 border-b" style={{ borderColor: lineColor, background: selectedEmail?.id === mail.id ? paper : "transparent" }}>
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm truncate" style={{ fontWeight: mail.unread ? 700 : 500 }}>{mail.from}</p>
                        <span className="text-[10px] shrink-0" style={{ color: inkMuted }}>{mail.date}</span>
                      </div>
                      <p className="text-xs truncate mb-0.5" style={{ fontWeight: mail.unread ? 600 : 400 }}>{mail.subject}</p>
                      <p className="text-[11px] truncate" style={{ color: inkMuted }}>{mail.preview}</p>
                      {mail.starred && <Star size={11} className="mt-1" style={{ color: goldSeal, fill: goldSeal }} />}
                    </button>
                  ))}
              </div>

              <div className="flex-1 min-w-0 overflow-y-auto p-6">
                {!selectedEmail ? (
                  <div className="h-full flex items-center justify-center" style={{ color: inkMuted }}>
                    <p className="text-sm">Select a message to read it.</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold" style={{ fontFamily: display }}>{selectedEmail.subject}</h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => toggleStarEmail(selectedEmail.id)}><Star size={17} style={{ color: selectedEmail.starred ? goldSeal : inkMuted, fill: selectedEmail.starred ? goldSeal : "none" }} /></button>
                        <button onClick={() => toggleArchiveEmail(selectedEmail.id)}><Archive size={17} style={{ color: inkMuted }} /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b" style={{ borderColor: lineColor }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: `${stampPurple}18`, color: stampPurple, fontFamily: mono }}>{selectedEmail.from.split(" ").map(w => w[0]).slice(0, 2).join("")}</div>
                      <div>
                        <p className="text-sm font-medium">{selectedEmail.from}</p>
                        <p className="text-[11px]" style={{ color: inkMuted }}>{selectedEmail.fromEmail} · {selectedEmail.date}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: ink }}>{selectedEmail.body}</p>
                    {selectedEmail.attachment && (
                      <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded text-xs" style={{ border: `1px solid ${lineColor}`, color: inkMuted }}>
                        <Paperclip size={13} />{selectedEmail.attachment}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WORK MANAGEMENT — Kanban */}
        {activeNav === "work" && (
          <div className="max-w-7xl mx-auto space-y-5">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <p className="text-sm" style={{ color: inkMuted }}>{workItems.length} work item{workItems.length !== 1 ? "s" : ""} on record</p>
              <button onClick={openNewWorkModal} className="flex items-center gap-2 font-semibold px-4 py-2 rounded text-sm text-white" style={{ background: stampPurple }}>
                <Plus size={16} />New work item
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {WORK_STATUSES.map(status => {
                const items = workItems.filter(w => w.status === status);
                const columnColor = status === "Completed" ? stampPurple : status === "Cancelled" ? inkMuted : status === "In Progress" ? goldSeal : stampRed;
                return (
                  <div key={status} className="rounded" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: lineColor }}>
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: columnColor, fontFamily: mono }}>{status}</span>
                      <span className="text-[10px] font-semibold px-1.5 rounded-full" style={{ background: `${columnColor}18`, color: columnColor }}>{items.length}</span>
                    </div>
                    <div className="p-2.5 space-y-2.5 min-h-[120px]">
                      {items.map(item => {
                        const priorityColor = item.priority === "High" ? stampRed : item.priority === "Medium" ? goldSeal : stampPurple;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedWork(item)}
                            className="w-full text-left p-3 rounded"
                            style={{ background: paper, border: `1px solid ${lineColor}`, borderLeft: `3px solid ${priorityColor}` }}
                          >
                            <p className="text-sm font-medium mb-1">{item.title}</p>
                            <p className="text-[11px] mb-2" style={{ color: inkMuted }}>{item.category}{item.assignedTo ? ` · ${item.assignedTo}` : ""}</p>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: lineColor }}>
                              <div className="h-full rounded-full" style={{ width: `${item.progress || 0}%`, background: columnColor }} />
                            </div>
                          </button>
                        );
                      })}
                      {items.length === 0 && <p className="text-[11px] text-center py-4" style={{ color: inkMuted }}>Nothing here</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Work item detail modal */}
        {selectedWork && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedWork(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="rounded w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" style={{ background: paperLight, border: `1px solid ${lineColor}` }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: lineColor }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: display }}>{selectedWork.title}</h3>
                <button onClick={() => setSelectedWork(null)} style={{ color: inkMuted }}><X size={20} /></button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <select
                  value={selectedWork.status}
                  onChange={e => { handleWorkStatusChange(selectedWork.id, e.target.value as WorkStatus); setSelectedWork({ ...selectedWork, status: e.target.value as WorkStatus }); }}
                  className="text-xs font-semibold px-3 py-1.5 rounded focus:outline-none"
                  style={{ border: `1px solid ${lineColor}`, background: paper, fontFamily: mono }}
                >
                  {WORK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded" style={{ color: selectedWork.priority === "High" ? stampRed : selectedWork.priority === "Medium" ? goldSeal : stampPurple, background: `${selectedWork.priority === "High" ? stampRed : selectedWork.priority === "Medium" ? goldSeal : stampPurple}18` }}>
                  {selectedWork.priority} priority
                </span>
              </div>

              {selectedWork.description && <p className="text-sm mb-4" style={{ color: inkMuted }}>{selectedWork.description}</p>}

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><p className="text-[10px] uppercase" style={{ color: inkMuted }}>Category</p><p>{selectedWork.category}</p></div>
                <div><p className="text-[10px] uppercase" style={{ color: inkMuted }}>Assigned to</p><p>{selectedWork.assignedTo || "—"}</p></div>
                <div><p className="text-[10px] uppercase" style={{ color: inkMuted }}>Worker phone</p><p style={{ fontFamily: mono }}>{selectedWork.workerPhone || "—"}</p></div>
                <div><p className="text-[10px] uppercase" style={{ color: inkMuted }}>Alt. contact</p><p style={{ fontFamily: mono }}>{selectedWork.altContact || "—"}</p></div>
                <div><p className="text-[10px] uppercase" style={{ color: inkMuted }}>Estimated cost</p><p style={{ fontFamily: mono }}>{selectedWork.estimatedCost ? formatINR(Number(selectedWork.estimatedCost)) : "—"}</p></div>
                <div><p className="text-[10px] uppercase" style={{ color: inkMuted }}>Final cost</p><p style={{ fontFamily: mono }}>{selectedWork.finalCost ? formatINR(Number(selectedWork.finalCost)) : "—"}</p></div>
                <div><p className="text-[10px] uppercase" style={{ color: inkMuted }}>Start date</p><p>{selectedWork.startDate || "—"}</p></div>
                <div><p className="text-[10px] uppercase" style={{ color: inkMuted }}>Expected completion</p><p>{selectedWork.expectedDate || "—"}</p></div>
                <div><p className="text-[10px] uppercase" style={{ color: inkMuted }}>Actual completion</p><p>{selectedWork.actualDate || "—"}</p></div>
              </div>

              {selectedWork.materials && <div className="mb-3"><p className="text-[10px] uppercase" style={{ color: inkMuted }}>Materials used</p><p className="text-sm">{selectedWork.materials}</p></div>}
              {selectedWork.remarks && <div className="mb-4"><p className="text-[10px] uppercase" style={{ color: inkMuted }}>Remarks</p><p className="text-sm">{selectedWork.remarks}</p></div>}

              <div>
                <div className="flex justify-between text-[11px] mb-1" style={{ color: inkMuted }}><span>Progress</span><span>{selectedWork.progress || 0}%</span></div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: lineColor }}>
                  <div className="h-full rounded-full" style={{ width: `${selectedWork.progress || 0}%`, background: stampPurple }} />
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={() => openEditWorkModal(selectedWork)} className="flex-1 font-semibold py-2.5 rounded text-sm" style={{ border: `1px solid ${lineColor}`, color: ink }}>Edit</button>
                <button onClick={() => handleDeleteWork(selectedWork.id)} className="px-4 py-2.5 rounded" style={{ border: `1px solid ${stampRed}55`, color: stampRed }}><Trash2 size={16} /></button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Work item create/edit modal */}
        {showWorkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="rounded w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" style={{ background: paperLight, border: `1px solid ${lineColor}` }}
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: lineColor }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: display }}>{editingWorkId ? "Edit work item" : "New work item"}</h3>
                <button onClick={() => setShowWorkModal(false)} style={{ color: inkMuted }}><X size={20} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Title</label>
                  <input value={workForm.title} onChange={e => setWorkForm({ ...workForm, title: e.target.value })} placeholder="e.g. Sewage line cleaning — B wing" className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Description</label>
                  <textarea value={workForm.description} onChange={e => setWorkForm({ ...workForm, description: e.target.value })} rows={2} className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Category</label>
                    <select value={workForm.category} onChange={e => setWorkForm({ ...workForm, category: e.target.value })} className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }}>
                      {WORK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Priority</label>
                    <select value={workForm.priority} onChange={e => setWorkForm({ ...workForm, priority: e.target.value as "Low" | "Medium" | "High" })} className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }}>
                      <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Assigned to</label>
                    <input value={workForm.assignedTo} onChange={e => setWorkForm({ ...workForm, assignedTo: e.target.value })} placeholder="Worker / contractor name" className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Worker phone</label>
                    <input value={workForm.workerPhone} onChange={e => setWorkForm({ ...workForm, workerPhone: e.target.value })} className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper, fontFamily: mono }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Estimated cost (₹)</label>
                    <input type="number" value={workForm.estimatedCost} onChange={e => setWorkForm({ ...workForm, estimatedCost: e.target.value })} className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper, fontFamily: mono }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Final cost (₹)</label>
                    <input type="number" value={workForm.finalCost} onChange={e => setWorkForm({ ...workForm, finalCost: e.target.value })} className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper, fontFamily: mono }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Start date</label>
                    <input type="date" value={workForm.startDate} onChange={e => setWorkForm({ ...workForm, startDate: e.target.value })} className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Expected</label>
                    <input type="date" value={workForm.expectedDate} onChange={e => setWorkForm({ ...workForm, expectedDate: e.target.value })} className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Actual</label>
                    <input type="date" value={workForm.actualDate} onChange={e => setWorkForm({ ...workForm, actualDate: e.target.value })} className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Materials used</label>
                  <input value={workForm.materials} onChange={e => setWorkForm({ ...workForm, materials: e.target.value })} className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Progress (%)</label>
                  <input type="number" min="0" max="100" value={workForm.progress} onChange={e => setWorkForm({ ...workForm, progress: e.target.value })} className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper, fontFamily: mono }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: inkMuted }}>Remarks</label>
                  <textarea value={workForm.remarks} onChange={e => setWorkForm({ ...workForm, remarks: e.target.value })} rows={2} className="w-full p-2.5 rounded mt-1 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                </div>
                <button onClick={handleSaveWork} className="w-full font-semibold py-3 rounded mt-1 text-white" style={{ background: stampPurple }}>{editingWorkId ? "Save changes" : "Add to register"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* CALENDAR + REMINDERS */}
        {activeNav === "calendar" && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded p-5" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="px-2 py-1 rounded" style={{ border: `1px solid ${lineColor}` }}>‹</button>
                  <h3 className="text-base font-semibold w-40 text-center" style={{ fontFamily: display }}>{monthLabel}</h3>
                  <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="px-2 py-1 rounded" style={{ border: `1px solid ${lineColor}` }}>›</button>
                </div>
                <button onClick={() => { setEventForm({ ...emptyEventForm, date: selectedDate || todayStr }); setShowEventModal(true); }} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded text-white" style={{ background: stampPurple }}>
                  <Plus size={14} />Add event
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <p key={d} className="text-[10px] font-semibold uppercase text-center" style={{ color: inkMuted, fontFamily: mono }}>{d}</p>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map(({ dateStr, inMonth }) => {
                  const dayEvents = eventsOn(dateStr);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className="aspect-square rounded p-1 text-left overflow-hidden"
                      style={{
                        background: isSelected ? `${stampPurple}14` : paper,
                        border: `1px solid ${isToday ? stampPurple : lineColor}`,
                        opacity: inMonth ? 1 : 0.4,
                      }}
                    >
                      <span className="text-[11px]" style={{ fontFamily: mono, color: isToday ? stampPurple : ink, fontWeight: isToday ? 700 : 400 }}>{Number(dateStr.slice(8))}</span>
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map(e => <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: e.color }} />)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <div className="mt-5 pt-4 border-t" style={{ borderColor: lineColor }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: inkMuted }}>Events on {selectedDate}</p>
                  {eventsOn(selectedDate).length === 0 && <p className="text-sm" style={{ color: inkMuted }}>No events. Use "Add event" to schedule one.</p>}
                  <div className="space-y-2">
                    {eventsOn(selectedDate).map(e => (
                      <div key={e.id} className="flex items-center justify-between p-2.5 rounded" style={{ background: paper, border: `1px solid ${lineColor}` }}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{e.title}</p>
                            <p className="text-[11px]" style={{ color: inkMuted }}>{e.category}{e.startTime ? ` · ${e.startTime}${e.endTime ? "–" + e.endTime : ""}` : ""}{e.location ? ` · ${e.location}` : ""}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteEvent(e.id)} style={{ color: inkMuted }}><X size={15} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reminders panel */}
            <div className="rounded p-5" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ fontFamily: display }}>Reminders</h3>
                <button onClick={() => { setReminderForm(emptyReminderForm); setShowReminderModal(true); }} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded text-white" style={{ background: goldSeal }}>
                  <Plus size={13} />New
                </button>
              </div>
              <div className="space-y-2">
                {reminders.length === 0 && <p className="text-sm" style={{ color: inkMuted }}>No reminders set.</p>}
                {[...reminders].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map(r => (
                  <div key={r.id} className="p-2.5 rounded flex items-start justify-between gap-2" style={{ background: paper, border: `1px solid ${lineColor}` }}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-[11px]" style={{ color: inkMuted }}>{r.date} · {r.time}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-semibold uppercase" style={{ color: r.priority === "High" ? stampRed : r.priority === "Medium" ? goldSeal : stampPurple }}>{r.priority}</span>
                      <button onClick={() => handleDeleteReminder(r.id)} style={{ color: inkMuted }}><X size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add event modal */}
        {showEventModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }} className="rounded w-full max-w-md p-6" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: lineColor }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: display }}>Add event</h3>
                <button onClick={() => setShowEventModal(false)} style={{ color: inkMuted }}><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Event title" className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                <textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Description" rows={2} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                <div className="grid grid-cols-2 gap-3">
                  <select value={eventForm.category} onChange={e => setEventForm({ ...eventForm, category: e.target.value })} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }}>
                    {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} placeholder="Location" className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                  <input type="time" value={eventForm.startTime} onChange={e => setEventForm({ ...eventForm, startTime: e.target.value })} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                  <input type="time" value={eventForm.endTime} onChange={e => setEventForm({ ...eventForm, endTime: e.target.value })} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: inkMuted }}>Colour:</span>
                  {[stampPurple, stampRed, goldSeal, "#3E6B8A"].map(c => (
                    <button key={c} onClick={() => setEventForm({ ...eventForm, color: c })} className="w-6 h-6 rounded-full" style={{ background: c, border: eventForm.color === c ? `2px solid ${ink}` : "2px solid transparent" }} />
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={eventForm.recurring} onChange={e => setEventForm({ ...eventForm, recurring: e.target.checked })} />Recurring event</label>
                <button onClick={handleSaveEvent} className="w-full font-semibold py-3 rounded text-white" style={{ background: stampPurple }}>Save event</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Add reminder modal */}
        {showReminderModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }} className="rounded w-full max-w-sm p-6" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: lineColor }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: display }}>New reminder</h3>
                <button onClick={() => setShowReminderModal(false)} style={{ color: inkMuted }}><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <input value={reminderForm.title} onChange={e => setReminderForm({ ...reminderForm, title: e.target.value })} placeholder="Reminder title" className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                <textarea value={reminderForm.description} onChange={e => setReminderForm({ ...reminderForm, description: e.target.value })} placeholder="Description (optional)" rows={2} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={reminderForm.date} onChange={e => setReminderForm({ ...reminderForm, date: e.target.value })} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                  <input type="time" value={reminderForm.time} onChange={e => setReminderForm({ ...reminderForm, time: e.target.value })} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                </div>
                <select value={reminderForm.priority} onChange={e => setReminderForm({ ...reminderForm, priority: e.target.value as "Low" | "Medium" | "High" })} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }}>
                  <option value="Low">Low priority</option><option value="Medium">Medium priority</option><option value="High">High priority</option>
                </select>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reminderForm.recurring} onChange={e => setReminderForm({ ...reminderForm, recurring: e.target.checked })} />Repeats</label>
                <button onClick={handleSaveReminder} className="w-full font-semibold py-3 rounded text-white" style={{ background: goldSeal }}>Save reminder</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Due reminder popup */}
        {dueReminderPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed top-6 right-6 z-[80] w-80 rounded p-4" style={{ background: paperLight, border: `1px solid ${goldSeal}`, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
            <div className="flex items-start gap-2.5">
              <BellRing size={18} style={{ color: goldSeal }} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ fontFamily: display }}>{dueReminderPopup.title}</p>
                {dueReminderPopup.description && <p className="text-xs mt-1" style={{ color: inkMuted }}>{dueReminderPopup.description}</p>}
              </div>
              <button onClick={() => setDueReminderPopup(null)} style={{ color: inkMuted }}><X size={16} /></button>
            </div>
          </motion.div>
        )}

        {/* ACCOUNTING */}
        {activeNav === "accounting" && (
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: "Total collected", value: formatINR(totalCollected), icon: <Wallet size={17} />, color: stampPurple },
                { label: "From maintenance", value: formatINR(maintenanceCollections), icon: <Landmark size={17} />, color: goldSeal },
                { label: "From event funds", value: formatINR(eventCollections), icon: <ScrollText size={17} />, color: stampRed },
              ].map(stat => (
                <div key={stat.label} className="p-5 rounded" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
                  <div className="flex items-center gap-3 mb-1" style={{ color: stat.color }}>{stat.icon}<span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: inkMuted }}>{stat.label}</span></div>
                  <h3 className="text-xl font-semibold" style={{ fontFamily: mono }}>{stat.value}</h3>
                </div>
              ))}
            </div>

            <div className="rounded overflow-hidden" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: lineColor }}><h3 className="text-base font-semibold" style={{ fontFamily: display }}>Full ledger</h3></div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ background: paper }}>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: inkMuted }}>Flat</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: inkMuted }}>Purpose</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: inkMuted }}>Method</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: inkMuted }}>Amount</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: inkMuted }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, idx) => (
                    <tr key={p.id} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)" }}>
                      <td className="px-6 py-3.5 font-medium">{p.flat}</td>
                      <td className="px-6 py-3.5" style={{ color: inkMuted }}>{p.type === "Event" ? p.eventName : "Maintenance"}</td>
                      <td className="px-6 py-3.5" style={{ color: inkMuted }}>{p.method}</td>
                      <td className="px-6 py-3.5 font-semibold" style={{ color: stampPurple, fontFamily: mono }}>{formatINR(Number(p.amount))}</td>
                      <td className="px-6 py-3.5" style={{ color: inkMuted }}>{p.date}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center" style={{ color: inkMuted }}>No entries recorded yet</td></tr>}
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
                <div className="rounded p-8 text-center" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
                  <Video size={26} className="mx-auto mb-3" style={{ color: stampPurple }} />
                  <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: display }}>Host a society meeting</h3>
                  <p className="text-sm mb-5" style={{ color: inkMuted }}>Opens a live video room — no account or app download needed for members to join.</p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={handleStartMeeting} className="font-semibold px-6 py-2.5 rounded text-sm text-white" style={{ background: stampPurple }}>Start now</button>
                    <button onClick={() => setShowScheduleModal(true)} className="font-semibold px-6 py-2.5 rounded text-sm" style={{ border: `1px solid ${lineColor}`, color: ink }}>Schedule for later</button>
                  </div>
                </div>

                {scheduledMeetings.length > 0 && (
                  <div className="rounded overflow-hidden" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
                    <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: lineColor }}>
                      <CalendarDays size={15} style={{ color: inkMuted }} />
                      <h3 className="text-sm font-semibold" style={{ fontFamily: display }}>Upcoming meetings</h3>
                    </div>
                    <div className="divide-y" style={{ borderColor: lineColor }}>
                      {scheduledMeetings.map(m => (
                        <div key={m.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{m.title}</p>
                            <p className="text-[11px]" style={{ color: inkMuted }}>{m.date} · {m.time} · {m.mode}{m.venueOrLink ? ` · ${m.venueOrLink}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <button onClick={() => startScheduledMeeting(m)} className="text-xs font-semibold hover:underline" style={{ color: stampPurple }}>Start</button>
                            <button onClick={() => handleDeleteScheduled(m.id)} style={{ color: inkMuted }}><X size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {meetings.length > 0 && (
                  <div className="rounded overflow-hidden" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
                    <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: lineColor }}>
                      <Clock size={15} style={{ color: inkMuted }} />
                      <h3 className="text-sm font-semibold" style={{ fontFamily: display }}>Past meetings</h3>
                    </div>
                    <div className="divide-y" style={{ borderColor: lineColor }}>
                      {meetings.slice(0, 6).map(m => (
                        <div key={m.id} className="px-6 py-3.5 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium" style={{ fontFamily: mono }}>{m.roomName}</p>
                            <p className="text-[11px]" style={{ color: inkMuted }}>{new Date(m.startedAt).toLocaleString("en-IN")}</p>
                          </div>
                          <button onClick={() => setActiveRoom(m.roomName)} className="text-xs font-semibold hover:underline" style={{ color: stampPurple }}>Rejoin</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded overflow-hidden" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
                <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: lineColor }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: stampRed }} />
                    <span className="text-sm font-medium" style={{ fontFamily: mono }}>{activeRoom}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleCopyLink(activeRoom)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded" style={{ border: `1px solid ${lineColor}`, color: ink }}>
                      <Copy size={13} />{copiedLink ? "Copied!" : "Copy link"}
                    </button>
                    <button onClick={() => setActiveRoom(null)} className="text-xs font-semibold px-3 py-1.5 rounded text-white" style={{ background: stampRed }}>End</button>
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

        {/* Schedule meeting modal */}
        {showScheduleModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }} className="rounded w-full max-w-md p-6" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: lineColor }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: display }}>Schedule a meeting</h3>
                <button onClick={() => setShowScheduleModal(false)} style={{ color: inkMuted }}><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <input value={scheduleForm.title} onChange={e => setScheduleForm({ ...scheduleForm, title: e.target.value })} placeholder="Meeting title" className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                <textarea value={scheduleForm.agenda} onChange={e => setScheduleForm({ ...scheduleForm, agenda: e.target.value })} placeholder="Agenda" rows={2} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={scheduleForm.date} onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                  <input type="time" value={scheduleForm.time} onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={scheduleForm.mode} onChange={e => setScheduleForm({ ...scheduleForm, mode: e.target.value as "Online" | "Offline" })} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }}>
                    <option value="Online">Online</option><option value="Offline">Offline</option>
                  </select>
                  <input value={scheduleForm.venueOrLink} onChange={e => setScheduleForm({ ...scheduleForm, venueOrLink: e.target.value })} placeholder={scheduleForm.mode === "Online" ? "Meeting link" : "Venue"} className="w-full p-2.5 rounded text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                </div>
                <p className="text-[11px]" style={{ color: inkMuted }}>All society members will see this under Notifications when the meeting date arrives.</p>
                <button onClick={handleScheduleMeeting} className="w-full font-semibold py-3 rounded text-white" style={{ background: stampPurple }}>Schedule meeting</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* CCTV */}
        {activeNav === "cctv" && (
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="rounded p-5 flex flex-wrap items-center justify-between gap-3" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              <div>
                <h3 className="text-base font-semibold" style={{ fontFamily: display }}>Surveillance Wall</h3>
                <p className="text-xs mt-0.5" style={{ color: inkMuted }}>
                  {feedStream ? `${CAMERAS.length} of ${CAMERAS.length} cameras online` : "Cameras offline — enable the feed to start monitoring"}
                </p>
              </div>
              {!feedStream ? (
                <button onClick={enableFeed} className="font-semibold px-5 py-2.5 rounded text-sm text-white" style={{ background: stampPurple }}>Enable live feed</button>
              ) : (
                <button onClick={disableFeed} className="font-semibold px-5 py-2.5 rounded text-sm" style={{ border: `1px solid ${stampRed}`, color: stampRed }}>Disable feed</button>
              )}
            </div>

            {camError && <div className="text-sm px-4 py-3 rounded" style={{ background: `${stampRed}14`, color: stampRed }}>{camError}</div>}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CAMERAS.map(cam => (
                <CameraTile key={cam.id} name={cam.name} stream={feedStream} tick={clockTick} onClick={() => feedStream && setExpandedCam(cam.name)} />
              ))}
            </div>

            <p className="text-[11px]" style={{ color: inkMuted }}>
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
            <div className="p-6 rounded flex flex-wrap md:flex-nowrap gap-4 items-end" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: inkMuted }}>Event / fund name</label>
                <input type="text" placeholder="e.g. Ganesh Chaturthi" value={newFund.eventName} onChange={e => setNewFund({ ...newFund, eventName: e.target.value })} className="w-full p-2.5 rounded mt-1.5 focus:outline-none text-sm" style={{ border: `1px solid ${lineColor}`, background: paper }} />
              </div>
              <div className="w-full md:w-32">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: inkMuted }}>Amount (₹)</label>
                <input type="number" placeholder="500" value={newFund.amount} onChange={e => setNewFund({ ...newFund, amount: e.target.value })} className="w-full p-2.5 rounded mt-1.5 focus:outline-none text-sm" style={{ border: `1px solid ${lineColor}`, background: paper, fontFamily: mono }} />
              </div>
              <div className="w-full md:w-44">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: inkMuted }}>Due date</label>
                <input type="date" value={newFund.dueDate} onChange={e => setNewFund({ ...newFund, dueDate: e.target.value })} className="w-full p-2.5 rounded mt-1.5 focus:outline-none text-sm" style={{ border: `1px solid ${lineColor}`, background: paper }} />
              </div>
              <button onClick={handleCreateFund} className="w-full md:w-auto font-semibold px-6 py-2.5 rounded text-white" style={{ background: stampPurple }}>Raise fund</button>
            </div>

            <div className="rounded overflow-hidden" style={{ background: paperLight, border: `1px solid ${lineColor}` }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: lineColor }}><h3 className="text-base font-semibold" style={{ fontFamily: display }}>Active funds</h3></div>
              <div className="divide-y" style={{ borderColor: lineColor }}>
                {funds.map(f => (
                  <div key={f.id} className="px-6 py-4 flex items-center justify-between">
                    <div><p className="font-medium text-sm">{f.eventName}</p><p className="text-xs" style={{ color: inkMuted }}>Due {f.dueDate}</p></div>
                    <p className="font-semibold" style={{ color: stampPurple, fontFamily: mono }}>{formatINR(f.amount)}</p>
                  </div>
                ))}
                {funds.length === 0 && <div className="px-6 py-8 text-center text-sm" style={{ color: inkMuted }}>No funds raised yet</div>}
              </div>
            </div>
          </div>
        )}

        {/* Flat detail modal */}
        {selectedFlat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedFlat(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="rounded w-full max-w-md p-6" style={{ background: paperLight, border: `1px solid ${lineColor}` }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b" style={{ borderColor: lineColor }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: display }}>Flat {selectedFlat}</h3>
                <button onClick={() => setSelectedFlat(null)} style={{ color: inkMuted }}><X size={20} /></button>
              </div>
              <div className="mb-4">
                <StampBadge label={statusLabel[flatStatus(selectedFlat)]} tone={flatStatus(selectedFlat) === "clear" ? "resolved" : "pending"} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: inkMuted }}>Complaints</p>
              <div className="space-y-2 mb-4">
                {complaints.filter(c => c.flat === selectedFlat).length === 0 && <p className="text-sm" style={{ color: inkMuted }}>None on record.</p>}
                {complaints.filter(c => c.flat === selectedFlat).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-3">{c.issue}</span>
                    <StampBadge label={c.status} tone={c.status === "Resolved" ? "resolved" : "pending"} />
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: inkMuted }}>Payments this cycle</p>
              <div className="space-y-1.5">
                {payments.filter(p => p.flat === selectedFlat).length === 0 && <p className="text-sm" style={{ color: inkMuted }}>No payments recorded.</p>}
                {payments.filter(p => p.flat === selectedFlat).slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.type === "Event" ? p.eventName : "Maintenance"}</span>
                    <span style={{ fontFamily: mono, color: stampPurple }}>{formatINR(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Notice modal */}
        {showNoticeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="rounded w-full max-w-md p-6" style={{ background: paperLight, border: `1px solid ${lineColor}` }}
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor: lineColor }}>
                <h3 className="text-lg font-semibold" style={{ fontFamily: display }}>Post a new notice</h3>
                <button onClick={() => setShowNoticeModal(false)} style={{ color: inkMuted }}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: inkMuted }}>Title</label>
                  <input type="text" placeholder="e.g. Water supply interruption" value={newNotice.title} onChange={e => setNewNotice({ ...newNotice, title: e.target.value })} className="w-full p-2.5 rounded mt-1.5 text-sm focus:outline-none" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: inkMuted }}>Description</label>
                  <textarea placeholder="Write the details here..." value={newNotice.subtitle} onChange={e => setNewNotice({ ...newNotice, subtitle: e.target.value })} className="w-full p-2.5 rounded mt-1.5 text-sm focus:outline-none min-h-[100px]" style={{ border: `1px solid ${lineColor}`, background: paper }} />
                </div>
                <label className="flex items-center gap-2.5 p-3 rounded cursor-pointer" style={{ background: `${stampRed}0D`, border: `1px solid ${stampRed}33` }}>
                  <input type="checkbox" checked={newNotice.urgent} onChange={e => setNewNotice({ ...newNotice, urgent: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm font-semibold" style={{ color: stampRed }}>Mark as urgent</span>
                </label>
                <button onClick={handleCreateNotice} className="w-full font-semibold py-3 rounded mt-2 text-white" style={{ background: stampPurple }}>Publish to society</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}