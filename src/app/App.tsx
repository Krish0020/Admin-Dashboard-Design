import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
// Yahan single dot (./) aayega kyunki ye same folder mein hai
import AdminDashboard from './AdminDashboard';
// Ye double dot (../) hi rahega kyunki MemberPortal bahar (src folder mein) hai
import MemberPortal from '../MemberPortal';
// Landing bhi same folder mein rakho jahan AdminDashboard hai
import Landing from './Landing';

// Landing khud router se independent hai (onSelectRole prop leta hai),
// isliye ek chhota wrapper use karke navigate() se jodte hain
function LandingRoute() {
  const navigate = useNavigate();
  return <Landing onSelectRole={(role: "admin" | "member") => navigate(`/${role}`)} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/member" element={<MemberPortal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}