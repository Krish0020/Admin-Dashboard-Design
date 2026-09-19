# The Society File — New Shrushti CHS portal

A web portal for a registered co-operative housing society in Maharashtra. Residents
see notices, raise complaints, pay maintenance and keep their receipts. The managing
committee approves residents, answers complaints, tracks repair work and keeps the
society's book of account.

Built with React 18, TypeScript, Vite and Firebase (Authentication + Cloud Firestore).

---

## 1. Run it on your machine

You need Node.js 18 or newer.

```bash
npm install
cp .env.example .env.local     # then edit .env.local with your Firebase keys
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

Other commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-checks, then builds into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run typecheck` | Type-check only, no build |

---

## 2. Set up the Firebase project

In the [Firebase Console](https://console.firebase.google.com):

1. **Create a project** (or open the existing `shrushti-society-app`).
2. **Authentication → Sign-in method → Email/Password → Enable.**
3. **Firestore Database → Create database.** Start in *production mode*; the rules
   below replace the defaults.
4. **Project settings → Your apps → Web app.** Copy the config values into
   `.env.local` using the names in `.env.example`.
5. **Firestore → Rules.** Paste the contents of `firestore.rules` and press
   **Publish**. (Or, with the Firebase CLI installed:
   `firebase deploy --only firestore:rules`.)

Nothing else needs seeding — collections are created automatically the first time
a document is written to them.

### Creating the first committee account

There is deliberately **no way to become an admin from inside the app**. The
security rules force every self-registration to be `role: "member"` and
`status: "pending"`. So the first admin is made by hand, once:

1. **Authentication → Users → Add user.** Enter the secretary's email and a
   password. Copy the **User UID** that appears in the table.
2. **Firestore → Start collection → `users`.** Create a document whose
   **Document ID is exactly that UID**, with these fields:

   | Field | Type | Value |
   | --- | --- | --- |
   | `name` | string | Secretary's name |
   | `email` | string | Same email as the Auth user |
   | `phone` | string | e.g. `+91 98200 00000` |
   | `flat` | string | e.g. `A-101` |
   | `role` | string | `admin` |
   | `status` | string | `active` |
   | `createdAt` | number | any number, e.g. `1758240000000` |

3. Sign in at `/login/admin` with that email. You now have the committee view.

Every later resident registers through the app and is approved from
**Residents → Waiting for approval**.

---

## 3. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, **Add New → Project** and import the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output directory
   `dist` (`vercel.json` already sets these).
4. **Settings → Environment Variables:** add every `VITE_…` key from
   `.env.example` with your real values, for Production *and* Preview.
5. Deploy.
6. Back in Firebase, **Authentication → Settings → Authorised domains**, add your
   `*.vercel.app` domain — sign-in is blocked from unlisted domains.

`vercel.json` contains a catch-all rewrite to `index.html`. Without it, opening
`/admin` directly or refreshing the page returns a 404, because Vercel looks for a
file at that path and this is a single-page app where routing happens in the
browser.

---

## 4. How the code is organised

```
src/
  main.tsx                 Entry point: Router → AuthProvider → App
  app/
    App.tsx                Route table
    Landing.tsx            Cover page, choose committee or resident
    Login.tsx              Sign in (both roles)
    Signup.tsx             Resident registration
    PendingApproval.tsx    Waiting room until the committee approves
    admin/
      AdminDashboard.tsx   Shell: sidebar, header, shared data subscriptions
      Overview.tsx         Statistics, flat registry, collection charts
      Members.tsx          Approve / reject / suspend residents
      Notices.tsx          Notice board
      Complaints.tsx       Complaint workflow and committee notes
      Ledger.tsx           Book of account + offline payment entry
      Funds.tsx            Event funds and collection progress
      Work.tsx             Repair and contract register
      Meetings.tsx         Scheduling + embedded video room
      Chat.tsx             Committee side of resident messaging
    member/
      MemberPortal.tsx     Home, notices, payments, complaints, chat, profile
      PayModal.tsx         Two-step authenticated payment
      ReceiptSlip.tsx      On-screen receipt
  auth/
    AuthContext.tsx        Session + profile, exposed through useAuth()
    ProtectedRoute.tsx     Route guard: signed in → approved → correct role
  lib/
    firebase.ts            Firebase initialisation
    types.ts               Every Firestore document shape
    useLiveQuery.ts        Reusable realtime subscription hook
    receipt.ts             Receipt numbering and printable slip
  ui/
    theme.ts               Design tokens and formatting helpers
    primitives.tsx         Card, Btn, Input, Modal, Stamp, Empty, Spinner…
firestore.rules            Server-side access control
```

Two ideas keep the file count down. `ui/primitives.tsx` holds every repeated
element, so a screen is mostly composition rather than markup. `lib/useLiveQuery.ts`
wraps Firestore's `onSnapshot` once, so each screen asks for data in a line or two
and gets live updates for free.

### Data model

| Collection | Document holds | Who writes it |
| --- | --- | --- |
| `users` | name, email, phone, flat, role, status | member on registration; committee on approval |
| `notices` | title, body, urgent flag, number | committee |
| `complaints` | flat, category, issue, status, committee note | member raises; committee updates status |
| `payments` | flat, purpose, amount, receipt number, mode | member (in app) or committee (cash/cheque) |
| `funds` | event name, amount per flat, due date | committee |
| `work_items` | job, contractor, costs, dates, progress | committee |
| `meetings` | title, agenda, date, time, mode, room name | committee |
| `messages` | chatId (resident uid), sender, text, read flags | both sides |

Queries use `where` only and sort in JavaScript. That is deliberate: combining
`where` with `orderBy` in Firestore requires a composite index to be created for
every such pair, which is a common cause of "the app works locally but the list is
empty in production."

### The realtime bit

Nothing in this app polls or needs a refresh button. Every list is an
`onSnapshot` subscription, so when the committee approves a resident, marks a
complaint resolved or posts a notice, the change appears on the resident's phone
within a second. The waiting-for-approval screen is the clearest example: the
member's own profile document is subscribed, so approval moves them into the
portal while they are still looking at it.

---

## 5. Security — the part worth explaining

Access control exists in two layers, and only one of them counts.

**In the browser**, `ProtectedRoute` checks: signed in → profile exists → account
approved → role matches the route. This is convenience. It stops a member
stumbling into the admin URL and shows the right screen.

**On the server**, `firestore.rules` enforces the same things. This is the real
protection, because anyone can open the browser console and call Firestore
directly, bypassing the React app entirely.

The rules that carry the most weight:

- **No self-promotion to admin.** A user may create only their own profile
  document, and only with `role: "member"` and `status: "pending"`. Changing
  `role` or `status` afterwards requires an admin. So approval is genuinely a
  gate, not a UI suggestion.
- **Residents see only their own records.** Reads on `payments`, `complaints` and
  `messages` require `resource.data.uid == request.auth.uid`, or admin.
- **A resident cannot pay as another flat.** On create, the rules compare the
  submitted `uid` and `flat` against the caller's own profile.
- **The ledger is append-only:** `allow update, delete: if false` on `payments`.
  Once a receipt exists, nobody — resident or committee — can edit or erase it.
  That is what makes a receipt worth anything.
- **Message text is immutable.** Updates are allowed only if `text` and
  `senderUid` are unchanged, so the read-receipt flags can flip but history
  cannot be rewritten.

A useful thing to demonstrate: sign in as a member, open the console, and try
`updateDoc(doc(db, "users", myUid), { role: "admin" })`. It fails with
`permission-denied`.

### What the Firebase API key in `.env` is not

It is not a password. A web API key identifies the project and is visible to
anyone who opens the site — that is how Firebase is designed. The data is
protected by authentication plus the rules above. Environment variables are used
here for configuration hygiene (staging vs production), not secrecy.

---

## 6. Scope: what is real and what is simulated

Worth stating plainly rather than being asked.

**Real:** authentication, role-based access, committee approval, notices,
complaints with status workflow, the messaging threads, the work register,
meeting scheduling, receipt generation and storage, and every security rule.
All of it is backed by Firestore and survives a refresh, a new device or a
redeploy.

**Simulated: the money movement.** There is no payment gateway. The password
step before a payment is genuine re-authentication against Firebase — it stops a
payment being recorded from a session left open on a shared phone — but no rupees
change hands, and the receipt is written by the browser.

To make it real you would:

1. Send step two of `PayModal` to a gateway (Razorpay or a UPI collect request)
   instead of writing to Firestore.
2. Receive the gateway's webhook in a Cloud Function.
3. Write the payment document **from that function**, using the Admin SDK, and
   tighten the rules to `allow create: if false` for clients.

That last point is the important one: a receipt should only ever be minted by
code the user cannot run. The current rules already make receipts immutable once
written, which is half of that guarantee.

**Also out of scope:** true mobile push notifications (would need Firebase Cloud
Messaging with a service worker and a Cloud Function), and any CCTV integration
(would need real cameras exposing RTSP/ONVIF streams and a media server to
transcode them for the browser).

---

## 7. Design notes

The interface is styled as a registrar's physical case file that has been
digitised — kraft-folder sidebar with punch holes, rubber-stamp status badges in
oxblood and violet ink, a typewriter face for headings, ledger-ruled paper. The
subject matter is a society register, so the visual language comes from one.

Tokens live in `src/ui/theme.ts`. Motion is restrained on purpose: things move
when you act on them (a modal opening, a stamp pressing), not on their own.
Keyboard focus is visible throughout and `prefers-reduced-motion` is respected.

---

## 8. Likely questions

**Why Firebase instead of a Node + MySQL backend?**
The society has no server and no one to maintain one. Firebase gives
authentication, a database, realtime sync and hosting-grade security rules with
no server to run. The trade-off is that access logic lives in rules rather than
in application code, which is why `firestore.rules` is as carefully written as it is.

**How do you stop a member paying twice for the same month?**
The home screen checks for an existing maintenance payment with this month's
label before showing the button. That is a client-side check; the honest answer
is that a determined user could write a duplicate, and the server-side fix is the
Cloud Function described in section 6, which would own that decision.

**Why sort in JavaScript instead of `orderBy`?**
To avoid needing a composite Firestore index for every `where` + `orderBy` pair.
At society scale (tens of flats, hundreds of records) sorting in the browser is
free. At a much larger scale you would add the indexes and move the sort back to
the server.

**What happens if two committee members edit the same complaint at once?**
Last write wins — Firestore documents are updated atomically per field set.
For this workload that is acceptable; a stricter version would use a transaction.
