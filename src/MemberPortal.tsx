import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, query, where } from "firebase/firestore";

export default function MemberPortal() {
  const [uiState, setUiState] = useState<'main' | 'processing' | 'success'>('main');
  const [complaintText, setComplaintText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // States for Funds & Receipt
  const [activeFunds, setActiveFunds] = useState<any[]>([]);
  const [myPayments, setMyPayments] = useState<any[]>([]);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Demo User - Ye baad mein login system se aayega
  const flatNumber = "A-102";
  const memberName = "Rahul Tiwari";

  useEffect(() => {
    // 1. Society ke saare custom funds fetch karo
    const unsubFunds = onSnapshot(collection(db, "custom_funds"), (snapshot) => {
      setActiveFunds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Sirf is flat (A-102) ki payments fetch karo taaki pata chale kya pay ho chuka hai
    const q = query(collection(db, "payments"), where("flat", "==", flatNumber));
    const unsubPayments = onSnapshot(q, (snapshot) => {
      setMyPayments(snapshot.docs.map(doc => doc.data()));
    });

    return () => { unsubFunds(); unsubPayments(); };
  }, []);

  const handleFundPayment = async (fund: any) => {
    setUiState('processing');
    try {
      const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const transactionId = "TXN" + Math.floor(Math.random() * 100000000);
      
      const paymentRecord = {
        member: memberName,
        flat: flatNumber,
        amount: fund.amount,
        date: currentDate,
        method: "UPI",
        type: "Event",
        fundId: fund.id,
        eventName: fund.eventName,
        createdAt: Date.now(),
        transactionId: transactionId
      };

      await addDoc(collection(db, "payments"), paymentRecord);
      setReceiptData(paymentRecord);
      setTimeout(() => setUiState('success'), 1500);
    } catch (error) {
      alert("Payment Failed!");
      setUiState('main');
    }
  };

  const handleComplaint = async () => {
    if (!complaintText.trim()) return alert("Please describe your issue!");
    setIsSending(true);
    try {
      await addDoc(collection(db, "complaints"), {
        flat: flatNumber, 
        issue: complaintText, 
        status: "Pending", 
        date: new Date().toLocaleDateString(), 
        createdAt: Date.now()
      });
      setComplaintText("");
      alert("Complaint Sent to Admin!");
    } catch (e) { 
      alert("Failed to send complaint"); 
    } finally { 
      setIsSending(false); 
    }
  };

  // Jo funds pay nahi kiye hain, sirf wahi dikhao
  const getUnpaidFunds = () => {
    return activeFunds.filter(fund => !myPayments.some(p => p.fundId === fund.id));
  };

  return (
    <div className="w-full max-w-md bg-gray-50 shadow-2xl min-h-screen mx-auto pb-10 font-sans">
      <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-md text-center">
        <h1 className="text-2xl font-bold tracking-wide">Shrushti Society</h1>
        <p className="text-sm text-blue-100 mt-1">Member Portal</p>
      </div>

      {uiState === 'main' && (
        <div className="p-6 flex flex-col gap-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">Welcome, {memberName}</h2>
            <p className="text-sm text-gray-500 font-medium">Flat {flatNumber}</p>
          </div>

          {/* Dues / Event Funds Section */}
          {getUnpaidFunds().map((fund) => (
            <div key={fund.id} className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider">PAYMENT DUE</div>
              <h3 className="font-bold text-gray-800 text-lg mt-2">{fund.eventName}</h3>
              <p className="text-sm text-gray-600 mb-3">Due Date: <span className="font-semibold">{fund.dueDate}</span></p>
              <div className="flex justify-between items-center mt-4">
                <span className="text-2xl font-extrabold text-orange-600">₹{fund.amount}</span>
                <button onClick={() => handleFundPayment(fund)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-all">Pay Now</button>
              </div>
            </div>
          ))}

          {getUnpaidFunds().length === 0 && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-center">
              <p className="text-green-700 font-medium">🎉 You have no pending dues!</p>
            </div>
          )}

          {/* Complaint Section */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mt-4">
            <h3 className="font-bold text-gray-700 mb-3">Raise a Complaint</h3>
            <textarea 
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              placeholder="E.g. Lift is not working on 2nd floor..."
              rows={3}
            ></textarea>
            <button 
              onClick={handleComplaint}
              disabled={isSending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {isSending ? "Submitting..." : "Submit Complaint"}
            </button>
          </div>
        </div>
      )}

      {/* Processing State */}
      {uiState === 'processing' && (
        <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <h2 className="text-lg font-bold text-gray-700">Processing Payment...</h2>
            <p className="text-sm text-gray-400 mt-2">Please do not close this window</p>
        </div>
      )}

      {/* Success Receipt State */}
      {uiState === 'success' && receiptData && (
        <div className="flex-1 min-h-[60vh] p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-3xl mb-4 shadow-lg shadow-green-200 animate-bounce">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Successful!</h2>
            
            {/* The Digital Receipt */}
            <div className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 text-left mb-8 shadow-sm relative">
                <div className="text-center font-bold text-gray-400 text-sm tracking-widest mb-4 border-b pb-3">PAYMENT RECEIPT</div>
                
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-500">Name:</span> <strong className="text-gray-800">{receiptData.member}</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">Flat:</span> <strong className="text-gray-800">{receiptData.flat}</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">Event/Fund:</span> <strong className="text-gray-800">{receiptData.eventName}</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">Date:</span> <strong className="text-gray-800">{receiptData.date}</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">Txn ID:</span> <strong className="text-gray-800 text-xs mt-1">{receiptData.transactionId}</strong></div>
                  <div className="flex justify-between border-t pt-3 mt-2"><span className="text-gray-700 font-bold">Amount Paid:</span> <strong className="text-green-600 text-lg">₹{receiptData.amount}</strong></div>
                </div>
            </div>

            <button onClick={() => setUiState('main')} className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-xl shadow-md transition-all">Back to Home</button>
        </div>
      )}
    </div>
  );
}``