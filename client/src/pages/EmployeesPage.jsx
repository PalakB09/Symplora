import React, { useEffect, useState } from 'react'
import { Button, Drawer, Form, Input, DatePicker, Select, Space, Table, message } from 'antd'
import AppLayout from '../components/AppLayout.jsx'
import api from '../api/axios'

import EmployeeDetailsDrawer from '../components/EmployeeDetailsDrawer.jsx'
const EmployeesPage = () => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [show, setShow] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/employees?limit=100')
      setRows(data.data.employees)
    } catch (e) {
      message.error('Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onCreate = async () => {
    try {
      const values = await form.validateFields()
      await api.post('/employees', {
        ...values,
        joining_date: values.joining_date.format('YYYY-MM-DD'),
      })
      message.success('Employee created')
      setOpen(false)
      form.resetFields()
      load()
    } catch (e) {
      if (!e?.errorFields) message.error(e?.response?.data?.message || 'Failed to create employee')
    }
  }

  const columns = [
    { title: 'Emp ID', dataIndex: 'employee_id' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Dept', dataIndex: 'department' },
    { title: 'Role', dataIndex: 'role' },
    { title: 'Gender', dataIndex: 'gender' },
    { title: 'Joining', dataIndex: 'joining_date', render: (v)=> new Date(v).toLocaleDateString() },
    { title: 'Actions', key: 'actions', render: (_, r)=> (
      <Space>
        <Button onClick={()=>{ setSelected(r); setShow(true) }}>View</Button>
      </Space>
    )}
  ]

  return (
    <AppLayout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Employees</h3>
        <Space>
          <Button onClick={load}>Refresh</Button>
          <Button type="primary" onClick={() => setOpen(true)}>Add Employee</Button>
        </Space>
      </div>
      <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={{ pageSize: 10 }} />

      <Drawer title="Add Employee" open={open} onClose={() => setOpen(false)} onOk={onCreate} extra={<Space><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="primary" onClick={onCreate}>Create</Button></Space>}>
        <Form layout="vertical" form={form}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}> <Input /> </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}> <Input /> </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}> <Input.Password /> </Form.Item>
          <Form.Item name="department" label="Department" rules={[{ required: true }]}> <Input /> </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]} initialValue="employee">
            <Select options={[{value:'employee',label:'Employee'},{value:'hr',label:'HR'}]} />
          </Form.Item>
          <Form.Item name="gender" label="Gender">
            <Select allowClear options={[{value:'male',label:'Male'},{value:'female',label:'Female'},{value:'other',label:'Other'}]} />
          </Form.Item>
          <Form.Item name="joining_date" label="Joining Date" rules={[{ required: true }]}> <DatePicker style={{ width: '100%' }} /> </Form.Item>
        </Form>
      </Drawer>

      <EmployeeDetailsDrawer open={show} onClose={()=> setShow(false)} employee={selected} />
    </AppLayout>
  )
}

export default EmployeesPage

