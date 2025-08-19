import React, { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Tag, Typography, message } from 'antd'
import AppLayout from '../components/AppLayout.jsx'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext.jsx'
import KPICard from '../components/KPICard.jsx'
import LeaveTypeDonut from '../components/LeaveTypeDonut.jsx'

const { Title } = Typography

const DashboardPage = () => {
  const { user } = useAuth()
  const [data, setData] = useState({ statusBreakdown: [], leaveTypeBreakdown: [] })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get('/leaves/stats/overview')
        setData(data.data)
      } catch (err) {
        message.error(err.response?.data?.message || 'Failed to load stats')
      }
    }
    fetchData()
  }, [])

  const getStatus = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'approved') return 'success'
    if (s === 'rejected') return 'error'
    if (s === 'pending') return 'warning'
    return 'default'
  }

  return (
    <AppLayout>
      <div className="page-header">
        <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
      </div>
      <Row gutter={[16, 16]}>
        {data.statusBreakdown.map((s) => (
          <Col xs={24} md={8} key={s.status}>
            <KPICard title={<Tag color={getStatus(s.status)}>{s.status}</Tag>} value={s.count} suffix={` (${Number(s.total_days || 0).toFixed(2)} days)`} color={getStatus(s.status)==='success'?'#52c41a':getStatus(s.status)==='warning'?'#faad14':getStatus(s.status)==='error'?'#ff4d4f':'#d9d9d9'} />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} md={12}>
          <Card title="Leave Types (Days)">
            <LeaveTypeDonut data={data.leaveTypeBreakdown} />
          </Card>
        </Col>
      </Row>
    </AppLayout>
  )
}

export default DashboardPage

