import React, { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import AppLayout from '../components/AppLayout.jsx'
import api from '../api/axios'
import { message } from 'antd'

const CalendarPage = () => {
  const [events, setEvents] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const [leavesRes, holidaysRes] = await Promise.all([
          api.get('/leaves?limit=100'),
          api.get(`/holidays/year/${new Date().getFullYear()}`),
        ])
        const leaveEvents = leavesRes.data.data.leaveRequests.map(l => ({
          id: `L${l.id}`,
          title: `${l.leave_type_name}${l.employee_name ? ' - ' + l.employee_name : ''}`,
          start: l.start_date,
          end: new Date(new Date(l.end_date).getTime() + 86400000).toISOString().slice(0,10),
          color: l.status === 'approved' ? (l.leave_type_color || '#1677ff') : (l.status === 'pending' ? '#faad14' : '#999999'),
          extendedProps: { status: l.status, days: l.total_days }
        }))
        const holidayEvents = holidaysRes.data.data.holidays.map(h => ({
          id: `H${h.id}`,
          title: `Holiday: ${h.name}`,
          start: h.date,
          end: h.date,
          color: '#999999',
        }))
        setEvents([...leaveEvents, ...holidayEvents])
      } catch (e) {
        message.error('Failed to load calendar data')
      }
    }
    load()
  }, [])

  return (
    <AppLayout>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
        initialView="dayGridMonth"
        height="75vh"
        events={events}
        eventMouseEnter={(info)=>{
          const { status, days } = info?.event?.extendedProps || {}
          const el = document.createElement('div')
          el.style.position = 'absolute'
          el.style.background = '#111827'
          el.style.color = '#fff'
          el.style.padding = '6px 8px'
          el.style.borderRadius = '6px'
          el.style.fontSize = '12px'
          el.style.pointerEvents = 'none'
          el.innerText = `${info.event.title}\n${status ? 'Status: ' + status : ''}${days ? '\
Days: ' + days : ''}`
          info.el._tooltip = el
          document.body.appendChild(el)
          const move = (e)=>{
            el.style.left = (e.pageX + 12) + 'px'; el.style.top = (e.pageY + 12) + 'px'
          }
          info.el._move = move
          info.el.addEventListener('mousemove', move)
        }}
        eventMouseLeave={(info)=>{
          const el = info.el._tooltip
          if (el) { el.remove(); delete info.el._tooltip }
          if (info.el._move) { info.el.removeEventListener('mousemove', info.el._move); delete info.el._move }
        }}
      />
    </AppLayout>
  )
}

export default CalendarPage

