import { FormEvent, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth, authErrorMessage } from "../auth/AuthContext";
import { Btn, Card, Field, Heading, Input, Muted, Notice, Spinner } from "../ui/primitives";
import { c, font, SOCIETY_NAME } from "../ui/theme";

export default function Login() {
  const { role } = useParams<{ role: string }>();
  const wantsAdmin = role === "admin";
  const { user, profile, loading, login, resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (loading) return <Spinner label="Checking your session…" />;

  // Already signed in: send them to the right place. If a member opened the
  // committee login, this is where they get redirected back to their own app.
  if (user && profile) {
    if (profile.status !== "active") return <Navigate to="/pending" replace />;
    return <Navigate to={profile.role === "admin" ? "/admin" : "/member"} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await login(email, password);
      // The redirect above runs once the profile document arrives. Role
      // mismatches are caught there and in ProtectedRoute, so a member who
      // signs in on this page simply lands on the member portal.
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  const onReset = async () => {
    if (!email.trim()) {
      setError("Type your email address first, then choose 'Send reset link'.");
      return;
    }
    setError(null);
    try {
      await resetPassword(email);
      setInfo("Reset link sent. Check your inbox, including spam.");
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <main className="min-h-screen paper-rule flex items-center justify-center px-5 py-12" style={{ background: c.paper }}>
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm" style={{ color: c.inkMuted }}>
          <ArrowLeft size={15} /> Back
        </Link>

        <Card>
          <p className="text-[11px] tracking-[0.16em]" style={{ color: c.gold, fontFamily: font.mono }}>
            {SOCIETY_NAME}
          </p>
          <div className="mt-1.5 mb-1">
            <Heading size="lg">{wantsAdmin ? "Committee sign in" : "Resident sign in"}</Heading>
          </div>
          <Muted>
            {wantsAdmin
              ? "For the secretary and committee members who maintain the register."
              : "Use the email you registered your flat with."}
          </Muted>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Field label="Email">
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Password">
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {error && <Notice>{error}</Notice>}
            {info && <Notice tone="ok">{info}</Notice>}

            <Btn type="submit" block loading={busy}>
              Sign in
            </Btn>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" onClick={onReset} className="underline" style={{ color: c.inkMuted }}>
              Send reset link
            </button>
            {!wantsAdmin && (
              <Link to="/signup" className="font-semibold underline" style={{ color: c.purple }}>
                Register a flat
              </Link>
            )}
          </div>
        </Card>

        {wantsAdmin && (
          <p className="mt-4 text-xs leading-relaxed" style={{ color: c.inkMuted }}>
            Committee accounts are created by the society, not through registration. If your
            account is not marked as committee, signing in here takes you to the resident view.
          </p>
        )}
      </div>
    </main>
  );
}
