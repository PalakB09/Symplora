import React, { useEffect, useState } from 'react'
import { Drawer, Descriptions, Space, Button, Timeline, message } from 'antd'
import StatusTag from './StatusTag.jsx'
import api from '../api/axios'

const RequestDetailsDrawer = ({ id, open, onClose, afterAction }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await api.get(`/leaves/${id}`)
      setData(data.data)
    } catch (e) {
      message.error('Failed to load request')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ if (open) load() }, [open, id])

  const doAction = async (status) => {
    try {
      const payload = status==='rejected' ? { status, rejection_reason: 'Rejected via details' } : { status }
      await api.patch(`/leaves/${id}/status`, payload)
      message.success(`Request ${status}`)
      if (afterAction) afterAction()
      onClose()
    } catch (e) {
      message.error(e?.response?.data?.message || 'Action failed')
    }
  }

  return (
    <Drawer title={`Request #${id}`} open={open} onClose={onClose} width={640}>
      {data && (
        <>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Employee">{data.employee_name} ({data.employee_code})</Descriptions.Item>
            <Descriptions.Item label="Type">{data.leave_type_name}</Descriptions.Item>
            <Descriptions.Item label="Dates">{new Date(data.start_date).toLocaleDateString()} - {new Date(data.end_date).toLocaleDateString()}</Descriptions.Item>
            <Descriptions.Item label="Days">{data.total_days}{data.is_half_day?' • Half Day':''}</Descriptions.Item>
            <Descriptions.Item label="Reason">{data.reason}</Descriptions.Item>
            <Descriptions.Item label="Status"><StatusTag status={data.status} /></Descriptions.Item>
            {data.approver_name && <Descriptions.Item label="Approved By">{data.approver_name}</Descriptions.Item>}
          </Descriptions>

          <Space style={{ marginTop: 12 }}>
            {data.status==='pending' && <>
              <Button type="primary" onClick={()=>doAction('approved')}>Approve</Button>
              <Button danger onClick={()=>doAction('rejected')}>Reject</Button>
            </>}
          </Space>

          <div style={{ marginTop: 24 }}>
            <h4>History</h4>
            <Timeline
              items={[
                { children: `Created • ${new Date(data.created_at).toLocaleString()}` },
                data.approved_at && { children: `Updated • ${new Date(data.approved_at).toLocaleString()}` },
              ].filter(Boolean)}
            />
          </div>
        </>
      )}
    </Drawer>
  )
}

export default RequestDetailsDrawer

