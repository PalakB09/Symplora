import React, { useEffect, useState } from 'react'
import { List, Progress, Typography, message } from 'antd'
import AppLayout from '../components/AppLayout.jsx'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext.jsx'

const { Title } = Typography

const BalancesPage = () => {
  const { user } = useAuth()
  const [balances, setBalances] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/employees/${user.id}/leave-balances`)
        setBalances(data.data.balances)
      } catch (e) {
        message.error('Failed to fetch leave balances')
      }
    }
    load()
  }, [user])

  return (
    <AppLayout>
      <div className="page-header">
        <Title level={3} style={{ margin: 0 }}>My Leave Balance</Title>
      </div>
      <List
        dataSource={balances}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta title={item.leave_type_name} description={item.leave_type_description} />
            <div style={{ width: 360 }}>
              <Progress
                percent={Math.round(((item.used_days || 0) / Math.max(item.total_days || 1, 1)) * 100)}
                strokeColor={item.leave_type_color || '#1677ff'}
              />
              <div style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>
                {(item.total_days - item.used_days).toFixed(1)} remaining / {item.total_days}
              </div>
            </div>
          </List.Item>
        )}
      />
    </AppLayout>
  )
}

export default BalancesPage

