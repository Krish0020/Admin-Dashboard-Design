import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "./firebase";
import { newReceiptNumber } from "./receipt";
import { monthLabel, MAINTENANCE_AMOUNT } from "../ui/theme";

/**
 * Fills the society register with a believable set of records so the portal
 * can be demonstrated without spending an hour typing.
 *
 * Important distinction: these residents are *records*, not login accounts.
 * Creating a real Firebase Auth user requires that user's own password, which
 * no admin should ever hold. So the demo flats appear everywhere the committee
 * looks — registry, ledger, complaints, chat — but cannot sign in. To show the
 * login and approval flow, register one real account through the app.
 *
 * Everything written here is tagged `demo: true`, so `clearDemoData()` can
 * remove all of it and leave real records untouched.
 */

const DEMO_FLAG = { demo: true };

const RESIDENTS = [
  { uid: "demo-a101", flat: "A-101", name: "Sunita Deshmukh", phone: "+91 98201 44112" },
  { uid: "demo-a102", flat: "A-102", name: "Rahul Tiwari", phone: "+91 98202 55231" },
  { uid: "demo-a103", flat: "A-103", name: "Imran Shaikh", phone: "+91 98203 66340" },
  { uid: "demo-b101", flat: "B-101", name: "Meera Iyer", phone: "+91 98204 77459" },
  { uid: "demo-b102", flat: "B-102", name: "Jaydeep Patil", phone: "+91 98205 88568" },
  { uid: "demo-b103", flat: "B-103", name: "Anjali Rane", phone: "+91 98206 99677" },
];

const daysAgo = (n: number) => Date.now() - n * 24 * 60 * 60 * 1000;
const isoDaysFromNow = (n: number) =>
  new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export async function seedDemoData() {
  const batch = writeBatch(db);

  /* ---- residents (6 approved + 1 waiting, to demo the approval flow) ---- */
  RESIDENTS.forEach((r, i) => {
    batch.set(doc(db, "users", r.uid), {
      ...DEMO_FLAG,
      uid: r.uid,
      name: r.name,
      email: `${r.flat.toLowerCase().replace("-", "")}@example.com`,
      phone: r.phone,
      flat: r.flat,
      role: "member",
      status: "active",
      createdAt: daysAgo(90 - i * 4),
    });
  });

  batch.set(doc(db, "users", "demo-b104"), {
    ...DEMO_FLAG,
    uid: "demo-b104",
    name: "Nikhil Gaikwad",
    email: "b104@example.com",
    phone: "+91 98207 10786",
    flat: "B-104",
    role: "member",
    status: "pending",
    createdAt: daysAgo(1),
  });

  /* ---- notices ---- */
  [
    {
      number: "001",
      title: "Water supply interrupted on Thursday",
      body: "The overhead tanks will be cleaned between 10 AM and 4 PM on Thursday. Supply will be restored by evening. Please store water in advance.",
      urgent: true,
      createdAt: daysAgo(2),
    },
    {
      number: "002",
      title: "Annual general meeting — 12th of next month",
      body: "The AGM will be held in the society hall at 6:30 PM. Agenda: audited accounts, lift maintenance contract renewal, and the painting tender.",
      urgent: false,
      createdAt: daysAgo(9),
    },
    {
      number: "003",
      title: "Two-wheeler parking re-allotment",
      body: "Parking slots in the basement are being re-allotted from the first of next month. Collect your new tag from the secretary.",
      urgent: false,
      createdAt: daysAgo(21),
    },
  ].forEach((n) => {
    batch.set(doc(collection(db, "notices")), { ...DEMO_FLAG, ...n, postedBy: "Society secretary" });
  });

  /* ---- an open event fund ---- */
  const fundRef = doc(collection(db, "funds"));
  batch.set(fundRef, {
    ...DEMO_FLAG,
    eventName: "Ganesh Chaturthi 2026",
    amount: 500,
    dueDate: isoDaysFromNow(18),
    note: "Covers decoration, prasad, the sound system and the visarjan van.",
    createdAt: daysAgo(6),
  });

  /* ---- payments: four flats paid maintenance, two paid the fund ---- */
  RESIDENTS.slice(0, 4).forEach((r, i) => {
    batch.set(doc(collection(db, "payments")), {
      ...DEMO_FLAG,
      uid: r.uid,
      flat: r.flat,
      memberName: r.name,
      type: "Maintenance",
      purpose: "Monthly maintenance",
      monthLabel: monthLabel(),
      amount: MAINTENANCE_AMOUNT,
      method: i % 2 === 0 ? "UPI (simulated)" : "Cash",
      transactionId: newReceiptNumber(),
      recordedBy: i % 2 === 0 ? "member" : "admin",
      createdAt: daysAgo(3 + i),
    });
  });

  // last month, so the collections chart has more than one bar
  RESIDENTS.slice(0, 5).forEach((r, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    batch.set(doc(collection(db, "payments")), {
      ...DEMO_FLAG,
      uid: r.uid,
      flat: r.flat,
      memberName: r.name,
      type: "Maintenance",
      purpose: "Monthly maintenance",
      monthLabel: monthLabel(d),
      amount: MAINTENANCE_AMOUNT,
      method: "UPI (simulated)",
      transactionId: newReceiptNumber(),
      recordedBy: "member",
      createdAt: d.getTime() - i * 36e5,
    });
  });

  RESIDENTS.slice(0, 2).forEach((r, i) => {
    batch.set(doc(collection(db, "payments")), {
      ...DEMO_FLAG,
      uid: r.uid,
      flat: r.flat,
      memberName: r.name,
      type: "Event",
      purpose: "Ganesh Chaturthi 2026",
      fundId: fundRef.id,
      amount: 500,
      method: "UPI (simulated)",
      transactionId: newReceiptNumber(),
      recordedBy: "member",
      createdAt: daysAgo(4 - i),
    });
  });

  /* ---- complaints across all three states ---- */
  [
    {
      r: RESIDENTS[4],
      category: "Lift",
      issue: "The B wing lift stops between the 2nd and 3rd floor and the door takes a long time to open.",
      status: "Pending",
      createdAt: daysAgo(1),
    },
    {
      r: RESIDENTS[2],
      category: "Plumbing / drainage",
      issue: "Water is seeping from the common drainage line into the A wing ground floor passage.",
      status: "In Progress",
      adminNote: "Plumber inspected on Tuesday. Replacement pipe ordered, work starts Saturday.",
      createdAt: daysAgo(5),
    },
    {
      r: RESIDENTS[0],
      category: "Electricity",
      issue: "The staircase light on the third floor has not been working for a week.",
      status: "Resolved",
      adminNote: "Tube light and choke replaced on Monday.",
      createdAt: daysAgo(12),
    },
    {
      r: RESIDENTS[5],
      category: "Security",
      issue: "The night watchman was not at the gate between 1 AM and 3 AM on Sunday.",
      status: "Resolved",
      adminNote: "Spoken to the agency. Attendance register is now checked twice a night.",
      createdAt: daysAgo(20),
    },
  ].forEach((x) => {
    batch.set(doc(collection(db, "complaints")), {
      ...DEMO_FLAG,
      uid: x.r.uid,
      flat: x.r.flat,
      memberName: x.r.name,
      category: x.category,
      issue: x.issue,
      status: x.status,
      ...(x.adminNote ? { adminNote: x.adminNote } : {}),
      createdAt: x.createdAt,
    });
  });

  /* ---- work register ---- */
  [
    {
      title: "Sewage line cleaning — B wing",
      description: "Annual jetting of the main sewage line and inspection of all chambers.",
      category: "Plumbing",
      status: "In Progress",
      priority: "High",
      assignedTo: "Shree Sai Drain Services",
      workerPhone: "+91 90040 11220",
      estimatedCost: "18000",
      finalCost: "",
      startDate: isoDaysFromNow(-3),
      expectedDate: isoDaysFromNow(2),
      progress: 55,
      remarks: "Two chambers done, third needs a cover replacement.",
      createdAt: daysAgo(8),
    },
    {
      title: "Exterior painting — quotation stage",
      description: "Three quotations to be placed before the committee at the AGM.",
      category: "Painting",
      status: "Pending",
      priority: "Medium",
      assignedTo: "",
      workerPhone: "",
      estimatedCost: "450000",
      finalCost: "",
      startDate: "",
      expectedDate: isoDaysFromNow(40),
      progress: 0,
      remarks: "Sharma Contractors and two others have submitted rates.",
      createdAt: daysAgo(14),
    },
    {
      title: "Fire extinguisher refilling",
      description: "All twelve units refilled and pressure-tested as per municipal requirement.",
      category: "Security",
      status: "Completed",
      priority: "High",
      assignedTo: "Suraksha Fire Systems",
      workerPhone: "+91 90050 33441",
      estimatedCost: "9600",
      finalCost: "9200",
      startDate: isoDaysFromNow(-25),
      expectedDate: isoDaysFromNow(-22),
      progress: 100,
      remarks: "Certificates filed with the secretary.",
      createdAt: daysAgo(28),
    },
    {
      title: "Terrace waterproofing",
      description: "Deferred to after the monsoon on the contractor's advice.",
      category: "Civil / structural",
      status: "Cancelled",
      priority: "Low",
      assignedTo: "",
      workerPhone: "",
      estimatedCost: "75000",
      finalCost: "",
      startDate: "",
      expectedDate: "",
      progress: 0,
      remarks: "To be re-tendered in November.",
      createdAt: daysAgo(35),
    },
  ].forEach((w) => batch.set(doc(collection(db, "work_items")), { ...DEMO_FLAG, ...w }));

  /* ---- a scheduled meeting ---- */
  batch.set(doc(collection(db, "meetings")), {
    ...DEMO_FLAG,
    title: "Annual general meeting",
    agenda: "Audited accounts, lift maintenance contract, painting tender.",
    mode: "Online",
    venueOrLink: "Link shared on the notice board",
    date: isoDaysFromNow(12),
    time: "18:30",
    roomName: "NSCHS-agm-demo",
    createdAt: daysAgo(6),
  });

  /* ---- a conversation with A-102 ---- */
  const thread = [
    { role: "member", name: RESIDENTS[1].name, text: "Good morning. Is the water tanker coming today?", mins: 180 },
    { role: "admin", name: "Society secretary", text: "Yes, it is booked for 4 PM. The supply from VVMC was short this morning.", mins: 165 },
    { role: "member", name: RESIDENTS[1].name, text: "Thank you. Also, can I get a receipt copy for last month's maintenance?", mins: 150 },
    { role: "admin", name: "Society secretary", text: "It is in your Payments tab — open the entry and choose 'Save or print'.", mins: 140 },
  ];
  thread.forEach((m) => {
    batch.set(doc(collection(db, "messages")), {
      ...DEMO_FLAG,
      chatId: RESIDENTS[1].uid,
      senderUid: m.role === "member" ? RESIDENTS[1].uid : "admin",
      senderRole: m.role,
      senderName: m.name,
      text: m.text,
      readByAdmin: true,
      readByMember: true,
      createdAt: Date.now() - m.mins * 60 * 1000,
    });
  });

  await batch.commit();
}

/** Removes everything seedDemoData() wrote, and nothing else. */
export async function clearDemoData() {
  const collections = ["users", "notices", "funds", "payments", "complaints", "work_items", "meetings", "messages"];

  for (const name of collections) {
    const snap = await getDocs(query(collection(db, name), where("demo", "==", true)));
    // Firestore batches cap at 500 writes, so commit in chunks.
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
}