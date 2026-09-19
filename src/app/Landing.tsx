import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Landmark, ArrowRight } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { c, font, SOCIETY_NAME } from "../ui/theme";
import { Spinner } from "../ui/primitives";

/**
 * The cover of the file. One orchestrated entrance on load, nothing else
 * moves on its own. The 3D scene from the earlier version is gone: it pulled
 * a remote runtime that slowed first paint and broke the production build.
 */
export default function Landing() {
  const { user, profile, loading } = useAuth();

  if (loading) return <Spinner label="Opening the file…" />;
  if (user && profile?.status === "active") {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/member"} replace />;
  }
  if (user) return <Navigate to="/pending" replace />;

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay },
  });

  return (
    <main className="min-h-screen paper-rule flex items-center justify-center px-5 py-12" style={{ background: c.paper }}>
      <div className="w-full max-w-5xl grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
        {/* Left: the typed cover */}
        <div>
          <motion.p {...rise(0)} className="text-[11px] tracking-[0.18em]" style={{ color: c.gold, fontFamily: font.mono }}>
            Registered Co-operative Housing Society
          </motion.p>

          <motion.h1
            {...rise(0.08)}
            className="mt-3 text-4xl md:text-5xl leading-tight"
            style={{ fontFamily: font.display, color: c.ink }}
          >
            {SOCIETY_NAME}
          </motion.h1>

          <motion.p {...rise(0.16)} className="mt-4 max-w-md text-[15px] leading-relaxed" style={{ color: c.inkMuted }}>
            Notices, complaints, maintenance dues and receipts — the society's whole register,
            open to every resident and kept by the committee.
          </motion.p>

          <motion.div {...rise(0.24)} className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link
              to="/login/member"
              className="flex items-center justify-between gap-6 rounded px-6 py-4 font-semibold"
              style={{ background: c.purple, color: c.paperLight }}
            >
              <span className="flex items-center gap-2.5">
                <Landmark size={18} />
                I live here
              </span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/login/admin"
              className="flex items-center justify-between gap-6 rounded px-6 py-4 font-semibold"
              style={{ border: `1.5px solid ${c.line}`, color: c.ink }}
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck size={18} />
                Committee sign in
              </span>
              <ArrowRight size={16} />
            </Link>
          </motion.div>

          <motion.p {...rise(0.32)} className="mt-6 text-sm" style={{ color: c.inkMuted }}>
            New resident?{" "}
            <Link to="/signup" className="font-semibold underline" style={{ color: c.purple }}>
              Register your flat
            </Link>{" "}
            — the secretary approves new accounts.
          </motion.p>
        </div>

        {/* Right: the kraft folder itself */}
        <motion.div
          initial={{ opacity: 0, rotate: -3, y: 20 }}
          animate={{ opacity: 1, rotate: -1.5, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative mx-auto hidden md:block w-full max-w-sm aspect-[3/4] rounded"
          style={{ background: c.kraft, boxShadow: "0 18px 40px rgba(0,0,0,0.18)" }}
        >
          <div className="absolute left-4 top-16 bottom-16 flex flex-col justify-between py-8">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="block h-3 w-3 rounded-full"
                style={{ background: c.paper, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.45)" }}
              />
            ))}
          </div>

          <div
            className="absolute left-14 right-8 top-14 rounded px-5 py-6"
            style={{ background: c.paperLight, border: `1px solid ${c.gold}55` }}
          >
            <p className="text-[10px] tracking-[0.2em]" style={{ color: c.inkMuted, fontFamily: font.mono }}>
              FILE NO. NS / CHS / 01
            </p>
            <p className="mt-3 text-lg leading-snug" style={{ fontFamily: font.display }}>
              {SOCIETY_NAME}
            </p>
            <div className="mt-5 space-y-2">
              {["Notices", "Complaints", "Maintenance ledger", "Receipts"].map((line) => (
                <p key={line} className="text-xs" style={{ color: c.inkMuted, fontFamily: font.mono }}>
                  — {line}
                </p>
              ))}
            </div>
          </div>

          <svg className="absolute right-8 bottom-12" width="54" height="54" viewBox="0 0 28 28" aria-hidden="true">
            <path d="M4 6 L24 22 M24 6 L4 22" stroke={c.red} strokeWidth="1.2" opacity="0.5" />
            <circle cx="14" cy="14" r="4.4" fill={c.red} />
            <circle cx="14" cy="14" r="4.4" fill="none" stroke={c.paperLight} strokeWidth="1" />
          </svg>
        </motion.div>
      </div>
    </main>
  );
}
