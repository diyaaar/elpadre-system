import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Menu, ChevronLeft, ChevronRight } from 'lucide-react'
import { Calendar, dateFnsLocalizer, SlotInfo, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns'
import enUS from 'date-fns/locale/en-US'
import { motion } from 'framer-motion'
import { useCalendar, CalendarEvent } from '../contexts/CalendarContext'
import { useToast } from '../contexts/ToastContext'
import { CalendarSidebar } from '../components/calendar/CalendarSidebar'
import { EventFormModal } from '../components/calendar/EventFormModal'
import '../components/calendar/RBCTheme.css'

// ── date-fns localizer for RBC ───────────────────────────────
const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

// ── Map CalendarEvent → RBC event ───────────────────────────
interface RBCEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: CalendarEvent
}

function toRBCEvent(ev: CalendarEvent): RBCEvent {
  const isAllDay = typeof ev.allDay === 'boolean' ? ev.allDay : ev.start?.length === 10
  const start = ev.start ? new Date(ev.start) : new Date()
  const end = ev.end ? new Date(ev.end) : new Date(start.getTime() + 60 * 60 * 1000)
  return {
    id: ev.id,
    title: ev.summary || 'Untitled',
    start,
    end,
    allDay: isAllDay,
    resource: ev,
  }
}

// ── View type guard ──────────────────────────────────────────
type CalendarView = 'month' | 'week' | 'day'
const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Month',
  week: 'Week',
  day: 'Day',
}

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [slotStart, setSlotStart] = useState<Date | undefined>()
  const [slotEnd, setSlotEnd] = useState<Date | undefined>()

  const { events, loading, isAuthenticated, connectGoogleCalendar, fetchCalendars, fetchEvents, updateCurrentDate } = useCalendar()
  const { showToast } = useToast()

  // ── Initial load ────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      fetchCalendars()
      fetchEvents(currentDate, true)
      updateCurrentDate(currentDate)
    }
  }, [isAuthenticated])

  // ── Refresh on date change ──────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return
    updateCurrentDate(currentDate)
    const t = setTimeout(() => fetchEvents(currentDate, false), 150)
    return () => clearTimeout(t)
  }, [currentDate, isAuthenticated])

  // ── OAuth callback ──────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('calendar_connected') === 'true') {
      showToast('Google Calendar connected!', 'success', 3000)
      window.history.replaceState({}, '', window.location.pathname)
      window.location.reload()
    } else if (params.get('calendar_error')) {
      const err = params.get('calendar_error')
      showToast(`Failed to connect Google Calendar: ${err}`, 'error', 5000)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [showToast])

  // ── Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); navigate('prev'); break
        case 'ArrowRight': e.preventDefault(); navigate('next'); break
        case 't': case 'T': e.preventDefault(); setCurrentDate(new Date()); break
        case 'm': case 'M': e.preventDefault(); setView('month'); break
        case 'w': case 'W': e.preventDefault(); setView('week'); break
        case 'd': case 'D': e.preventDefault(); setView('day'); break
        case 'n': case 'N':
          e.preventDefault()
          setSelectedEvent(null)
          setSlotStart(undefined)
          setSlotEnd(undefined)
          setFormOpen(true)
          break
        case 'Escape': setFormOpen(false); break
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [view, currentDate])

  // ── Navigation ─────────────────────────────────────────────
  const navigate = useCallback((dir: 'prev' | 'next' | 'today') => {
    setCurrentDate(prev => {
      if (dir === 'today') return new Date()
      if (view === 'month') return dir === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)
      if (view === 'week') return dir === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)
      return dir === 'next' ? addDays(prev, 1) : subDays(prev, 1)
    })
  }, [view])

  // ── RBC handlers ───────────────────────────────────────────
  const handleSelectEvent = useCallback((rbcEvent: RBCEvent) => {
    setSelectedEvent(rbcEvent.resource)
    setSlotStart(undefined)
    setSlotEnd(undefined)
    setFormOpen(true)
  }, [])

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedEvent(null)
    setSlotStart(slotInfo.start)
    setSlotEnd(slotInfo.end)
    setFormOpen(true)
  }, [])

  const handleNewEvent = useCallback(() => {
    setSelectedEvent(null)
    setSlotStart(new Date())
    setSlotEnd(undefined)
    setFormOpen(true)
  }, [])

  const handleCloseForm = useCallback(() => {
    setFormOpen(false)
    setSelectedEvent(null)
    setSlotStart(undefined)
    setSlotEnd(undefined)
  }, [])

  // ── Event style: use the event's color ──────────────────────
  const eventStyleGetter = useCallback((rbcEvent: RBCEvent) => {
    const ev = rbcEvent.resource
    const bg = ev.color || 'rgb(16, 185, 129)'
    return {
      style: {
        backgroundColor: bg,
        borderColor: bg,
      },
    }
  }, [])

  // ── Header label ────────────────────────────────────────────
  const headerLabel = (() => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy')
    if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      return `Week of ${format(weekStart, 'MMM d, yyyy')}`
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy')
  })()

  // ── Unauthenticated state ───────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Connect Google Calendar</h2>
            <p className="text-slate-400 mb-6">
              Connect your Google Calendar to view and manage events alongside your tasks.
            </p>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={connectGoogleCalendar}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg shadow-emerald-500/20"
          >
            Connect Google Calendar
          </motion.button>
        </div>
      </div>
    )
  }

  const rbcEvents = events.map(toRBCEvent)

  return (
    <div className="flex flex-col md:flex-row gap-3 sm:gap-4 h-full">
      {/* Sidebar */}
      <CalendarSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col space-y-4 min-w-0">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          {/* Left: sidebar toggle + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white flex-shrink-0"
              aria-label="Toggle calendar list"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                {headerLabel}
              </h2>
              <p className="text-xs text-slate-500">
                {events.length} event{events.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
              {(['month', 'week', 'day'] as CalendarView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all
                    ${view === v
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('prev')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('today')}
                className="px-3 py-1.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-colors shadow shadow-emerald-500/20"
              >
                Today
              </button>
              <button
                onClick={() => navigate('next')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                aria-label="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* New event */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNewEvent}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-lg transition-colors shadow shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              New event
            </motion.button>
          </div>
        </motion.div>

        {/* ── Calendar body ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-1 relative"
          style={{ minHeight: view === 'month' ? 600 : 640 }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : (
            <Calendar<RBCEvent>
              localizer={localizer}
              events={rbcEvents}
              date={currentDate}
              view={view as View}
              onNavigate={setCurrentDate}
              onView={(v: string) => setView(v as CalendarView)}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              popup
              eventPropGetter={eventStyleGetter}
              style={{ height: view === 'month' ? 680 : 720 }}
              culture="en-US"
              startAccessor="start"
              endAccessor="end"
              titleAccessor="title"
              views={['month', 'week', 'day']}
              // Disable RBC's own toolbar (we use our own)
              toolbar={false}
            />
          )}
        </motion.div>
      </div>

      {/* ── Event Form Modal ── */}
      <EventFormModal
        isOpen={formOpen}
        onClose={handleCloseForm}
        event={selectedEvent}
        defaultStart={slotStart}
        defaultEnd={slotEnd}
      />
    </div>
  )
}
