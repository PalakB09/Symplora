import React, { useState } from 'react'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext.jsx'

const { Title, Text } = Typography

const LoginPage = () => {
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', values)
      login(data.data.user, data.data.token)
      message.success('Welcome!')
      window.location.href = '/'
    } catch (err) {
      message.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card style={{ width: 360 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>Leave Management</Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please enter your email' }, { type: 'email' }]}> 
            <Input placeholder="name@company.com" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter your password' }]}>
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>Sign in</Button>
          <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>HR login from seed: alice.brown@company.com / password123</Text>
        </Form>
      </Card>
    </div>
  )
}

export default LoginPage

