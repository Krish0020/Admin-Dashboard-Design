import { Routes, Route, Navigate } from 'react-router-dom';
// Yahan single dot (./) aayega kyunki ye same folder mein hai
import AdminDashboard from './AdminDashboard'; 
// Ye double dot (../) hi rahega kyunki MemberPortal bahar (src folder mein) hai
import MemberPortal from '../MemberPortal';

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/member" element={<MemberPortal />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}