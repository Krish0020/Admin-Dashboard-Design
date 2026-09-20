import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Landmark, ArrowRight } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { c, font, SOCIETY_NAME } from "../ui/theme";
import { Spinner } from "../ui/primitives";

/**
 * The cover of the society's register: green leather, gold blocking, a
 * pressed seal. One orchestrated entrance on load and nothing else moves by
 * itself — the restraint is what makes it read as bound and official rather
 * than as a marketing page.
 */
export default function Landing() {
  const { user, profile, loading } = useAuth();

  if (loading) return <Spinner label="Opening the register…" />;
  if (user && profile?.status === "active") {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/member"} replace />;
  }
  if (user) return <Navigate to="/pending" replace />;

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay },
  });

  return (
    <main
      className="paper-rule flex min-h-screen items-center justify-center px-5 py-12"
      style={{
        background: `radial-gradient(1200px 600px at 20% 10%, #12341f 0%, ${c.paper} 55%, ${c.deep} 100%)`,
      }}
    >
      <div className="grid w-full max-w-5xl gap-12 md:grid-cols-[1.05fr_1fr] md:items-center">
        {/* Left: the blocked title */}
        <div>
          <motion.div {...rise(0)} className="mb-7 flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ border: `1.5px solid ${c.purple}`, color: c.purple }}
            >
              <Landmark size={18} />
            </span>
            <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${c.purple}88, transparent)` }} />
          </motion.div>

          <motion.p {...rise(0.06)} className="text-[11px] tracking-[0.22em]" style={{ color: c.purple, fontFamily: font.mono }}>
            REGISTERED CO-OPERATIVE HOUSING SOCIETY
          </motion.p>

          <motion.h1
            {...rise(0.12)}
            className="mt-4 text-5xl leading-[1.05] md:text-6xl"
            style={{ fontFamily: font.display, color: c.ink, fontWeight: 600 }}
          >
            {SOCIETY_NAME}
          </motion.h1>

          <motion.p {...rise(0.2)} className="mt-5 max-w-md text-[15px] leading-relaxed" style={{ color: c.inkMuted }}>
            The society's whole register in one place — notices, complaints, maintenance
            dues and receipts. Kept by the committee, open to every resident.
          </motion.p>

          <motion.div {...rise(0.28)} className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login/member"
              className="flex items-center justify-between gap-6 rounded px-6 py-4 font-semibold transition-transform hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(180deg, ${c.purple}, #b0902f)`,
                color: c.deep,
                boxShadow: "0 10px 26px rgba(201,168,76,0.22)",
              }}
            >
              <span className="flex items-center gap-2.5">
                <Landmark size={18} />
                I live here
              </span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/login/admin"
              className="flex items-center justify-between gap-6 rounded px-6 py-4 font-semibold transition-transform hover:-translate-y-0.5"
              style={{ border: `1.5px solid ${c.line}`, color: c.ink, background: "rgba(255,255,255,0.02)" }}
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck size={18} />
                Committee sign in
              </span>
              <ArrowRight size={16} />
            </Link>
          </motion.div>

          <motion.p {...rise(0.36)} className="mt-7 text-sm" style={{ color: c.inkMuted }}>
            New resident?{" "}
            <Link to="/signup" className="font-semibold underline" style={{ color: c.purple }}>
              Register your flat
            </Link>{" "}
            — the secretary approves new accounts.
          </motion.p>
        </div>

        {/* Right: the bound volume */}
        <motion.div
          initial={{ opacity: 0, rotate: -3, y: 24 }}
          animate={{ opacity: 1, rotate: -1.5, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18 }}
          className="relative mx-auto hidden aspect-[3/4] w-full max-w-sm rounded-sm md:block"
          style={{
            background: `linear-gradient(145deg, #143c28 0%, #0d2b1c 60%, #081c12 100%)`,
            boxShadow: "0 28px 60px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(201,168,76,0.18)",
          }}
        >
          {/* spine */}
          <span
            className="absolute inset-y-0 left-6 w-px"
            style={{ background: `linear-gradient(180deg, transparent, ${c.purple}55, transparent)` }}
          />

          {/* gold blocked panel */}
          <div
            className="absolute inset-x-12 top-14 rounded-sm px-6 py-7 text-center"
            style={{ border: `1px solid ${c.purple}55` }}
          >
            <p className="text-[10px] tracking-[0.24em]" style={{ color: c.purple, fontFamily: font.mono }}>
              FILE NO. NS / CHS / 01
            </p>
            <p className="mt-4 text-2xl leading-snug" style={{ fontFamily: font.display, color: c.ink }}>
              Register of the Society
            </p>
            <span className="mx-auto mt-4 block h-px w-16" style={{ background: `${c.purple}99` }} />
            <div className="mt-5 space-y-2">
              {["Notices", "Complaints", "Maintenance ledger", "Receipts"].map((line) => (
                <p key={line} className="text-xs" style={{ color: c.inkMuted, fontFamily: font.mono }}>
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* pressed wax seal */}
          <div
            className="absolute bottom-14 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full"
            style={{
              background: `radial-gradient(circle at 35% 30%, #d8b95e, ${c.purple} 60%, #8d7226 100%)`,
              boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
              color: c.deep,
              fontFamily: font.display,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            NS
          </div>
        </motion.div>
      </div>
    </main>
  );
}