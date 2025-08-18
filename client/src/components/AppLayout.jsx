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

  const items = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Dashboard</Link> },
    { key: '/calendar', icon: <CalendarOutlined />, label: <Link to="/calendar">Calendar</Link> },
    { key: '/leaves', icon: <ProfileOutlined />, label: <Link to="/leaves">My Leaves</Link> },
    { key: '/balances', icon: <SettingOutlined />, label: <Link to="/balances">My Balance</Link> },
  ]
  if (role === 'hr') {
    items.push({ key: '/approvals', icon: <CheckCircleOutlined />, label: <Link to="/approvals">Approvals</Link> })
    items.push({ key: '/employees', icon: <TeamOutlined />, label: <Link to="/employees">Employees</Link> })
    items.push({ key: '/leave-types', icon: <SettingOutlined />, label: <Link to="/leave-types">Leave Types</Link> })
    items.push({ key: '/holidays', icon: <CalendarOutlined />, label: <Link to="/holidays">Holidays</Link> })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ color: '#fff', padding: 16, fontWeight: 600 }}>Symplora Leave</div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={items} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 16 }}>
          <div>Welcome, {user?.name}</div>
          <Button icon={<LogoutOutlined />} onClick={logout}>Logout</Button>
        </Header>
        <Content style={{ margin: 16 }}>
          <div style={{ padding: 16, background: '#fff', minHeight: 360 }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout

