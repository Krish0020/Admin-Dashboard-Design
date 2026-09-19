/** Every document shape in Firestore, in one place. */

export type Role = "admin" | "member";
export type AccountStatus = "pending" | "active" | "rejected";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  flat: string;
  role: Role;
  status: AccountStatus;
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
}

export type ComplaintStatus = "Pending" | "In Progress" | "Resolved";

export interface Complaint {
  id: string;
  uid: string;
  flat: string;
  memberName: string;
  category: string;
  issue: string;
  status: ComplaintStatus;
  adminNote?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Notice {
  id: string;
  number: string;
  title: string;
  body: string;
  urgent: boolean;
  postedBy: string;
  createdAt: number;
}

export type PaymentType = "Maintenance" | "Event";

export interface Payment {
  id: string;
  uid: string;
  flat: string;
  memberName: string;
  type: PaymentType;
  purpose: string; // "Monthly maintenance" or the fund/event name
  fundId?: string;
  monthLabel?: string; // only for maintenance, e.g. "September 2026"
  amount: number;
  method: string; // "UPI (simulated)" | "Cash" | "Bank transfer" | "Cheque"
  transactionId: string;
  recordedBy: "member" | "admin";
  createdAt: number;
}

export interface Fund {
  id: string;
  eventName: string;
  amount: number;
  dueDate: string;
  note?: string;
  createdAt: number;
}

export type WorkStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: WorkStatus;
  priority: "Low" | "Medium" | "High";
  assignedTo: string;
  workerPhone: string;
  estimatedCost: string;
  finalCost: string;
  startDate: string;
  expectedDate: string;
  progress: number;
  remarks: string;
  createdAt: number;
}

export interface Meeting {
  id: string;
  title: string;
  agenda: string;
  mode: "Online" | "Offline";
  venueOrLink: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  roomName?: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  chatId: string; // always the member's uid
  senderUid: string;
  senderRole: Role;
  senderName: string;
  text: string;
  readByAdmin: boolean;
  readByMember: boolean;
  createdAt: number;
}
