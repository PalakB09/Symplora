import React, { useEffect, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Space, Table, Tag, message } from 'antd'
import AppLayout from '../components/AppLayout.jsx'
import api from '../api/axios'

const LeaveTypesPage = () => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/leave-types')
      setRows(data.data || [])
    } catch (e) {
      message.error('Failed to fetch leave types')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() }, [])

  const onCreate = async () => {
    try {
      const values = await form.validateFields()
      await api.post('/leave-types', values)
      message.success('Leave type created')
      setOpen(false)
      form.resetFields()
      load()
    } catch (e) {
      if (!e?.errorFields) message.error(e?.response?.data?.message || 'Create failed')
    }
  }

  const onDeactivate = async (r) => {
    Modal.confirm({
      title: `Deactivate ${r.name}?`,
      content: 'This will disable the leave type for new requests.',
      okType: 'danger',
      onOk: async ()=>{
        try {
          await api.delete(`/leave-types/${r.id}`)
          message.success('Leave type deactivated')
          load()
        } catch (e) {
          message.error(e?.response?.data?.message || 'Action failed')
        }
      }
    })
  }

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Default Days', dataIndex: 'default_days' },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Color', dataIndex: 'color', render: (c)=> <Tag color={c}>{c}</Tag> },
    { title: 'Actions', key: 'actions', render: (_, r)=> (
      <Space>
        <Button danger onClick={()=> onDeactivate(r)}>Deactivate</Button>
      </Space>
    ) }
  ]

  return (
    <AppLayout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Leave Types</h3>
        <Space>
          <Button onClick={load}>Refresh</Button>
          <Button type="primary" onClick={()=> setOpen(true)}>Add Type</Button>
        </Space>
      </div>

      <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={{ pageSize: 10 }} />

      <Modal title="Add Leave Type" open={open} onCancel={()=> setOpen(false)} onOk={onCreate} okText="Create">
        <Form layout="vertical" form={form}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}> <Input /> </Form.Item>
          <Form.Item name="description" label="Description"> <Input /> </Form.Item>
          <Form.Item name="default_days" label="Default Days" rules={[{ required: true }]}> <InputNumber min={0} max={365} style={{ width: '100%' }} /> </Form.Item>
          <Form.Item name="color" label="Color (hex)"> <Input placeholder="#3B82F6" /> </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  )
}

export default LeaveTypesPage

