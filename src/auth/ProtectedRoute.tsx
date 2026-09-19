import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Spinner } from "../ui/primitives";
import { Role } from "../lib/types";

/**
 * Guards a branch of the router.
 *
 * Order matters: signed in → profile exists → account approved → correct role.
 * This is the client-side half of access control; the Firestore rules enforce
 * the same thing on the server, so editing the URL cannot get you in.
 */
export function ProtectedRoute({ role }: { role: Role }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Opening the file…" />;

  if (!user) {
    return <Navigate to={`/login/${role}`} replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    // Signed in, but no profile document — unusual, so send them back out.
    return <Navigate to="/pending" replace />;
  }

  if (profile.status !== "active") {
    return <Navigate to="/pending" replace />;
  }

  if (profile.role !== role) {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/member"} replace />;
  }

  return <Outlet />;
}
