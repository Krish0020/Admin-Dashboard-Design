import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, Building2, Landmark, UserPlus } from "lucide-react";
import { Complaint, Payment, UserProfile } from "../../lib/types";
import { Card, Empty, Heading, Muted, Spinner } from "../../ui/primitives";
import { c, font, formatINR, formatDate, monthLabel } from "../../ui/theme";

/** Last six months of collections, computed from the real payment records. */
function monthlySeries(payments: Payment[]) {
  const out: { name: string; amount: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = d.getTime();
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    out.push({
      name: d.toLocaleDateString("en-IN", { month: "short" }),
      amount: payments
        .filter((p) => p.createdAt >= from && p.createdAt < to)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),
    });
  }
  return out;
}

export default function Overview({
  users,
  payments,
  complaints,
  loading,
  onNavigate,
}: {
  users: (UserProfile & { id: string })[];
  payments: Payment[];
  complaints: Complaint[];
  loading: boolean;
  onNavigate: (id: any) => void;
}) {
  const members = users.filter((u) => u.role === "member" && u.status === "active");
  const pending = users.filter((u) => u.status === "pending");
  const openComplaints = complaints.filter((x) => x.status !== "Resolved");
  const thisMonth = monthLabel();

  const collectedThisMonth = useMemo(() => {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    return payments.filter((p) => p.createdAt >= start).reduce((s, p) => s + Number(p.amount || 0), 0);
  }, [payments]);

  const series = useMemo(() => monthlySeries(payments), [payments]);

  const complaintSplit = [
    { name: "Resolved", value: complaints.length - openComplaints.length },
    { name: "Open", value: openComplaints.length },
  ];

  /** Per-flat status used by the registry grid. */
  const flatStatus = (m: UserProfile): "issue" | "due" | "clear" => {
    if (complaints.some((x) => x.uid === m.uid && x.status !== "Resolved")) return "issue";
    const paid = payments.some((p) => p.uid === m.uid && p.type === "Maintenance" && p.monthLabel === thisMonth);
    return paid ? "clear" : "due";
  };
  const statusColor = { issue: c.red, due: c.gold, clear: c.purple };

  const wings = Array.from(new Set(members.map((m) => m.flat.split("-")[0]))).sort();

  if (loading) return <Spinner label="Reading the register…" />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card className="paper-rule">
        <p className="text-[11px] tracking-[0.14em]" style={{ color: c.gold, fontFamily: font.mono }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h2 className="mt-2 text-2xl" style={{ fontFamily: font.display }}>
          Today's entry
        </h2>
        <Muted className="mt-2 max-w-xl">
          {openComplaints.length === 0 && pending.length === 0
            ? "Nothing waiting. Every complaint is closed and there are no new registrations."
            : [
                openComplaints.length > 0 && `${openComplaints.length} complaint${openComplaints.length > 1 ? "s" : ""} still open`,
                pending.length > 0 && `${pending.length} registration${pending.length > 1 ? "s" : ""} to approve`,
              ]
                .filter(Boolean)
                .join(" · ")}
        </Muted>
      </Card>

      <div className="grid gap-5 md:grid-cols-4">
        {[
          { label: "Registered flats", value: String(members.length), icon: <Building2 size={19} />, color: c.purple, go: "members" },
          { label: "Waiting for approval", value: String(pending.length), icon: <UserPlus size={19} />, color: c.gold, go: "members" },
          { label: "Open complaints", value: String(openComplaints.length), icon: <AlertTriangle size={19} />, color: c.red, go: "complaints" },
          { label: `Collected in ${new Date().toLocaleDateString("en-IN", { month: "long" })}`, value: formatINR(collectedThisMonth), icon: <Landmark size={19} />, color: c.purple, go: "ledger" },
        ].map((stat) => (
          <button key={stat.label} onClick={() => onNavigate(stat.go)} className="text-left">
            <Card>
              <div className="flex items-center gap-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded"
                  style={{ background: `${stat.color}14`, color: stat.color }}
                >
                  {stat.icon}
                </span>
                <span>
                  <span className="block text-[11px] font-medium" style={{ color: c.inkMuted }}>
                    {stat.label}
                  </span>
                  <span className="block text-2xl font-semibold" style={{ fontFamily: font.mono }}>
                    {stat.value}
                  </span>
                </span>
              </div>
            </Card>
          </button>
        ))}
      </div>

      {/* Flat registry */}
      <Card>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <Heading>Building registry</Heading>
          <div className="flex items-center gap-4 text-[11px]" style={{ color: c.inkMuted }}>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5" style={{ background: c.purple }} /> Maintenance paid
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5" style={{ background: c.gold }} /> Due
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5" style={{ background: c.red }} /> Open complaint
            </span>
          </div>
        </div>
        <Muted className="mb-5">Every approved flat, with its status for {thisMonth}.</Muted>

        {members.length === 0 ? (
          <Empty title="No approved residents yet. Approve a registration to populate the register." />
        ) : (
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.max(wings.length, 1)}, minmax(0,1fr))` }}>
            {wings.map((wing) => (
              <div key={wing}>
                <p className="mb-2.5 text-[11px] font-semibold" style={{ color: c.inkMuted, fontFamily: font.mono }}>
                  {wing} wing
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {members
                    .filter((m) => m.flat.startsWith(wing))
                    .sort((a, b) => a.flat.localeCompare(b.flat))
                    .map((m) => {
                      const status = flatStatus(m);
                      return (
                        <div
                          key={m.uid}
                          title={`${m.name} — ${status === "issue" ? "open complaint" : status === "due" ? "maintenance due" : "all clear"}`}
                          className="relative flex aspect-square items-center justify-center overflow-hidden rounded"
                          style={{ background: c.paper, border: `1px solid ${c.line}` }}
                        >
                          <span
                            className="absolute right-0 top-0 h-4 w-4"
                            style={{ background: `linear-gradient(135deg, transparent 50%, ${statusColor[status]} 50%)` }}
                          />
                          <span className="text-[11px] font-semibold" style={{ fontFamily: font.mono }}>
                            {m.flat}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Heading>Collections, month by month</Heading>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.line} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: c.inkMuted, fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: c.inkMuted, fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.03)" }}
                  formatter={(v: number) => formatINR(v)}
                  contentStyle={{ borderRadius: 6, border: `1px solid ${c.line}`, fontSize: 12, background: c.paperLight }}
                />
                <Bar dataKey="amount" fill={c.purple} radius={[3, 3, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <Heading>Complaints</Heading>
          {complaints.length === 0 ? (
            <Empty title="No complaints on record." />
          ) : (
            <>
              <div className="mt-5 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={complaintSplit} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                      <Cell fill={c.purple} />
                      <Cell fill={c.red} />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 6, border: `1px solid ${c.line}`, fontSize: 12, background: c.paperLight }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex justify-center gap-5 text-xs" style={{ color: c.inkMuted }}>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.purple }} /> Resolved
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.red }} /> Open
                </span>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card padded={false}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: c.line }}>
          <Heading>Recent payments</Heading>
          <button onClick={() => onNavigate("ledger")} className="text-xs font-semibold underline" style={{ color: c.purple }}>
            Open the ledger
          </button>
        </div>
        {payments.length === 0 ? (
          <Empty title="No payments recorded yet." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ background: c.paper }}>
                {["Flat", "Purpose", "Amount", "Date"].map((h) => (
                  <th key={h} className="px-6 py-3 text-[11px] font-semibold" style={{ color: c.inkMuted }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 5).map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 ? "rgba(0,0,0,0.02)" : "transparent" }}>
                  <td className="px-6 py-3.5 font-medium" style={{ fontFamily: font.mono }}>
                    {p.flat}
                  </td>
                  <td className="px-6 py-3.5" style={{ color: c.inkMuted }}>
                    {p.purpose}
                  </td>
                  <td className="px-6 py-3.5 font-semibold" style={{ color: c.purple, fontFamily: font.mono }}>
                    {formatINR(p.amount)}
                  </td>
                  <td className="px-6 py-3.5" style={{ color: c.inkMuted }}>
                    {formatDate(p.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
