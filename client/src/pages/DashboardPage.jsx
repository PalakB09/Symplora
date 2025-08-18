import React, { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Tag, Typography, message } from 'antd'
import AppLayout from '../components/AppLayout.jsx'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext.jsx'

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
      <Title level={3}>Dashboard</Title>
      <Row gutter={[16, 16]}>
        {data.statusBreakdown.map((s) => (
          <Col xs={24} md={8} key={s.status}>
            <Card>
              <Statistic title={<Tag color={getStatus(s.status)}>{s.status}</Tag>} value={s.count} suffix={`(${s.total_days} days)`} />
            </Card>
          </Col>
        ))}
      </Row>
    </AppLayout>
  )
}

export default DashboardPage

