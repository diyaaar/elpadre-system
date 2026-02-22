import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabase, getAuthenticatedCalendar, withExponentialBackoff } from './utils'

// ── Local types ──────────────────────────────────────────────
interface CalendarRecord {
  id: string
  google_calendar_id: string | null
  color: string
  name: string
  is_primary: boolean
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })

  // user_id can come from query string (GET) or request body (POST)
  const userId = (req.query.user_id as string) || (req.body?.user_id as string) || null
  if (!userId) return res.status(401).json({ error: 'User ID required' })

  const supabase = getSupabase()
  if (!supabase) {
    console.error('[events] Missing Supabase environment variables')
    return res.status(500).json({ error: 'Supabase configuration missing' })
  }

  // ── GET: Fetch events ────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { timeMin, timeMax, calendarIds, syncToken } = req.query

      // Either timeMin & timeMax OR syncToken should be provided
      if (!syncToken && (!timeMin || !timeMax)) {
        return res.status(400).json({ error: 'timeMin and timeMax are required when no syncToken is provided' })
      }

      const calendar = await getAuthenticatedCalendar(supabase, userId)
      if (!calendar) {
        return res.status(401).json({ error: 'Google Calendar not connected. Please reconnect.' })
      }

      const requestedCalendarIds = calendarIds
        ? (calendarIds as string).split(',').filter(Boolean)
        : []

      // Get user's calendars from database
      const { data: userCalendars } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', userId)

      let calendarsToFetch: Array<{ id: string; googleId: string; color: string; name: string }> = []

      if (userCalendars && userCalendars.length > 0) {
        const filtered: CalendarRecord[] = requestedCalendarIds.length > 0
          ? userCalendars.filter((c: CalendarRecord) => requestedCalendarIds.includes(c.id))
          : userCalendars

        calendarsToFetch = filtered
          .filter((c: CalendarRecord) => c.google_calendar_id)
          .map((c: CalendarRecord) => ({
            id: c.id,
            googleId: c.google_calendar_id!,
            color: c.color,
            name: c.name,
          }))
      }

      if (calendarsToFetch.length === 0) {
        calendarsToFetch = [{ id: 'primary', googleId: 'primary', color: '#10b981', name: 'Primary' }]
      }

      const allEvents: Array<{
        id: string; summary: string; description?: string
        start: string; end: string; allDay: boolean
        colorId?: string; location?: string; calendarId: string; color?: string
        status?: string
        meetLink?: string
        attendees?: any[]
      }> = []

      let nextSyncToken: string | null = null

      for (const cal of calendarsToFetch) {
        try {
          const listParams: any = {
            calendarId: cal.googleId,
            maxResults: 2500,
            singleEvents: true,
          }

          if (syncToken) {
            listParams.syncToken = syncToken as string
          } else {
            listParams.timeMin = timeMin as string
            listParams.timeMax = timeMax as string
            // orderBy is only compatible with time filters, not syncToken
            listParams.orderBy = 'startTime'
          }

          const response = await withExponentialBackoff(() => calendar.events.list(listParams))

          // Save the latest sync token (we assume single calendar logic if multiple we should probably return a map)
          if (response.data.nextSyncToken) {
            nextSyncToken = response.data.nextSyncToken
          }

          const items = response.data.items || []
          for (const item of items) {
            if (!item?.id) continue

            // if event was deleted
            const status = item.status
            if (status === 'cancelled') {
              allEvents.push({
                id: item.id,
                status: 'cancelled',
                summary: '', start: '', end: '', allDay: false, calendarId: cal.id,
              })
              continue
            }

            const isAllDay = !item.start?.dateTime
            const start = item.start?.dateTime || item.start?.date || ''
            const end = item.end?.dateTime || item.end?.date || ''

            // Extract meet link
            let meetLink: string | undefined
            if (item.conferenceData?.entryPoints) {
              const videoEntryPoint = item.conferenceData.entryPoints.find((ep: any) => ep.entryPointType === 'video')
              if (videoEntryPoint?.uri) meetLink = videoEntryPoint.uri
            }

            allEvents.push({
              id: item.id,
              summary: item.summary || 'Untitled Event',
              description: item.description || undefined,
              start,
              end,
              allDay: isAllDay,
              colorId: item.colorId || undefined,
              location: item.location || undefined,
              calendarId: cal.id,
              color: cal.color,
              status: item.status || 'confirmed',
              meetLink,
              attendees: item.attendees || undefined,
            })
          }
        } catch (err: any) {
          if (err?.code === 410) {
            // Sync token expired
            return res.status(410).json({ error: 'Sync token expired, full sync required.' })
          }
          console.error(`[events GET] Error fetching calendar ${cal.name}:`, err)
        }
      }

      // Sort existing events
      allEvents.sort((a, b) => {
        if (!a.start || !b.start) return 0
        return new Date(a.start).getTime() - new Date(b.start).getTime()
      })

      return res.status(200).json({ events: allEvents, nextSyncToken })

    } catch (err: any) {
      console.error('[events GET] Error:', err?.message)
      return res.status(500).json({ error: 'Failed to fetch events' })
    }
  }

  // ── POST: Create event ───────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const {
        summary, title,
        description,
        start, end,
        startDate, endDate,
        startDateTime, endDateTime,
        allDay,
        colorId,
        location,
        calendarId: requestedCalendarId,
        timeZone,
        attendees,
        addMeetLink,
        eventType,
        focusTimeProperties,
        outOfOfficeProperties,
      } = req.body

      const eventTitle = (summary || title || '').trim()
      if (!eventTitle) {
        return res.status(400).json({ error: 'Event title (summary) is required' })
      }

      const calendar = await getAuthenticatedCalendar(supabase, userId)
      if (!calendar) {
        return res.status(401).json({ error: 'Google Calendar not connected. Please reconnect.' })
      }

      // Determine target Google calendar ID
      let googleCalendarId = 'primary'
      if (requestedCalendarId && requestedCalendarId !== 'primary') {
        const { data: calRecord } = await supabase
          .from('calendars')
          .select('google_calendar_id')
          .eq('id', requestedCalendarId)
          .eq('user_id', userId)
          .maybeSingle()
        if (calRecord?.google_calendar_id) {
          googleCalendarId = calRecord.google_calendar_id
        }
      }

      // Always default to Europe/Istanbul for this app; never fall back to server-side UTC
      const tz = timeZone || 'Europe/Istanbul'

      // Build start/end for Google Calendar API (allDay uses date, timed uses dateTime)
      let googleStart: { date?: string; dateTime?: string; timeZone?: string }
      let googleEnd: { date?: string; dateTime?: string; timeZone?: string }

      const isAllDay = allDay === true || (typeof start === 'string' && start.length === 10)

      if (isAllDay) {
        const sDate = startDate || (typeof start === 'string' ? start.slice(0, 10) : null)
        let eDate = endDate || (typeof end === 'string' ? end.slice(0, 10) : sDate)
        if (!sDate) return res.status(400).json({ error: 'startDate is required for all-day events' })

        // Google Calendar requires all-day event end-dates to be exclusive
        if (sDate === eDate) {
          const d = new Date(sDate)
          d.setDate(d.getDate() + 1)
          eDate = d.toISOString().slice(0, 10)
        }

        googleStart = { date: sDate }
        googleEnd = { date: eDate || sDate }
      } else {
        const sDt = startDateTime || start
        const eDt = endDateTime || end
        if (!sDt || !eDt) return res.status(400).json({ error: 'start and end dateTime are required' })

        // IMPORTANT: Do NOT use new Date(...).toISOString() here.
        // toISOString() always converts to UTC and appends 'Z', which causes Google
        // Calendar to ignore the timeZone field, resulting in a +3h offset for Istanbul.
        // Instead, strip any trailing 'Z' or offset suffix and send the local datetime
        // string as-is, paired with an explicit IANA timeZone.
        const stripOffset = (dt: string) => {
          // Remove trailing Z (UTC marker) or +HH:MM / -HH:MM offset so the string
          // is treated as a "wall clock" time in the given timeZone.
          return dt.replace(/(Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19)
        }
        googleStart = { dateTime: stripOffset(sDt), timeZone: tz }
        googleEnd = { dateTime: stripOffset(eDt), timeZone: tz }
      }

      const eventResource: any = {
        summary: eventTitle,
        description: description || undefined,
        location: location || undefined,
        start: googleStart,
        end: googleEnd,
        colorId: colorId ? String(colorId) : undefined,
      }

      if (attendees && Array.isArray(attendees)) {
        eventResource.attendees = attendees.map(email => ({ email }))
      }

      if (addMeetLink) {
        eventResource.conferenceData = {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      }

      if (eventType) {
        eventResource.eventType = eventType
        if (eventType === 'focusTime' && focusTimeProperties) {
          eventResource.focusTimeProperties = focusTimeProperties
        } else if (eventType === 'outOfOffice' && outOfOfficeProperties) {
          eventResource.outOfOfficeProperties = outOfOfficeProperties
        }
      }

      const insertParams: any = {
        calendarId: googleCalendarId,
        requestBody: eventResource,
      }

      if (addMeetLink) {
        insertParams.conferenceDataVersion = 1
      }

      if (attendees && attendees.length > 0) {
        insertParams.sendUpdates = 'all' // notify attendees
      }

      const response = await withExponentialBackoff(() => calendar.events.insert(insertParams))

      const ev = response.data
      const evIsAllDay = !ev.start?.dateTime

      let meetLinkRet: string | undefined
      if (ev.conferenceData?.entryPoints) {
        const videoEntryPoint = ev.conferenceData.entryPoints.find((ep: any) => ep.entryPointType === 'video')
        if (videoEntryPoint?.uri) meetLinkRet = videoEntryPoint.uri
      }

      return res.status(200).json({
        id: ev.id || '',
        summary: ev.summary || 'Untitled Event',
        description: ev.description || undefined,
        start: ev.start?.dateTime || ev.start?.date || '',
        end: ev.end?.dateTime || ev.end?.date || '',
        allDay: evIsAllDay,
        colorId: ev.colorId || undefined,
        location: ev.location || undefined,
        calendarId: requestedCalendarId || 'primary',
        status: ev.status || 'confirmed',
        meetLink: meetLinkRet,
        attendees: ev.attendees || undefined,
      })

    } catch (err: any) {
      console.error('[events POST] Error creating event:', {
        message: err?.message,
        code: err?.code,
        status: err?.status,
      })
      return res.status(500).json({
        error: 'Failed to create event',
        detail: err?.message,
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
