import React, { useEffect, useState } from 'react'
import { Button, Modal, Space, Table, Tag, Typography, Input, message, Select } from 'antd'
import StatusTag from '../components/StatusTag.jsx'
import AppLayout from '../components/AppLayout.jsx'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext.jsx'
import RequestDetailsDrawer from '../components/RequestDetailsDrawer.jsx'

const { Title } = Typography

const ApprovalsPage = () => {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [detailsId, setDetailsId] = useState(null)
  const [filters, setFilters] = useState({ status: 'pending' })

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100', ...(filters.status ? { status: filters.status } : {}) })
      const { data } = await api.get(`/leaves?${params.toString()}`)
      setRows(data.data.leaveRequests)
    } catch (e) {
      message.error('Failed to fetch requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filters])

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
    { title: 'Start', dataIndex: 'start_date', render: (v)=> new Date(v).toLocaleDateString() },
    { title: 'End', dataIndex: 'end_date', render: (v)=> new Date(v).toLocaleDateString() },
    { title: 'Days', dataIndex: 'total_days' },
    { title: 'Half Day', dataIndex: 'is_half_day', render: v => v ? 'Yes' : 'No' },
    { title: 'Status', dataIndex: 'status', render: (s) => <StatusTag status={s} /> },
    { title: 'Action', key: 'action', render: (_, r) => (
      <Space>
        <Button onClick={() => setDetailsId(r.id)}>View</Button>
        <Button type="primary" onClick={() => approve(r.id)}>Approve</Button>
        <Button danger onClick={() => reject(r.id)}>Reject</Button>
      </Space>
    )}
  ]

  return (
    <AppLayout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Approvals</Title>
        <Space>
          <Select
            value={filters.status}
            style={{ width: 160 }}
            onChange={(v)=> setFilters(f=>({ ...f, status: v }))}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: '', label: 'All' },
            ]}
          />
          <Button onClick={load}>Refresh</Button>
        </Space>
      <RequestDetailsDrawer id={detailsId} open={!!detailsId} onClose={()=> setDetailsId(null)} afterAction={load} />
      </div>
      <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={{ pageSize: 10 }} />
    </AppLayout>
  )
}

export default ApprovalsPage

