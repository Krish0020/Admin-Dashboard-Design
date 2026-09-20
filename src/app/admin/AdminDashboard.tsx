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
  Camera,
  Menu,
  X,
  LogOut,
  Database,
} from "lucide-react";
import { db } from "../../lib/firebase";
import { Complaint, Fund, Notice as NoticeDoc, Payment, UserProfile } from "../../lib/types";
import { byNewest, useLiveQuery } from "../../lib/useLiveQuery";
import { seedDemoData, clearDemoData } from "../../lib/seedDemo";
import { useAuth } from "../../auth/AuthContext";
import { c, font, SOCIETY_NAME } from "../../ui/theme";
import { Btn, Modal, Muted, Notice as Banner, Spinner } from "../../ui/primitives";

import Overview from "./Overview";
import Members from "./Members";
import Notices from "./Notices";
import Complaints from "./Complaints";
import Ledger from "./Ledger";
import Funds from "./Funds";
import Work from "./Work";
import Meetings from "./Meetings";
import Chat from "./Chat";
import Cctv from "./Cctv";

const NAV = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "members", label: "Residents", icon: Users },
  { id: "notices", label: "Notice board", icon: Megaphone },
  { id: "complaints", label: "Complaints", icon: MessageSquareWarning },
  { id: "ledger", label: "Accounts", icon: ScrollText },
  { id: "funds", label: "Event funds", icon: ShieldCheck },
  { id: "work", label: "Work register", icon: Hammer },
  { id: "meetings", label: "Meetings", icon: Video },
  { id: "cctv", label: "CCTV", icon: Camera },
  { id: "chat", label: "Correspondence", icon: MessagesSquare },
] as const;
type NavId = (typeof NAV)[number]["id"];

export default function AdminDashboard() {
  const { profile, logout } = useAuth();
  const [nav, setNav] = useState<NavId>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

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
      {/* Sidebar — green leather with a gold rule down the edge */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: `linear-gradient(180deg, ${c.kraft} 0%, #0a1d13 100%)`,
          borderRight: `1px solid ${c.line}`,
        }}
      >
        <span
          className="absolute inset-y-0 right-0 w-px"
          style={{ background: `linear-gradient(180deg, transparent, ${c.purple}66, transparent)` }}
        />

        <div className="flex h-20 items-center gap-3 border-b px-5" style={{ borderColor: c.line }}>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
            style={{
              background: `radial-gradient(circle at 35% 30%, #d8b95e, ${c.purple} 65%, #8d7226 100%)`,
              color: c.deep,
              fontFamily: font.display,
            }}
          >
            NS
          </span>
          <div className="min-w-0">
            <p className="text-[9px] tracking-[0.18em]" style={{ color: c.purple, fontFamily: font.mono }}>
              SOCIETY LEDGER
            </p>
            <p className="truncate text-sm" style={{ color: c.ink, fontFamily: font.display, fontWeight: 600 }}>
              {SOCIETY_NAME}
            </p>
          </div>
          <button className="ml-auto md:hidden" style={{ color: c.inkMuted }} onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1 px-3 pt-4">
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
                className="flex w-full items-center gap-2.5 rounded px-3 py-2.5 text-sm"
                style={{
                  background: active ? `${c.purple}1F` : "transparent",
                  color: active ? c.purple : c.inkMuted,
                  fontWeight: active ? 600 : 500,
                  borderLeft: `2px solid ${active ? c.purple : "transparent"}`,
                }}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {count > 0 && (
                  <span className="ml-auto rounded-full px-1.5 text-[10px] font-bold" style={{ background: c.red, color: c.ink }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t px-5 py-4" style={{ borderColor: c.line }}>
          <button
            onClick={() => setDemoOpen(true)}
            className="flex items-center gap-2 text-[11px]"
            style={{ color: c.inkMuted, fontFamily: font.mono }}
          >
            <Database size={13} /> Demo data
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-4 md:ml-64 md:p-8">
        <header
          className="paper-rule mb-6 flex items-center justify-between rounded px-5 py-4"
          style={{ background: c.paperLight, border: `1px solid ${c.line}` }}
        >
          <div className="flex items-center gap-3">
            <button className="md:hidden" style={{ color: c.inkMuted }} onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
            <div>
              <p className="text-[10px] tracking-[0.16em]" style={{ color: c.purple, fontFamily: font.mono }}>
                COMMITTEE VIEW
              </p>
              <h1 className="text-xl" style={{ fontFamily: font.display, fontWeight: 600 }}>
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
        {nav === "cctv" && <Cctv />}
        {nav === "chat" && <Chat users={users.data} adminName={profile.name} adminUid={profile.uid} />}
      </main>

      {demoOpen && <DemoDataPanel onClose={() => setDemoOpen(false)} />}
    </div>
  );
}

/** Loads or clears the sample register used for demonstrations. */
function DemoDataPanel({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState<"seed" | "clear" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (which: "seed" | "clear") => {
    setBusy(which);
    setError(null);
    setDone(null);
    try {
      if (which === "seed") {
        await seedDemoData();
        setDone("Sample register loaded — six flats, payments, complaints, work and a conversation.");
      } else {
        await clearDemoData();
        setDone("Sample records removed. Anything you created yourself is untouched.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title="Demo data" onClose={onClose}>
      <div className="space-y-4">
        <Muted>
          Fills the register with six flats and a season of activity so the portal can be
          shown without typing everything by hand. Every record is tagged, so clearing
          removes only the samples.
        </Muted>
        <Muted>
          The sample residents are records, not login accounts — they appear throughout the
          committee view but cannot sign in. Register one real account through the app to
          demonstrate sign-up and approval.
        </Muted>

        {done && <Banner tone="ok">{done}</Banner>}
        {error && <Banner>{error}</Banner>}

        <div className="flex gap-3">
          <Btn block loading={busy === "seed"} disabled={busy !== null} onClick={() => run("seed")}>
            Load sample register
          </Btn>
          <Btn variant="outline" block loading={busy === "clear"} disabled={busy !== null} onClick={() => run("clear")}>
            Clear samples
          </Btn>
        </div>
      </div>
    </Modal>
  );
}