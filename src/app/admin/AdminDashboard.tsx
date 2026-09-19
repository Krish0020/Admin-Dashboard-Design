import { useState } from "react";
import { collection } from "firebase/firestore";
import {
  LayoutDashboard,
  Megaphone,
  MessageSquareWarning,
  ScrollText,
  Users,
  Hammer,
  Video,
  ShieldCheck,
  MessagesSquare,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { db } from "../../lib/firebase";
import { Complaint, Fund, Notice as NoticeDoc, Payment, UserProfile } from "../../lib/types";
import { byNewest, useLiveQuery } from "../../lib/useLiveQuery";
import { useAuth } from "../../auth/AuthContext";
import { c, font, SOCIETY_NAME } from "../../ui/theme";
import { Spinner } from "../../ui/primitives";

import Overview from "./Overview";
import Members from "./Members";
import Notices from "./Notices";
import Complaints from "./Complaints";
import Ledger from "./Ledger";
import Funds from "./Funds";
import Work from "./Work";
import Meetings from "./Meetings";
import Chat from "./Chat";

const NAV = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "members", label: "Residents", icon: Users },
  { id: "notices", label: "Notice board", icon: Megaphone },
  { id: "complaints", label: "Complaints", icon: MessageSquareWarning },
  { id: "ledger", label: "Accounts", icon: ScrollText },
  { id: "funds", label: "Event funds", icon: ShieldCheck },
  { id: "work", label: "Work register", icon: Hammer },
  { id: "meetings", label: "Meetings", icon: Video },
  { id: "chat", label: "Correspondence", icon: MessagesSquare },
] as const;
type NavId = (typeof NAV)[number]["id"];

export default function AdminDashboard() {
  const { profile, logout } = useAuth();
  const [nav, setNav] = useState<NavId>("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  // Data used by more than one section is loaded once here.
  const users = useLiveQuery<UserProfile & { id: string }>(() => collection(db, "users"), [], byNewest);
  const payments = useLiveQuery<Payment>(() => collection(db, "payments"), [], byNewest);
  const complaints = useLiveQuery<Complaint>(() => collection(db, "complaints"), [], byNewest);
  const notices = useLiveQuery<NoticeDoc>(() => collection(db, "notices"), [], byNewest);
  const funds = useLiveQuery<Fund>(() => collection(db, "funds"), [], byNewest);

  const pendingApprovals = users.data.filter((u) => u.status === "pending").length;
  const openComplaints = complaints.data.filter((x) => x.status !== "Resolved").length;

  if (!profile) return <Spinner />;

  const badge: Partial<Record<NavId, number>> = {
    members: pendingApprovals,
    complaints: openComplaints,
  };

  return (
    <div className="flex min-h-screen" style={{ background: c.paper, color: c.ink, fontFamily: font.sans }}>
      {/* Sidebar: the kraft folder, with punch holes and tabbed sections */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: c.kraft, borderRight: `1px solid ${c.gold}55` }}
      >
        <div className="pointer-events-none absolute left-2.5 top-24 bottom-24 flex flex-col justify-between py-6">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: c.paper, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)" }}
            />
          ))}
        </div>

        <div className="flex h-20 items-center gap-3 border-b pl-10 pr-5" style={{ borderColor: "#B4915A" }}>
          <div>
            <p className="text-[9px] tracking-[0.16em]" style={{ color: "#5A4322", fontFamily: font.mono }}>
              SOCIETY FILE
            </p>
            <p className="text-sm font-semibold leading-tight" style={{ color: "#2B2110", fontFamily: font.display }}>
              {SOCIETY_NAME}
            </p>
          </div>
          <button className="ml-auto md:hidden" style={{ color: "#5A4322" }} onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1.5 pl-8 pt-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = nav === item.id;
            const count = badge[item.id] || 0;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setNav(item.id);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 py-2.5 pl-4 pr-3 text-sm"
                style={{
                  background: active ? c.paper : "transparent",
                  color: active ? c.ink : "#4A3A1E",
                  borderRadius: "6px 0 0 6px",
                  fontWeight: active ? 600 : 500,
                  boxShadow: active ? "-2px 2px 6px rgba(0,0,0,0.12)" : "none",
                }}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {count > 0 && (
                  <span
                    className="ml-auto rounded-full px-1.5 text-[10px] font-bold text-white"
                    style={{ background: c.red }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-4 md:ml-64 md:p-8">
        <header
          className="mb-6 flex items-center justify-between rounded px-5 py-3.5"
          style={{ background: c.paperLight, border: `1px solid ${c.line}` }}
        >
          <div className="flex items-center gap-3">
            <button className="md:hidden" style={{ color: c.inkMuted }} onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
            <div>
              <p className="text-[10px] tracking-wide" style={{ color: c.inkMuted, fontFamily: font.mono }}>
                Committee view
              </p>
              <h1 className="text-lg font-semibold" style={{ fontFamily: font.display }}>
                {NAV.find((n) => n.id === nav)?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{profile.name}</p>
              <p className="text-[11px]" style={{ color: c.inkMuted }}>
                {profile.email}
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="rounded p-2"
              style={{ color: c.inkMuted, border: `1px solid ${c.line}` }}
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {nav === "overview" && (
          <Overview
            users={users.data}
            payments={payments.data}
            complaints={complaints.data}
            loading={users.loading || payments.loading}
            onNavigate={setNav}
          />
        )}
        {nav === "members" && <Members users={users.data} loading={users.loading} adminUid={profile.uid} />}
        {nav === "notices" && <Notices notices={notices.data} loading={notices.loading} adminName={profile.name} />}
        {nav === "complaints" && <Complaints complaints={complaints.data} loading={complaints.loading} />}
        {nav === "ledger" && <Ledger payments={payments.data} users={users.data} loading={payments.loading} />}
        {nav === "funds" && <Funds funds={funds.data} payments={payments.data} users={users.data} loading={funds.loading} />}
        {nav === "work" && <Work />}
        {nav === "meetings" && <Meetings />}
        {nav === "chat" && <Chat users={users.data} adminName={profile.name} adminUid={profile.uid} />}
      </main>
    </div>
  );
}
