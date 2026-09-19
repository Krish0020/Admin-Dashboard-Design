import { useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { addDoc, collection } from "firebase/firestore";
import { ShieldCheck } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { Payment, PaymentType, UserProfile } from "../../lib/types";
import { newReceiptNumber } from "../../lib/receipt";
import { authErrorMessage } from "../../auth/AuthContext";
import { Btn, Field, Input, Modal, Muted, Notice } from "../../ui/primitives";
import { c, font, formatINR, monthLabel } from "../../ui/theme";

export interface PayRequest {
  type: PaymentType;
  purpose: string;
  amount: number;
  fundId?: string;
}

/**
 * Two-step payment confirmation.
 *
 * Step 1 shows exactly what is being paid. Step 2 asks for the account
 * password and re-authenticates against Firebase before anything is written,
 * so a payment cannot be recorded from a session someone left open on a
 * shared phone. Only after re-authentication succeeds does the receipt
 * document get created.
 *
 * Scope note for the report: money movement here is simulated. A production
 * version routes step 2 to a payment gateway (Razorpay/UPI collect) and
 * writes the receipt from a server webhook, so the client can never mint one.
 */
export default function PayModal({
  request,
  profile,
  onClose,
  onPaid,
}: {
  request: PayRequest;
  profile: UserProfile;
  onClose: () => void;
  onPaid: (payment: Payment) => void;
}) {
  const [step, setStep] = useState<"review" | "verify">("review");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmPayment = async () => {
    const user = auth.currentUser;
    if (!user?.email) {
      setError("Your session expired. Sign in again to pay.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 1. Prove the person at the keyboard owns this account.
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));

      // 2. Record the payment. uid and flat are written from the signed-in
      //    profile, and the security rules reject any document whose uid is
      //    not the caller's, so nobody can pay "as" another flat.
      const record = {
        uid: user.uid,
        flat: profile.flat,
        memberName: profile.name,
        type: request.type,
        purpose: request.purpose,
        ...(request.fundId ? { fundId: request.fundId } : {}),
        ...(request.type === "Maintenance" ? { monthLabel: monthLabel() } : {}),
        amount: request.amount,
        method: "UPI (simulated)",
        transactionId: newReceiptNumber(),
        recordedBy: "member" as const,
        createdAt: Date.now(),
      };

      const ref = await addDoc(collection(db, "payments"), record);
      onPaid({ id: ref.id, ...record } as Payment);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={step === "review" ? "Confirm payment" : "Verify it's you"} onClose={onClose}>
      {step === "review" ? (
        <div className="space-y-5">
          <div className="rounded px-4 py-4" style={{ background: c.paper, border: `1px solid ${c.line}` }}>
            <p className="text-sm" style={{ color: c.inkMuted }}>
              {request.purpose}
            </p>
            <p className="mt-1 text-3xl font-semibold" style={{ fontFamily: font.mono, color: c.purple }}>
              {formatINR(request.amount)}
            </p>
            <p className="mt-3 text-xs" style={{ color: c.inkMuted }}>
              Paying for flat {profile.flat}
              {request.type === "Maintenance" ? ` · ${monthLabel()}` : ""}
            </p>
          </div>

          <Muted>
            A receipt is generated the moment the payment is recorded, and stays in your
            payment history permanently.
          </Muted>

          <div className="flex gap-3">
            <Btn variant="outline" block onClick={onClose}>
              Cancel
            </Btn>
            <Btn block onClick={() => setStep("verify")}>
              Continue
            </Btn>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} style={{ color: c.purple }} className="mt-0.5 shrink-0" />
            <Muted>
              Enter your account password to authorise {formatINR(request.amount)}. This is the
              same check a bank app does before it lets a payment through.
            </Muted>
          </div>

          <Field label="Account password">
            <Input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password) confirmPayment();
              }}
              placeholder="••••••••"
            />
          </Field>

          {error && <Notice>{error}</Notice>}

          <div className="flex gap-3">
            <Btn variant="outline" block onClick={() => setStep("review")} disabled={busy}>
              Back
            </Btn>
            <Btn block loading={busy} disabled={!password} onClick={confirmPayment}>
              Pay {formatINR(request.amount)}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}
