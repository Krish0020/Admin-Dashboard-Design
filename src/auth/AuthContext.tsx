import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { UserProfile } from "../lib/types";

interface AuthValue {
  user: User | null;
  profile: UserProfile | null;
  /** True until we know both the auth state and the profile document. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    phone: string;
    flat: string;
  }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      unsubProfile?.();
      unsubProfile = undefined;
      setUser(u);

      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      // Live subscription: if the admin approves the account while the member
      // is staring at the "waiting for approval" screen, it unlocks instantly.
      unsubProfile = onSnapshot(
        doc(db, "users", u.uid),
        (snap) => {
          setProfile(snap.exists() ? ({ uid: u.uid, ...snap.data() } as UserProfile) : null);
          setLoading(false);
        },
        (err) => {
          console.error("Could not read profile:", err);
          setProfile(null);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      profile,
      loading,
      login: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      register: async ({ name, email, password, phone, flat }) => {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        // The security rules only accept role "member" + status "pending"
        // here, so nobody can sign themselves up as an admin.
        await setDoc(doc(db, "users", cred.user.uid), {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          flat: flat.trim().toUpperCase(),
          role: "member",
          status: "pending",
          createdAt: Date.now(),
        });
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email.trim());
      },
      logout: async () => {
        await signOut(auth);
      },
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Turns Firebase error codes into sentences a resident can act on. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again, or reset your password.";
    case "auth/email-already-in-use":
      return "An account already exists for this email. Sign in instead.";
    case "auth/weak-password":
      return "Use a password of at least 6 characters.";
    case "auth/network-request-failed":
      return "Network problem. Check your connection and try again.";
    case "permission-denied":
      return "You don't have permission for this action.";
    default:
      return (err as Error)?.message || "Something went wrong. Try again.";
  }
}
