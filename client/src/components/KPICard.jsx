import React from 'react'
import { Card, Statistic } from 'antd'

const KPICard = ({ title, value, suffix, color }) => {
  return (
    <Card hoverable style={{ borderTop: `3px solid ${color || '#1677ff'}` }}>
      <Statistic title={title} value={value} suffix={suffix} />
    </Card>
  )
}

export default KPICard

