import React, { useEffect, useState } from 'react'
import { Drawer, Tabs, List, Space, Tag, Button, message, DatePicker, Select } from 'antd'
import api from '../api/axios'
import StatusTag from './StatusTag.jsx'
import RequestDetailsDrawer from './RequestDetailsDrawer.jsx'
import ApplyLeaveModal from './ApplyLeaveModal.jsx'
const { RangePicker } = DatePicker

const EmployeeDetailsDrawer = ({ open, onClose, employee }) => {
  const [balances, setBalances] = useState([])
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ status: '', range: [], leave_type_id: '' })
  const [detailsId, setDetailsId] = useState(null)
  const [applyOpen, setApplyOpen] = useState(false)

  const load = async () => {
    if (!employee) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50', employee_id: String(employee.id) })
      if (filters.status) params.set('status', filters.status)
      if (filters.range?.length===2) {
        params.set('start_date', filters.range[0].format('YYYY-MM-DD'))
        params.set('end_date', filters.range[1].format('YYYY-MM-DD'))
      }
      const [b, l] = await Promise.all([
        api.get(`/employees/${employee.id}/leave-balances`),
        api.get(`/leaves?${params.toString()}`),
      ])
      setBalances(b.data.data.balances)
      setLeaves(l.data.data.leaveRequests)
    } catch (e) {
      message.error('Failed to load employee details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ if (open) load() }, [open, employee, filters])

  const approve = async (id) => {
    try {
      await api.patch(`/leaves/${id}/status`, { status: 'approved' })
      message.success('Approved')
      load()
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to approve')
    }
  }

  const reject = async (id) => {
    try {
      await api.patch(`/leaves/${id}/status`, { status: 'rejected', rejection_reason: 'Rejected by HR from employee view' })
      message.success('Rejected')
      load()
    } catch (e) {
      message.error(e?.response?.data?.message || 'Failed to reject')
    }
  }

  return (
    <Drawer width={720} title={employee ? `${employee.name} (${employee.employee_id})` : 'Employee'} open={open} onClose={onClose} extra={<Button type="primary" onClick={()=> setApplyOpen(true)}>Apply Leave</Button>}>
      <Tabs
        items={[
          {
            key: 'balances',
            label: 'Leave Balances',
            children: (
              <List
                loading={loading}
                dataSource={balances}
                renderItem={(b)=>(
                  <List.Item actions={[<Tag color={b.leave_type_color}>{b.leave_type_name}</Tag>] }>
                    <div style={{ width: '100%' }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <div>{b.leave_type_description}</div>
                        <div><b>{(b.total_days - b.used_days).toFixed(1)}</b> remaining / {b.total_days}</div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )
          },
          {
            key: 'leaves',
            label: 'Leaves',
            children: (
              <>
                <Space style={{ marginBottom: 8 }}>
                  <Select
                    placeholder="Status"
                    value={filters.status}
                    style={{ width: 140 }}
                    onChange={(v)=> setFilters(f=>({ ...f, status: v }))}
                    options={[
                      { value: '', label: 'All' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' },
                      { value: 'cancelled', label: 'Cancelled' },
                    ]}
                  />
                  <RangePicker onChange={(v)=> setFilters(f=>({ ...f, range: v || [] }))} />
                </Space>
                <List
                  loading={loading}
                  dataSource={leaves}
                  renderItem={(l)=>(
                    <List.Item
                      actions={[
                        <Button onClick={()=> setDetailsId(l.id)}>Details</Button>,
                        l.status==='pending' && <Space>
                          <Button type="primary" onClick={()=>approve(l.id)}>Approve</Button>
                          <Button danger onClick={()=>reject(l.id)}>Reject</Button>
                        </Space>
                      ]}
                    >
                      <List.Item.Meta
                        title={<Space><StatusTag status={l.status} /> {l.leave_type_name}</Space>}
                        description={`${new Date(l.start_date).toLocaleDateString()} - ${new Date(l.end_date).toLocaleDateString()} • ${l.total_days} days ${l.is_half_day?'• Half-Day':''}`}
                      />
                    </List.Item>
                  )}
                />
                <RequestDetailsDrawer id={detailsId} open={!!detailsId} onClose={()=> setDetailsId(null)} afterAction={load} />
              </>
            )
          }
        ]}
      />
      <ApplyLeaveModal open={applyOpen} onClose={()=> setApplyOpen(false)} onSuccess={load} employeeId={employee?.id} />
    </Drawer>
  )
}

export default EmployeeDetailsDrawer

