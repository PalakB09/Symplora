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
          title: `${l.leave_type_name} - ${l.employee_name || ''}`,
          start: l.start_date,
          end: new Date(new Date(l.end_date).getTime() + 86400000).toISOString().slice(0,10),
          color: l.leave_type_color,
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
      />
    </AppLayout>
  )
}

export default CalendarPage

