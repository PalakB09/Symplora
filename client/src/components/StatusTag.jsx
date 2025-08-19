import React from 'react'
import { Tag } from 'antd'
import { CheckCircleTwoTone, ClockCircleTwoTone, CloseCircleTwoTone, MinusCircleTwoTone } from '@ant-design/icons'

const map = {
  approved: { color: 'green', icon: <CheckCircleTwoTone twoToneColor="#52c41a" /> },
  pending: { color: 'orange', icon: <ClockCircleTwoTone twoToneColor="#faad14" /> },
  rejected: { color: 'red', icon: <CloseCircleTwoTone twoToneColor="#ff4d4f" /> },
  cancelled: { color: 'default', icon: <MinusCircleTwoTone twoToneColor="#bfbfbf" /> },
}

const StatusTag = ({ status }) => {
  const s = String(status || '').toLowerCase()
  const cfg = map[s] || { color: 'default', icon: null }
  return <Tag color={cfg.color}>{cfg.icon} <span style={{ marginLeft: 6, textTransform: 'capitalize' }}>{s || 'unknown'}</span></Tag>
}

export default StatusTag

