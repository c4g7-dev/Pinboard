import { Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "@/pages/Login"
import Dashboard from "@/pages/Dashboard"
import AdminPage from "@/pages/Admin"
import UpdatesPage from "@/pages/Updates"

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/updates" element={<UpdatesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
