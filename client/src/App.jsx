import React from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LeavesPage from './pages/LeavesPage.jsx'
import BalancesPage from './pages/BalancesPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import ApprovalsPage from './pages/ApprovalsPage.jsx'
import EmployeesPage from './pages/EmployeesPage.jsx'

const Protected = () => {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Protected />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/leaves" element={<LeavesPage />} />
          <Route path="/balances" element={<BalancesPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
