import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const LeaveTypeDonut = ({ data }) => {
  const colors = (i) => (data[i]?.leave_type_color || '#1677ff')
  const rows = data.map((d) => ({ name: d.leave_type_name, value: Number(d.total_days || 0) }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie dataKey="value" data={rows} innerRadius={60} outerRadius={100} paddingAngle={2}>
          {rows.map((_, i) => (<Cell key={i} fill={colors(i)} />))}
        </Pie>
        <Tooltip formatter={(v, n) => [`${v} days`, n]} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default LeaveTypeDonut

