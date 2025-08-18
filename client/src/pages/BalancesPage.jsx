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
      <Title level={3}>My Leave Balance</Title>
      <List
        dataSource={balances}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta title={item.leave_type_name} description={item.leave_type_description} />
            <div style={{ width: 300 }}>
              <Progress percent={Math.round(((item.used_days || 0) / (item.total_days || 1)) * 100)} />
              <div style={{ textAlign: 'right' }}>{(item.total_days - item.used_days).toFixed(1)} remaining / {item.total_days}</div>
            </div>
          </List.Item>
        )}
      />
    </AppLayout>
  )
}

export default BalancesPage

