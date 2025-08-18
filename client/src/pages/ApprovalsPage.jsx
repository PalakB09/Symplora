import React, { useEffect, useState } from 'react'
import { Button, Modal, Space, Table, Tag, Typography, Input, message } from 'antd'
import AppLayout from '../components/AppLayout.jsx'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext.jsx'

const { Title } = Typography

const ApprovalsPage = () => {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/leaves?limit=100&status=pending')
      setRows(data.data.leaveRequests)
    } catch (e) {
      message.error('Failed to fetch pending requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const approve = async (id) => {
    try {
      await api.patch(`/leaves/${id}/status`, { status: 'approved' })
      message.success('Request approved')
      load()
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to approve')
    }
  }

  const reject = async (id) => {
    let reason = ''
    Modal.confirm({
      title: 'Reject Leave',
      content: (
        <div>
          <p>Please provide a rejection reason</p>
          <Input.TextArea rows={3} onChange={(e)=>{ reason = e.target.value }} />
        </div>
      ),
      okText: 'Reject',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!reason || reason.trim().length < 10) {
          message.error('Reason must be at least 10 characters')
          throw new Error('invalid')
        }
        try {
          await api.patch(`/leaves/${id}/status`, { status: 'rejected', rejection_reason: reason })
          message.success('Request rejected')
          load()
        } catch (e) {
          message.error(e?.response?.data?.message || 'Failed to reject')
        }
      }
    })
  }

  const columns = [
    { title: 'Employee', dataIndex: 'employee_name' },
    { title: 'Type', dataIndex: 'leave_type_name' },
    { title: 'Start', dataIndex: 'start_date' },
    { title: 'End', dataIndex: 'end_date' },
    { title: 'Days', dataIndex: 'total_days' },
    { title: 'Half Day', dataIndex: 'is_half_day', render: v => v ? 'Yes' : 'No' },
    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s==='approved'?'green':s==='rejected'?'red':s==='pending'?'orange':'default'}>{s}</Tag> },
    { title: 'Action', key: 'action', render: (_, r) => (
      <Space>
        <Button type="primary" onClick={() => approve(r.id)}>Approve</Button>
        <Button danger onClick={() => reject(r.id)}>Reject</Button>
      </Space>
    )}
  ]

  return (
    <AppLayout>
      <Title level={3}>Approvals</Title>
      <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} />
    </AppLayout>
  )
}

export default ApprovalsPage

