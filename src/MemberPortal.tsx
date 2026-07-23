import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, query, where, doc, setDoc } from "firebase/firestore";
import {
  Home, Megaphone, Landmark, MessageSquareWarning, UserCircle2, Bell, X,
  ChevronRight, Camera, Phone, CheckCircle2, Clock,
} from "lucide-react";

/**
 * Shares the "registrar's ledger" design tokens with AdminDashboard.tsx —
 * deep ink-green + brass gold, Plex Serif/Sans/Mono, dashed stamp badges.
 *
 * Fonts (same link as the admin side, add once to index.html <head>):
 *   <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
 *
 * Notes for a real (non-demo) build:
 * - True mobile push needs Firebase Cloud Messaging (service worker + VAPID
 *   key + a Cloud Function to send on notice creation). What's here uses the
 *   browser Notification API as a stand-in — it works while the site/PWA is
 *   open or backgrounded in a supporting browser, not a true background push.
 * - The profile photo is stored as a base64 data URL in Firestore for
 *   simplicity. In production, upload the file to Firebase Storage and
 *   store the download URL instead — Firestore documents have a 1MB cap.
 */
const SOCIETY_NAME = "New Shrushti CHS";
const MAINTENANCE_AMOUNT = 2500;

const CONTACTS = [
  { role: "Society Secretary", phone: "+91 98200 00000" },
  { role: "Watchman", phone: "+91 90000 11111" },
  { role: "Plumber (on-call)", phone: "+91 90000 22222" },
];

type Notice = { id: string; number: string; title: string; subtitle: string; time: string; urgent: boolean; createdAt?: number };
type Complaint = { id: string; flat: string; issue: string; status: "Pending" | "Resolved"; date: string; createdAt?: number };
type Payment = {
  id: string; member: string; flat: string; amount: number; date: string; method: string;
  type: "Event" | "Maintenance"; eventName: string; fundId?: string; monthLabel?: string;
  transactionId: string; createdAt?: number;
};
type CustomFund = { id: string; eventName: string; amount: number; dueDate: string; createdAt: number };
type MemberProfile = { name: string; phone: string; flat: string; photoDataUrl?: string };

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

function StatusStamp({ status }: { status: "Pending" | "Resolved" }) {
  const color = status === "Resolved" ? "#2F5233" : "#8B3A3A";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{ color, border: `1.5px dashed ${color}`, transform: "rotate(-2deg)", fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {status === "Resolved" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
      {status}
    </span>
  );
}

const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "notices", label: "Notices", icon: Megaphone },
  { id: "payments", label: "Payments", icon: Landmark },
  { id: "complaints", label: "Complaints", icon: MessageSquareWarning },
  { id: "profile", label: "Profile", icon: UserCircle2 },
] as const;
type TabId = typeof TABS[number]["id"];

export default function MemberPortal() {
  const flatNumber = "A-102"; // demo user — will come from the login system later

  const [activeTab, setActiveTab] = useState<TabId>("home");

  const [notices, setNotices] = useState<Notice[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [funds, setFunds] = useState<CustomFund[]>([]);

  const [popupNotice, setPopupNotice] = useState<Notice | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const firstLoadRef = useRef(true);
  const lastSeenRef = useRef<number>(Number(localStorage.getItem("lastSeenNoticeTs") || 0));
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const [complaintText, setComplaintText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [paymentStage, setPaymentStage] = useState<"idle" | "processing" | "success">("idle");
  const [receiptData, setReceiptData] = useState<Payment | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Payment | null>(null);

  const [profile, setProfile] = useState<MemberProfile>({ name: "Rahul Tiwari", phone: "+91 90000 00000", flat: flatNumber, photoDataUrl: "" });
  const [draftProfile, setDraftProfile] = useState<MemberProfile>(profile);
  const [editingProfile, setEditingProfile] = useState(false);

  // Notices — live feed + popup for new arrivals + browser notification
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "notices"), (snapshot) => {
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Notice))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotices(list);

      if (list.length > 0) {
        const newest = list[0];
        if (!firstLoadRef.current && (newest.createdAt || 0) > lastSeenRef.current) {
          setPopupNotice(newest);
          setUnreadCount(c => c + 1);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(newest.urgent ? `Urgent — ${newest.title}` : newest.title, { body: newest.subtitle });
          }
        }
        if (firstLoadRef.current) {
          lastSeenRef.current = newest.createdAt || Date.now();
          localStorage.setItem("lastSeenNoticeTs", String(lastSeenRef.current));
        }
      }
      firstLoadRef.current = false;
    });
    return unsub;
  }, []);

  // Complaints raised by this flat
  useEffect(() => {
    const q = query(collection(db, "complaints"), where("flat", "==", flatNumber));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Complaint))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setComplaints(list);
    });
    return unsub;
  }, []);

  // Payments made by this flat
  useEffect(() => {
    const q = query(collection(db, "payments"), where("flat", "==", flatNumber));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setPayments(list);
    });
    return unsub;
  }, []);

  // Event funds raised society-wide
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "custom_funds"), (snapshot) => {
      setFunds(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomFund)));
    });
    return unsub;
  }, []);

  // Profile
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "members", flatNumber), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as MemberProfile;
        setProfile(prev => ({ ...prev, ...data }));
        setDraftProfile(prev => (editingProfile ? prev : { ...prev, ...data }));
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNoticesTab = () => {
    setActiveTab("notices");
    setUnreadCount(0);
    if (notices[0]) {
      lastSeenRef.current = notices[0].createdAt || Date.now();
      localStorage.setItem("lastSeenNoticeTs", String(lastSeenRef.current));
    }
  };

  const requestNotifications = () => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setNotifPermission);
  };

  const currentMonthLabel = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const maintenancePaid = payments.some(p => p.type === "Maintenance" && p.monthLabel === currentMonthLabel);
  const unpaidFunds = funds.filter(f => !payments.some(p => p.fundId === f.id));

  const handlePayment = async (item: { id?: string; amount: number; eventName: string }, type: "Event" | "Maintenance") => {
    setPaymentStage("processing");
    try {
      const currentDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      const transactionId = "TXN" + Math.floor(Math.random() * 100000000);
      const paymentRecord: any = {
        member: profile.name, flat: flatNumber, amount: item.amount, date: currentDate,
        method: "UPI", type, eventName: item.eventName, createdAt: Date.now(), transactionId,
      };
      if (type === "Event") paymentRecord.fundId = item.id;
      if (type === "Maintenance") paymentRecord.monthLabel = currentMonthLabel;

      await addDoc(collection(db, "payments"), paymentRecord);
      setReceiptData(paymentRecord);
      setTimeout(() => setPaymentStage("success"), 1200);
    } catch (e) {
      alert("Payment failed. Please try again.");
      setPaymentStage("idle");
    }
  };

  const handleComplaint = async () => {
    if (!complaintText.trim()) return alert("Please describe your issue!");
    setIsSending(true);
    try {
      await addDoc(collection(db, "complaints"), {
        flat: flatNumber, issue: complaintText, status: "Pending",
        date: new Date().toLocaleDateString("en-IN"), createdAt: Date.now(),
      });
      setComplaintText("");
      alert("Complaint logged with the admin.");
    } catch (e) {
      alert("Failed to send complaint");
    } finally {
      setIsSending(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraftProfile(prev => ({ ...prev, photoDataUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    await setDoc(doc(db, "members", flatNumber), draftProfile, { merge: true });
    setProfile(draftProfile);
    setEditingProfile(false);
  };

  const ink = "#1E2A22", forest = "#2F5233", gold = "#B4872A", maroon = "#8B3A3A", muted = "#8B8168", line = "#DED7C2";
  const serif = "'IBM Plex Serif', serif", mono = "'IBM Plex Mono', monospace";

  return (
    <div className="w-full max-w-md mx-auto min-h-screen relative" style={{ background: "#F7F4EC", fontFamily: "'IBM Plex Sans', sans-serif", color: ink }}>
      {/* Header */}
      <div
        className="px-6 pt-8 pb-7 rounded-b-3xl text-center relative overflow-hidden"
        style={{ background: ink, backgroundImage: "repeating-linear-gradient(180deg, rgba(180,135,42,0.06) 0px, rgba(180,135,42,0.06) 1px, transparent 1px, transparent 30px)" }}
      >
        <button
          onClick={openNoticesTab}
          className="absolute top-6 right-5 p-2 rounded-full"
          style={{ color: "#B7C4BB" }}
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
              style={{ background: maroon }}
            >
              {unreadCount}
            </span>
          )}
        </button>
        <div className="w-11 h-11 rounded-full mx-auto mb-3 flex items-center justify-center border-2 text-sm font-semibold" style={{ borderColor: gold, color: gold, fontFamily: mono }}>
          NS
        </div>
        <h1 className="text-xl font-semibold tracking-wide" style={{ color: "#F7F4EC", fontFamily: serif }}>{SOCIETY_NAME}</h1>
        <p className="text-xs uppercase tracking-[0.16em] mt-1" style={{ color: "#8FA396" }}>Member Portal</p>
      </div>

      <div className="px-5 pt-6 pb-24">
        {/* Notification opt-in banner */}
        {notifPermission === "default" && (
          <div className="mb-5 rounded-xl p-3.5 flex items-center gap-3 border" style={{ background: "#B4872A14", borderColor: "#B4872A44" }}>
            <Bell size={16} style={{ color: gold }} />
            <p className="text-xs flex-1" style={{ color: ink }}>Turn on alerts for new society notices.</p>
            <button onClick={requestNotifications} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: gold }}>Enable</button>
          </div>
        )}

        {/* HOME */}
        {activeTab === "home" && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-5 border flex items-center gap-4" style={{ borderColor: line }}>
              {profile.photoDataUrl ? (
                <img src={profile.photoDataUrl} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-semibold" style={{ background: "#2F523314", color: forest, fontFamily: mono }}>
                  {profile.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
              )}
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wide" style={{ color: muted }}>Welcome back</p>
                <h2 className="text-base font-semibold" style={{ fontFamily: serif }}>{profile.name}</h2>
              </div>
              <div className="px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: "#2F523314", color: forest, fontFamily: mono }}>{flatNumber}</div>
            </div>

            {/* Latest notice preview */}
            {notices[0] && (
              <button onClick={openNoticesTab} className="text-left bg-white rounded-2xl p-4 border flex items-center gap-3" style={{ borderColor: notices[0].urgent ? "#8B3A3A55" : line }}>
                <Megaphone size={18} style={{ color: notices[0].urgent ? maroon : forest }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{notices[0].title}</p>
                  <p className="text-[11px]" style={{ color: muted }}>{notices[0].time}</p>
                </div>
                <ChevronRight size={16} style={{ color: muted }} />
              </button>
            )}

            {/* Maintenance due */}
            <div className="bg-white rounded-2xl p-5 border relative" style={{ borderColor: maintenancePaid ? "#2F523340" : "#8B3A3A55" }}>
              {!maintenancePaid && (
                <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full" style={{ color: maroon, border: `1.5px dashed ${maroon}`, transform: "rotate(-2deg)", fontFamily: mono }}>Due</span>
              )}
              <h3 className="font-semibold text-base pr-16" style={{ fontFamily: serif }}>Monthly maintenance</h3>
              <p className="text-sm mt-1" style={{ color: muted }}>{currentMonthLabel}</p>
              <div className="flex justify-between items-center mt-4">
                <span className="text-xl font-semibold" style={{ color: maintenancePaid ? forest : maroon, fontFamily: mono }}>{formatINR(MAINTENANCE_AMOUNT)}</span>
                {maintenancePaid ? (
                  <StatusStamp status="Resolved" />
                ) : (
                  <button onClick={() => handlePayment({ amount: MAINTENANCE_AMOUNT, eventName: "Monthly Maintenance" }, "Maintenance")} className="text-white font-semibold py-2 px-5 rounded-lg hover:opacity-90" style={{ background: maroon }}>Pay now</button>
                )}
              </div>
            </div>

            {/* Event dues */}
            {unpaidFunds.map((fund, i) => (
              <motion.div
                key={fund.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                className="bg-white rounded-2xl p-5 border relative" style={{ borderColor: "#8B3A3A55" }}
              >
                <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full" style={{ color: maroon, border: `1.5px dashed ${maroon}`, transform: "rotate(-2deg)", fontFamily: mono }}>Due</span>
                <h3 className="font-semibold text-base pr-16" style={{ fontFamily: serif }}>{fund.eventName}</h3>
                <p className="text-sm mt-1" style={{ color: muted }}>Due date: <span className="font-medium" style={{ color: ink }}>{fund.dueDate}</span></p>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-xl font-semibold" style={{ color: maroon, fontFamily: mono }}>{formatINR(fund.amount)}</span>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => handlePayment(fund, "Event")} className="text-white font-semibold py-2 px-5 rounded-lg" style={{ background: maroon }}>Pay now</motion.button>
                </div>
              </motion.div>
            ))}

            {/* Quick complaint access */}
            <button onClick={() => setActiveTab("complaints")} className="bg-white rounded-2xl p-4 border flex items-center gap-3 text-left" style={{ borderColor: line }}>
              <MessageSquareWarning size={18} style={{ color: forest }} />
              <span className="flex-1 text-sm font-medium">Raise or track a complaint</span>
              <ChevronRight size={16} style={{ color: muted }} />
            </button>

            {/* Important contacts */}
            <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: line }}>
              <h3 className="font-semibold mb-3 text-sm" style={{ fontFamily: serif }}>Important contacts</h3>
              <div className="space-y-2.5">
                {CONTACTS.map(c => (
                  <a key={c.role} href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex items-center justify-between text-sm">
                    <span style={{ color: ink }}>{c.role}</span>
                    <span className="flex items-center gap-1.5" style={{ color: forest, fontFamily: mono }}><Phone size={13} />{c.phone}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* NOTICES */}
        {activeTab === "notices" && (
          <div className="flex flex-col gap-3">
            {notices.length === 0 && <p className="text-center text-sm py-10" style={{ color: muted }}>No notices yet.</p>}
            {notices.map(n => (
              <div key={n.id} className="bg-white rounded-xl p-4 border" style={{ borderColor: n.urgent ? "#8B3A3A55" : line }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: n.urgent ? "#8B3A3A14" : "#2F523314", color: n.urgent ? maroon : forest, fontFamily: mono }}>
                    {n.urgent ? "Urgent" : "Notice"} #{n.number}
                  </span>
                  <span className="text-[11px]" style={{ color: muted }}>{n.time}</span>
                </div>
                <h3 className="font-semibold text-sm" style={{ fontFamily: serif }}>{n.title}</h3>
                <p className="text-sm mt-1" style={{ color: "#4A5850" }}>{n.subtitle}</p>
              </div>
            ))}
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === "payments" && (
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: line }}>
              <div className="px-5 py-3.5 border-b" style={{ borderColor: line }}>
                <h3 className="text-sm font-semibold" style={{ fontFamily: serif }}>Payment history</h3>
              </div>
              {payments.length === 0 && <p className="text-center text-sm py-8" style={{ color: muted }}>No payments recorded yet.</p>}
              <div className="divide-y" style={{ borderColor: "#F1EDDD" }}>
                {payments.map(p => (
                  <button key={p.id} onClick={() => setViewingReceipt(p)} className="w-full flex items-center justify-between px-5 py-3.5 text-left">
                    <div>
                      <p className="text-sm font-medium">{p.eventName}</p>
                      <p className="text-[11px]" style={{ color: muted }}>{p.date} &middot; {p.method}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: forest, fontFamily: mono }}>{formatINR(p.amount)}</span>
                      <ChevronRight size={14} style={{ color: muted }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* COMPLAINTS */}
        {activeTab === "complaints" && (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: line }}>
              <h3 className="font-semibold mb-3 text-sm" style={{ fontFamily: serif }}>Raise a complaint</h3>
              <textarea
                value={complaintText} onChange={e => setComplaintText(e.target.value)}
                className="w-full rounded-xl p-3 text-sm mb-3 focus:outline-none" style={{ border: `1px solid ${line}`, background: "#F7F4EC" }}
                placeholder="E.g. Lift is not working on 2nd floor..." rows={3}
              />
              <button onClick={handleComplaint} disabled={isSending} className="w-full text-white font-semibold py-3 px-4 rounded-xl disabled:opacity-50 hover:opacity-90" style={{ background: forest }}>
                {isSending ? "Submitting..." : "Submit complaint"}
              </button>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: line }}>
              <div className="px-5 py-3.5 border-b" style={{ borderColor: line }}>
                <h3 className="text-sm font-semibold" style={{ fontFamily: serif }}>My complaints</h3>
              </div>
              {complaints.length === 0 && <p className="text-center text-sm py-8" style={{ color: muted }}>No complaints raised yet.</p>}
              <div className="divide-y" style={{ borderColor: "#F1EDDD" }}>
                {complaints.map(c => (
                  <div key={c.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{c.issue}</p>
                      <p className="text-[11px]" style={{ color: muted }}>{c.date}</p>
                    </div>
                    <StatusStamp status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PROFILE */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: line }}>
            <div className="flex flex-col items-center mb-5">
              <div className="relative">
                {draftProfile.photoDataUrl ? (
                  <img src={draftProfile.photoDataUrl} className="w-20 h-20 rounded-full object-cover border-2" style={{ borderColor: gold }} />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-semibold border-2" style={{ borderColor: gold, color: gold, fontFamily: mono }}>
                    {draftProfile.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </div>
                )}
                {editingProfile && (
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white cursor-pointer" style={{ background: forest }}>
                    <Camera size={13} />
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: muted }}>Name</label>
                {editingProfile ? (
                  <input value={draftProfile.name} onChange={e => setDraftProfile({ ...draftProfile, name: e.target.value })} className="w-full p-2.5 rounded-lg mt-1 text-sm" style={{ border: `1px solid ${line}` }} />
                ) : (
                  <p className="text-sm mt-1 font-medium">{profile.name}</p>
                )}
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: muted }}>Phone number</label>
                {editingProfile ? (
                  <input value={draftProfile.phone} onChange={e => setDraftProfile({ ...draftProfile, phone: e.target.value })} className="w-full p-2.5 rounded-lg mt-1 text-sm" style={{ border: `1px solid ${line}`, fontFamily: mono }} />
                ) : (
                  <p className="text-sm mt-1 font-medium" style={{ fontFamily: mono }}>{profile.phone}</p>
                )}
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: muted }}>Flat number</label>
                <p className="text-sm mt-1 font-medium" style={{ fontFamily: mono }}>{flatNumber}</p>
                <p className="text-[11px] mt-0.5" style={{ color: muted }}>Contact the admin to change your registered flat.</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              {editingProfile ? (
                <>
                  <button onClick={() => { setDraftProfile(profile); setEditingProfile(false); }} className="flex-1 font-semibold py-2.5 rounded-lg text-sm" style={{ border: `1px solid ${line}`, color: ink }}>Cancel</button>
                  <button onClick={handleSaveProfile} className="flex-1 text-white font-semibold py-2.5 rounded-lg text-sm hover:opacity-90" style={{ background: forest }}>Save changes</button>
                </>
              ) : (
                <button onClick={() => setEditingProfile(true)} className="w-full text-white font-semibold py-2.5 rounded-lg text-sm hover:opacity-90" style={{ background: ink }}>Edit profile</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex" style={{ borderColor: line }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => (tab.id === "notices" ? openNoticesTab() : setActiveTab(tab.id))}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 relative"
              style={{ color: active ? forest : muted }}
            >
              {active && (
                <motion.span
                  layoutId="bottomnav-active"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: forest }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <motion.span animate={{ scale: active ? 1.1 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                <Icon size={19} strokeWidth={active ? 2.4 : 2} />
              </motion.span>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.id === "notices" && unreadCount > 0 && (
                <span className="absolute top-1.5 right-[27%] w-1.5 h-1.5 rounded-full" style={{ background: maroon }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Notice popup */}
      {popupNotice && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-end justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <Bell size={16} style={{ color: popupNotice.urgent ? maroon : forest }} />
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: popupNotice.urgent ? maroon : forest, fontFamily: mono }}>
                  {popupNotice.urgent ? "Urgent notice" : "New notice"}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: serif }}>{popupNotice.title}</h3>
              <p className="text-sm mb-5" style={{ color: "#4A5850" }}>{popupNotice.subtitle}</p>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPopupNotice(null)} className="w-full text-white font-semibold py-3 rounded-xl" style={{ background: ink }}>Got it</motion.button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Payment processing / success overlay */}
      {paymentStage !== "idle" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6">
            {paymentStage === "processing" && (
              <div className="py-8 flex flex-col items-center">
                <div className="w-11 h-11 rounded-full animate-spin mb-4" style={{ border: `4px solid ${line}`, borderTopColor: forest }} />
                <h2 className="text-base font-semibold" style={{ fontFamily: serif }}>Processing payment...</h2>
                <p className="text-xs mt-1.5" style={{ color: muted }}>Please do not close this window</p>
              </div>
            )}
            {paymentStage === "success" && receiptData && (
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-4 border-2"
                  style={{ borderColor: forest, color: forest }}
                >
                  ✓
                </motion.div>
                <h2 className="text-lg font-semibold mb-5" style={{ fontFamily: serif }}>Payment recorded</h2>
                <ReceiptSlip data={receiptData} tokens={{ ink, forest, gold, muted, line, serif, mono }} />
                <button onClick={() => { setPaymentStage("idle"); setReceiptData(null); }} className="w-full text-white font-semibold py-3 rounded-xl mt-6 hover:opacity-90" style={{ background: ink }}>Back to home</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Past receipt viewer */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setViewingReceipt(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold" style={{ fontFamily: serif }}>Receipt</h2>
              <button onClick={() => setViewingReceipt(null)}><X size={18} style={{ color: muted }} /></button>
            </div>
            <ReceiptSlip data={viewingReceipt} tokens={{ ink, forest, gold, muted, line, serif, mono }} />
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptSlip({ data, tokens }: { data: Payment; tokens: any }) {
  const { forest, muted, mono } = tokens;
  return (
    <div className="w-full bg-white rounded-xl p-6" style={{ border: `1.5px dashed ${tokens.gold}` }}>
      <div className="text-center text-xs font-semibold tracking-[0.2em] mb-4 pb-3 border-b" style={{ color: muted, borderColor: "#EFEAD8" }}>PAYMENT RECEIPT</div>
      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between"><span style={{ color: muted }}>Name</span><strong>{data.member}</strong></div>
        <div className="flex justify-between"><span style={{ color: muted }}>Flat</span><strong>{data.flat}</strong></div>
        <div className="flex justify-between"><span style={{ color: muted }}>Purpose</span><strong>{data.eventName}</strong></div>
        <div className="flex justify-between"><span style={{ color: muted }}>Date</span><strong>{data.date}</strong></div>
        <div className="flex justify-between items-start"><span style={{ color: muted }}>Txn ID</span><strong className="text-xs" style={{ fontFamily: mono }}>{data.transactionId}</strong></div>
        <div className="flex justify-between pt-3 mt-1 border-t" style={{ borderColor: "#EFEAD8" }}>
          <span className="font-semibold">Amount paid</span>
          <strong className="text-lg" style={{ color: forest, fontFamily: mono }}>{formatINR(data.amount)}</strong>
        </div>
      </div>
    </div>
  );
}