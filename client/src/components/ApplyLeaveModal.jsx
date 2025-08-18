import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Form, Select, DatePicker, Input, Switch, Radio, message } from 'antd'
import dayjs from 'dayjs'
import api from '../api/axios'

const { RangePicker } = DatePicker

const ApplyLeaveModal = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm()
  const [leaveTypes, setLeaveTypes] = useState([])
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(false)
  const isHalfDay = Form.useWatch('is_half_day', form)

  useEffect(() => {
    const load = async () => {
      try {
        const [ltRes, hRes] = await Promise.all([
          api.get('/leave-types'),
          api.get(`/holidays/year/${dayjs().year()}`),
        ])
        setLeaveTypes(ltRes.data.data)
        setHolidays(hRes.data.data.holidays?.map(h => h.date))
      } catch (e) {
        message.error('Failed to load leave types/holidays')
      }
    }
    if (open) load()
  }, [open])

  const holidaySet = useMemo(() => new Set(holidays), [holidays])

  const disabledDate = (date) => {
    // Disable past days, weekends, and public holidays
    if (!date) return false
    if (date.isBefore(dayjs(), 'day')) return true
    const day = date.day()
    if (day === 0 || day === 6) return true
    if (holidaySet.has(date.format('YYYY-MM-DD'))) return true
    return false
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const payload = {
        leave_type_id: values.leave_type_id,
        reason: values.reason,
        is_half_day: !!values.is_half_day,
        half_day_session: values.is_half_day ? values.half_day_session : undefined,
      }
      if (values.is_half_day) {
        payload.start_date = values.half_date.format('YYYY-MM-DD')
        payload.end_date = values.half_date.format('YYYY-MM-DD')
      } else {
        payload.start_date = values.dates[0].format('YYYY-MM-DD')
        payload.end_date = values.dates[1].format('YYYY-MM-DD')
      }
      await api.post('/leaves', payload)
      message.success('Leave applied successfully')
      form.resetFields()
      onSuccess?.()
      onClose?.()
    } catch (e) {
      if (e?.errorFields) return // antd validation
      message.error(e?.response?.data?.message || 'Failed to apply leave')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onCancel={onClose} onOk={handleOk} okText="Apply" confirmLoading={loading} title="Apply for Leave">
      <Form layout="vertical" form={form}>
        <Form.Item name="leave_type_id" label="Leave Type" rules={[{ required: true }]}> 
          <Select placeholder="Select leave type" options={leaveTypes.map(t => ({ value: t.id, label: t.name }))} />
        </Form.Item>

        <Form.Item label="Half Day" name="is_half_day" valuePropName="checked">
          <Switch />
        </Form.Item>

        {isHalfDay ? (
          <>
            <Form.Item name="half_date" label="Date" rules={[{ required: true }]}> 
              <DatePicker style={{ width: '100%' }} disabledDate={disabledDate} />
            </Form.Item>
            <Form.Item name="half_day_session" label="Session" rules={[{ required: true }]}> 
              <Radio.Group>
                <Radio.Button value="AM">AM</Radio.Button>
                <Radio.Button value="PM">PM</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </>
        ) : (
          <Form.Item name="dates" label="Date Range" rules={[{ required: true }]}> 
            <RangePicker style={{ width: '100%' }} disabledDate={disabledDate} />
          </Form.Item>
        )}

        <Form.Item name="reason" label="Reason" rules={[{ required: true, min: 10 }]}> 
          <Input.TextArea rows={4} placeholder="Provide a clear reason" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ApplyLeaveModal

