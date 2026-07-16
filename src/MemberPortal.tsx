// src/MemberPortal.tsx
import { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

export default function MemberPortal() {
  const [uiState, setUiState] = useState<'main' | 'processing' | 'success'>('main');
  const [complaintText, setComplaintText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handlePayment = async () => {
    setUiState('processing');
    try {
      const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      await addDoc(collection(db, "payments"), {
        member: "Rahul Tiwari", flat: "A-102", amount: 2500, date: currentDate, method: "UPI", createdAt: Date.now()
      });
      setTimeout(() => setUiState('success'), 2000);
    } catch (error) { alert("Failed!"); setUiState('main'); }
  };

  const handleComplaint = async () => {
    if (!complaintText.trim()) return alert("Please describe your issue!");
    setIsSending(true);
    try {
      await addDoc(collection(db, "complaints"), {
        flat: "A-102", issue: complaintText, status: "Pending", date: new Date().toLocaleDateString(), createdAt: Date.now()
      });
      setComplaintText("");
      alert("Complaint Sent!");
    } catch (e) { alert("Failed"); } finally { setIsSending(false); }
  };

  return (
    <div className="w-full max-w-md bg-white shadow-xl min-h-screen mx-auto p-6">
      <div className="bg-blue-600 text-white p-5 rounded-t-2xl text-center">
        <h1 className="text-xl font-bold">New Shrushti Society</h1>
      </div>
      {uiState === 'main' && (
        <div className="flex flex-col gap-4 mt-6">
          <button onClick={handlePayment} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Pay ₹2,500</button>
          <textarea value={complaintText} onChange={(e) => setComplaintText(e.target.value)} className="w-full border p-2" placeholder="Complaint..."></textarea>
          <button onClick={handleComplaint} className="w-full bg-red-500 text-white py-3 rounded-xl font-bold">Submit</button>
        </div>
      )}
      {uiState === 'processing' && <div className="text-center mt-10">Processing...</div>}
      {uiState === 'success' && <div className="text-center mt-10">Success! <button onClick={() => setUiState('main')}>Back</button></div>}
    </div>
  );
}