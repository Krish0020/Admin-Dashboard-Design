import { Navigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Btn, Card, Heading, Muted, Spinner } from "../ui/primitives";
import { c, font } from "../ui/theme";

/**
 * Where a member waits between registering and being approved. The profile
 * subscription is live, so approval moves them on without a refresh.
 */
export default function PendingApproval() {
  const { user, profile, loading, logout } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;
  if (profile?.status === "active") {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/member"} replace />;
  }

  const rejected = profile?.status === "rejected";

  return (
    <main className="min-h-screen paper-rule flex items-center justify-center px-5 py-12" style={{ background: c.paper }}>
      <Card className="w-full max-w-md">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full" style={{ border: `2px solid ${c.gold}`, color: c.gold }}>
          <Clock size={18} />
        </div>

        <Heading size="lg">{rejected ? "Registration not approved" : "Waiting for approval"}</Heading>

        <div className="mt-2 space-y-3">
          <Muted>
            {rejected
              ? "The committee could not match your details to the society records. Speak to the secretary, then register again with the correct flat number."
              : "The secretary is checking your flat details against the society register. This page updates by itself the moment your account is opened."}
          </Muted>

          {profile && (
            <div className="rounded px-4 py-3 text-sm" style={{ background: c.paper, border: `1px solid ${c.line}`, fontFamily: font.mono }}>
              <p>{profile.name}</p>
              <p style={{ color: c.inkMuted }}>
                Flat {profile.flat} · {profile.email}
              </p>
            </div>
          )}

          {!profile && (
            <Muted>
              We couldn't find your resident record. If you just registered, wait a moment and
              refresh; otherwise contact the secretary.
            </Muted>
          )}
        </div>

        <div className="mt-6">
          <Btn variant="outline" block onClick={() => logout()}>
            Sign out
          </Btn>
        </div>
      </Card>
    </main>
  );
}
