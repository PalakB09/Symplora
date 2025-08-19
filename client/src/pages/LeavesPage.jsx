import React, { useEffect, useState } from 'react'
import { Button, Space, Table, Tag, message } from 'antd'
import StatusTag from '../components/StatusTag.jsx'
import AppLayout from '../components/AppLayout.jsx'
import api from '../api/axios'
import ApplyLeaveModal from '../components/ApplyLeaveModal.jsx'

const LeavesPage = () => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/leaves')
      setRows(data.data.leaveRequests)
    } catch (e) {
      message.error('Failed to fetch leaves')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const cancelLeave = async (id) => {
    try {
      await api.patch(`/leaves/${id}/cancel`)
      message.success('Leave cancelled')
      load()
    } catch (e) {
      message.error(e?.response?.data?.message || 'Cannot cancel leave')
    }
  }

  const columns = [
    { title: 'Type', dataIndex: 'leave_type_name' },
    { title: 'Start', dataIndex: 'start_date', render: (v)=> new Date(v).toLocaleDateString() },
    { title: 'End', dataIndex: 'end_date', render: (v)=> new Date(v).toLocaleDateString() },
    { title: 'Days', dataIndex: 'total_days' },
    { title: 'Half Day', dataIndex: 'is_half_day', render: v => v ? 'Yes' : 'No' },
    { title: 'Status', dataIndex: 'status', render: (s) => <StatusTag status={s} /> },
    { title: 'Action', key: 'action', render: (_, r) => (
      <Space>
        {r.status === 'pending' && (<Button danger onClick={() => cancelLeave(r.id)}>Cancel</Button>)}
      </Space>
    )}
  ]

  return (
    <AppLayout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>My Leaves</h3>
        <Space>
          <Button onClick={load}>Refresh</Button>
          <Button type="primary" onClick={() => setOpen(true)}>Apply Leave</Button>
        </Space>
      </div>
      <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={{ pageSize: 10 }} />
      <ApplyLeaveModal open={open} onClose={() => setOpen(false)} onSuccess={load} />
    </AppLayout>
  )
}

export default LeavesPage

