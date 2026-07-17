import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import {
  LayoutDashboard, Bell, Search, Megaphone, MessageSquareWarning, Wallet, Settings,
  ChevronRight, Plus, CheckCircle2, Clock, IndianRupee, Users, AlertTriangle, X, Menu, Circle, BadgeCheck, Video
} from "lucide-react";

// --- Types ---
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
  { id: "accounting", label: "Accounting", icon: <Wallet size={18} /> },
  { id: "meeting", label: "Meeting", icon: <Video size={18} /> },
  { id: "funds", label: "Custom Funds", icon: <BadgeCheck size={18} /> }, // New Tab
];

// Demo Flats - Replace with actual members logic later if needed
const ALL_FLATS = ["A-101", "A-102", "A-103", "B-101", "B-102"];

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- States for Firebase Data ---
  const [notices, setNotices] = useState<Notice[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [funds, setFunds] = useState<CustomFund[]>([]);

  // --- States for Creating Entries ---
  const [newFund, setNewFund] = useState({ eventName: "", amount: "", dueDate: "" });
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: "", subtitle: "", urgent: false });

  // --- Fetch Data from Firebase ---
  useEffect(() => {
    const qNotices = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsubNotices = onSnapshot(qNotices, (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));
    });

    const qComplaints = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const unsubComplaints = onSnapshot(qComplaints, (snapshot) => {
      setComplaints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint)));
    });

    const qPayments = query(collection(db, "payments"), orderBy("createdAt", "desc"));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });

    const qFunds = query(collection(db, "custom_funds"), orderBy("createdAt", "desc"));
    const unsubFunds = onSnapshot(qFunds, (snapshot) => {
      setFunds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomFund)));
    });

    return () => { unsubNotices(); unsubComplaints(); unsubPayments(); unsubFunds(); };
  }, []);

  // --- Handlers ---
  const handleComplaintStatusChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Pending" ? "Resolved" : "Pending";
    await updateDoc(doc(db, "complaints", id), { status: newStatus });
  };

  const handleCreateFund = async () => {
    if (!newFund.eventName || !newFund.amount || !newFund.dueDate) return alert("Please fill all fields");
    await addDoc(collection(db, "custom_funds"), {
      eventName: newFund.eventName,
      amount: Number(newFund.amount),
      dueDate: newFund.dueDate,
      createdAt: Date.now()
    });
    setNewFund({ eventName: "", amount: "", dueDate: "" });
    alert("Event/Fund Published to all members!");
  };

  const handleCreateNotice = async () => {
    if (!newNotice.title || !newNotice.subtitle) return alert("Please fill title and subtitle");
    await addDoc(collection(db, "notices"), {
      number: "N" + Math.floor(Math.random() * 1000),
      title: newNotice.title,
      subtitle: newNotice.subtitle,
      time: new Date().toLocaleDateString(),
      urgent: newNotice.urgent,
      createdAt: Date.now()
    });
    setNewNotice({ title: "", subtitle: "", urgent: false });
    setShowNoticeModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">AdminPanel</h1>
          <button className="md:hidden text-gray-500" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveNav(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeNav === item.id ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <button className="md:hidden text-gray-500" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
          <h2 className="text-2xl font-bold text-gray-800 capitalize">{activeNav.replace('-', ' ')}</h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </div>

        {/* VIEW: DASHBOARD */}
        {activeNav === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
                <div><p className="text-sm text-gray-500 font-medium">Total Flats</p><h3 className="text-2xl font-bold text-gray-800">{ALL_FLATS.length}</h3></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl"><MessageSquareWarning size={24} /></div>
                <div><p className="text-sm text-gray-500 font-medium">Pending Complaints</p><h3 className="text-2xl font-bold text-gray-800">{complaints.filter(c => c.status === "Pending").length}</h3></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Wallet size={24} /></div>
                <div><p className="text-sm text-gray-500 font-medium">Funds Collected</p><h3 className="text-2xl font-bold text-gray-800">₹{payments.reduce((acc, p) => acc + Number(p.amount), 0)}</h3></div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: CUSTOM FUNDS (New Feature) */}
        {activeNav === "funds" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-wrap md:flex-nowrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-semibold text-gray-600">Event/Fund Name</label>
                <input type="text" placeholder="e.g. Ganesh Chaturthi" value={newFund.eventName} onChange={e => setNewFund({...newFund, eventName: e.target.value})} className="w-full p-2 border rounded mt-1"/>
              </div>
              <div className="w-full md:w-32">
                <label className="text-sm font-semibold text-gray-600">Amount (₹)</label>
                <input type="number" placeholder="500" value={newFund.amount} onChange={e => setNewFund({...newFund, amount: e.target.value})} className="w-full p-2 border rounded mt-1"/>
              </div>
              <div className="w-full md:w-48">
                <label className="text-sm font-semibold text-gray-600">Due Date</label>
                <input type="date" value={newFund.dueDate} onChange={e => setNewFund({...newFund, dueDate: e.target.value})} className="w-full p-2 border rounded mt-1"/>
              </div>
              <button onClick={handleCreateFund} className="w-full md:w-auto bg-blue-600 text-white font-bold px-6 py-2 h-[42px] rounded hover:bg-blue-700">Raise Fund</button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {funds.map(fund => {
                const paidRecords = payments.filter(p => p.fundId === fund.id);
                const paidFlats = paidRecords.map(p => p.flat);
                const unpaidFlats = ALL_FLATS.filter(f => !paidFlats.includes(f));

                return (
                  <div key={fund.id} className="bg-white border rounded-xl p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 border-b pb-3 gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{fund.eventName}</h3>
                        <p className="text-sm text-gray-500">Target Amount: ₹{fund.amount} per flat | Due: {fund.dueDate}</p>
                      </div>
                      <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold text-center">
                        Total Collected: ₹{paidRecords.length * fund.amount}
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-8 mt-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-600 mb-3 flex items-center gap-2"><CheckCircle2 size={16}/> Paid ({paidFlats.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {paidFlats.length === 0 ? <span className="text-sm text-gray-400">No payments yet</span> : 
                            paidFlats.map((flat, i) => <span key={i} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded border border-green-200">{flat}</span>)
                          }
                        </div>
                      </div>
                      <div className="flex-1 md:border-l md:pl-8 pt-4 md:pt-0">
                        <h4 className="font-semibold text-red-600 mb-3 flex items-center gap-2"><AlertTriangle size={16}/> Unpaid ({unpaidFlats.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {unpaidFlats.map((flat, i) => <span key={i} className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded border border-red-100">{flat}</span>)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: COMPLAINTS */}
        {activeNav === "complaints" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-5xl mx-auto">
            <div className="p-6 border-b border-gray-100"><h3 className="text-lg font-bold text-gray-800">Recent Complaints</h3></div>
            <div className="divide-y divide-gray-100">
              {complaints.length === 0 ? <p className="p-6 text-gray-500 text-center">No complaints found.</p> : complaints.map((complaint) => (
                <div key={complaint.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-gray-800">Flat {complaint.flat}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${complaint.status === "Pending" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>{complaint.status}</span>
                    </div>
                    <p className="text-gray-600 text-sm">{complaint.issue}</p>
                  </div>
                  <button onClick={() => handleComplaintStatusChange(complaint.id, complaint.status)} className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                    Mark as {complaint.status === "Pending" ? "Resolved" : "Pending"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: ACCOUNTING */}
        {activeNav === "accounting" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-5xl mx-auto">
            <div className="p-6 border-b border-gray-100"><h3 className="text-lg font-bold text-gray-800">Transaction History</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Flat</th>
                    <th className="p-4 font-medium">Type/Event</th>
                    <th className="p-4 font-medium">Amount</th>
                    <th className="p-4 font-medium">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {payments.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-500">No transactions found.</td></tr> : payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="p-4 text-gray-600 whitespace-nowrap">{payment.date}</td>
                      <td className="p-4 font-medium text-gray-800">{payment.flat}</td>
                      <td className="p-4 text-gray-600">{payment.type === 'Event' ? (payment.eventName || payment.fundId) : 'Maintenance'}</td>
                      <td className="p-4 font-semibold text-green-600">₹{payment.amount}</td>
                      <td className="p-4 text-gray-600">{payment.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: NOTICE BOARD */}
        {activeNav === "notice" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Society Notices</h3>
              <button onClick={() => setShowNoticeModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <Plus size={18} /> New Notice
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notices.map(notice => (
                <div key={notice.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative">
                  {notice.urgent && <span className="absolute top-4 right-4 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">URGENT</span>}
                  <h4 className="font-bold text-gray-800 pr-16">{notice.title}</h4>
                  <p className="text-sm text-gray-600 mt-2">{notice.subtitle}</p>
                  <p className="text-xs text-gray-400 mt-4">{notice.time}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: MEETING */}
        {activeNav === "meeting" && (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center max-w-5xl mx-auto">
            <Video size={48} className="mx-auto text-blue-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-800">Virtual Meetings</h3>
            <p className="text-gray-500 mt-2">Start a virtual meeting with society members.</p>
            <button className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Schedule Meeting</button>
          </div>
        )}

      </main>

      {/* --- MODALS --- */}
      {showNoticeModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Create Notice</h3>
              <button onClick={() => setShowNoticeModal(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Title</label>
                <input type="text" value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} className="w-full p-2 border rounded mt-1"/>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Description</label>
                <textarea value={newNotice.subtitle} onChange={e => setNewNotice({...newNotice, subtitle: e.target.value})} className="w-full p-2 border rounded mt-1"></textarea>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="urgent" checked={newNotice.urgent} onChange={e => setNewNotice({...newNotice, urgent: e.target.checked})} />
                <label htmlFor="urgent" className="text-sm text-red-600 font-semibold">Mark as Urgent</label>
              </div>
              <button onClick={handleCreateNotice} className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 mt-2">Publish Notice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}