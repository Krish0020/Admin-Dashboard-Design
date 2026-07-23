import { useState } from "react";
import { motion } from "framer-motion";
import Spline from "@splinetool/react-spline";
import { Landmark, ArrowRight, ShieldCheck } from "lucide-react";

/**
 * Landing / role-select screen.
 *
 * Setup:
 *   npm install framer-motion @splinetool/react-spline @splinetool/runtime
 *
 * The Spline scene below is Spline's own public demo scene (confirmed working
 * from their official docs) — it's a placeholder so this renders immediately.
 * To use your own 3D model:
 *   1. Go to spline.design → build or pick a free community scene
 *      (search "keys", "building", "shield" for something on-theme)
 *   2. Export → Code → React → copy the scene URL
 *   3. Paste it into SPLINE_SCENE_URL below
 *
 * Wire this up in your router / App.tsx, e.g.:
 *   const [role, setRole] = useState<"admin" | "member" | null>(null);
 *   {!role && <Landing onSelectRole={setRole} />}
 *   {role === "admin" && <AdminDashboard />}
 *   {role === "member" && <MemberPortal />}
 */
const SPLINE_SCENE_URL = "https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode";
const SOCIETY_NAME = "New Shrushti CHS";

const ink = "#1E2A22", forest = "#2F5233", gold = "#B4872A", muted = "#8B8168";
const serif = "'IBM Plex Serif', serif", mono = "'IBM Plex Mono', monospace";

export default function Landing({ onSelectRole }: { onSelectRole: (role: "admin" | "member") => void }) {
  const [splineLoaded, setSplineLoaded] = useState(false);

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center" style={{ background: ink }}>
      {/* Ledger-line texture, matches the rest of the app */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "repeating-linear-gradient(180deg, rgba(180,135,42,0.05) 0px, rgba(180,135,42,0.05) 1px, transparent 1px, transparent 34px)" }}
      />

      {/* 3D scene — fills the right half on desktop, sits behind content on mobile */}
      <div className="absolute inset-0 md:left-1/2 md:inset-y-0 md:right-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: splineLoaded ? 0.9 : 0 }}
          transition={{ duration: 1 }}
          className="w-full h-full"
        >
          <Spline scene={SPLINE_SCENE_URL} onLoad={() => setSplineLoaded(true)} />
        </motion.div>
      </div>

      {/* Foreground content */}
      <div className="relative z-10 w-full md:w-1/2 px-8 md:px-16 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-11 h-11 rounded-full mb-8 flex items-center justify-center border-2"
          style={{ borderColor: gold, color: gold }}
        >
          <Landmark size={18} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[11px] uppercase tracking-[0.2em] mb-3"
          style={{ color: gold }}
        >
          Registrar's Panel
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18 }}
          className="text-4xl md:text-5xl font-semibold mb-4 leading-tight"
          style={{ color: "#F7F4EC", fontFamily: serif }}
        >
          {SOCIETY_NAME}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.26 }}
          className="text-sm max-w-sm mb-10"
          style={{ color: "#B7C4BB" }}
        >
          One registry for notices, complaints, funds, and payments — built for the society, run by the society.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.34 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelectRole("admin")}
            className="flex items-center justify-between gap-4 px-6 py-4 rounded-xl text-white font-semibold"
            style={{ background: forest }}
          >
            <span className="flex items-center gap-2.5"><ShieldCheck size={18} />Enter as Admin</span>
            <ArrowRight size={16} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelectRole("member")}
            className="flex items-center justify-between gap-4 px-6 py-4 rounded-xl font-semibold"
            style={{ background: "transparent", border: `1.5px solid ${gold}66`, color: "#F7F4EC" }}
          >
            <span className="flex items-center gap-2.5"><Landmark size={18} />Enter as Member</span>
            <ArrowRight size={16} />
          </motion.button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-[11px] mt-10"
          style={{ color: "#5C6E62", fontFamily: mono }}
        >
          Demo build &middot; role selection only, no auth wired yet
        </motion.p>
      </div>
    </div>
  );
}