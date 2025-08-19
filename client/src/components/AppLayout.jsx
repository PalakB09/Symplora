import React from 'react'
import { Layout, Menu, Button } from 'antd'
import { CalendarOutlined, DashboardOutlined, LogoutOutlined, ProfileOutlined, TeamOutlined, CheckCircleOutlined, SettingOutlined } from '@ant-design/icons'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const { Header, Sider, Content } = Layout

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const { role } = user || {}
  const location = useLocation()

  // Build menu based on role
  const items = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Dashboard</Link> },
    { key: '/calendar', icon: <CalendarOutlined />, label: <Link to="/calendar">Calendar</Link> },
    // Employee-facing items (hide for HR to reduce confusion)
    ...(role !== 'hr' ? [
      { key: '/leaves', icon: <ProfileOutlined />, label: <Link to="/leaves">My Leaves</Link> },
      { key: '/balances', icon: <SettingOutlined />, label: <Link to="/balances">My Balance</Link> },
    ] : []),
    // HR tools
    ...(role === 'hr' ? [
      { key: '/approvals', icon: <CheckCircleOutlined />, label: <Link to="/approvals">Approvals</Link> },
      { key: '/employees', icon: <TeamOutlined />, label: <Link to="/employees">Employees</Link> },
      { key: '/leave-types', icon: <SettingOutlined />, label: <Link to="/leave-types">Leave Types</Link> },
      { key: '/holidays', icon: <CalendarOutlined />, label: <Link to="/holidays">Holidays</Link> },
    ] : []),
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={240}
        breakpoint="lg"
        collapsedWidth={64}
        style={{ position: 'sticky', top: 0, left: 0, height: '100vh' }}
      >
        <div style={{ color: '#fff', padding: 16, fontWeight: 700, fontSize: 18 }}>Symplora Leave</div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={items} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div>Welcome, {user?.name}</div>
          <Button icon={<LogoutOutlined />} onClick={logout}>Logout</Button>
        </Header>
        <Content style={{ margin: 20 }}>
          <div className="container-card" style={{ padding: 20, minHeight: 'calc(100vh - 160px)' }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout

