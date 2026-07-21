import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminGate from "./components/AdminGate";
import ChatWidget from "./components/ChatWidget";

import DonorRegister from "./pages/DonorRegister";
import Dashboard from "./pages/Dashboard";
import NewRequest from "./pages/NewRequest";
import MyRequests from "./pages/MyRequests";
import RequestMatches from "./pages/RequestMatches";
import DonorSearch from "./pages/DonorSearch";
import OpenRequests from "./pages/OpenRequests";
import BloodBanks from "./pages/BloodBanks";
import Hospitals from "./pages/Hospitals";
import Predictions from "./pages/Predictions";
import AdminBloodBanks from "./pages/AdminBloodBanks";
import AdminHospitals from "./pages/AdminHospitals";
import AdminRequests from "./pages/AdminRequests";
import AdminStats from "./pages/AdminStats";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/donor-register" element={<DonorRegister />} />
        <Route path="/requests/new" element={<NewRequest />} />
        <Route path="/requests/mine" element={<MyRequests />} />
        <Route path="/requests/:requestId/matches" element={<RequestMatches />} />
        <Route path="/requests/open" element={<OpenRequests />} />
        <Route path="/search/donors" element={<DonorSearch />} />
        <Route path="/blood-banks" element={<BloodBanks />} />
        <Route path="/hospitals" element={<Hospitals />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/admin" element={<Navigate to="/admin/requests" replace />} />
        <Route
          path="/admin/blood-banks"
          element={
            <AdminGate>
              <AdminBloodBanks />
            </AdminGate>
          }
        />
        <Route
          path="/admin/hospitals"
          element={
            <AdminGate>
              <AdminHospitals />
            </AdminGate>
          }
        />
        <Route
          path="/admin/requests"
          element={
            <AdminGate>
              <AdminRequests />
            </AdminGate>
          }
        />
        <Route
          path="/admin/stats"
          element={
            <AdminGate>
              <AdminStats />
            </AdminGate>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatWidget />
    </BrowserRouter>
  );
}
