import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth, authErrorMessage } from "../auth/AuthContext";
import { Btn, Card, Field, Heading, Input, Muted, Notice, Spinner } from "../ui/primitives";
import { c, font, SOCIETY_NAME } from "../ui/theme";

export default function Signup() {
  const { user, profile, loading, register } = useAuth();
  const [form, setForm] = useState({ name: "", flat: "", phone: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Spinner />;
  if (user && profile) {
    if (profile.status !== "active") return <Navigate to="/pending" replace />;
    return <Navigate to={profile.role === "admin" ? "/admin" : "/member"} replace />;
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^[A-Za-z]{1,2}-?\d{2,4}$/.test(form.flat.trim())) {
      setError("Enter the flat as wing-number, for example A-101.");
      return;
    }
    if (!/^\+?[\d\s-]{10,15}$/.test(form.phone.trim())) {
      setError("Enter a valid phone number the committee can reach you on.");
      return;
    }
    if (form.password.length < 6) {
      setError("Use a password of at least 6 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        flat: form.flat,
      });
      // AuthProvider picks up the new session; the redirect above sends the
      // new member to /pending until the secretary approves them.
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen paper-rule flex items-center justify-center px-5 py-12" style={{ background: c.paper }}>
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm" style={{ color: c.inkMuted }}>
          <ArrowLeft size={15} /> Back
        </Link>

        <Card>
          <p className="text-[11px] tracking-[0.16em]" style={{ color: c.gold, fontFamily: font.mono }}>
            {SOCIETY_NAME}
          </p>
          <div className="mt-1.5 mb-1">
            <Heading size="lg">Register your flat</Heading>
          </div>
          <Muted>
            The secretary checks your flat number against the society records before your
            account opens. You'll see the portal as soon as that's done.
          </Muted>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Field label="Full name">
              <Input required value={form.name} onChange={set("name")} placeholder="Rahul Tiwari" autoComplete="name" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Flat number">
                <Input required value={form.flat} onChange={set("flat")} placeholder="A-102" style={{ fontFamily: font.mono }} />
              </Field>
              <Field label="Phone">
                <Input
                  required
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+91 90000 00000"
                  autoComplete="tel"
                  style={{ fontFamily: font.mono }}
                />
              </Field>
            </div>

            <Field label="Email">
              <Input type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Password">
                <Input type="password" required value={form.password} onChange={set("password")} autoComplete="new-password" />
              </Field>
              <Field label="Confirm password">
                <Input type="password" required value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
              </Field>
            </div>

            {error && <Notice>{error}</Notice>}

            <Btn type="submit" block loading={busy}>
              Create account
            </Btn>
          </form>

          <p className="mt-4 text-sm" style={{ color: c.inkMuted }}>
            Already registered?{" "}
            <Link to="/login/member" className="font-semibold underline" style={{ color: c.purple }}>
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
