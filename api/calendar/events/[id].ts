import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabase, getAuthenticatedCalendar, withExponentialBackoff } from '../utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = req.query.user_id as string || (req.body && req.body.user_id) || null
  if (!userId) {
    return res.status(401).json({ error: 'User ID required' })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase configuration missing' })
  }

  // Get authenticated calendar (this handles token refresh if needed)
  const calendar = await getAuthenticatedCalendar(supabase, userId)
  if (!calendar) {
    return res.status(401).json({ error: 'Google Calendar not connected or token expired' })
  }

  // ── PATCH: Update event using events.patch() ─────────────────
  if (req.method === 'PATCH') {
    try {
      const body = req.body

      // Determine target Google calendar ID
      let googleCalendarId = 'primary'
      const requestedCalendarId = (req.query.calendarId as string) || body?.calendarId

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

      console.log(`[PATCH] event=${id} calendar=${googleCalendarId}`)

      // Build start/end according to allDay flag
      // We must explicitly set the unused field (date vs dateTime) to null
      // so Google Calendar doesn't throw a 400 Bad Request if changing event type.
      let startField: any
      let endField: any

      if (body.allDay !== undefined) {
        if (body.allDay) {
          const startDate = typeof body.start === 'string' ? body.start.slice(0, 10) : undefined
          let endDate = typeof body.end === 'string' ? body.end.slice(0, 10) : undefined

          // Google Calendar requires all-day event end-dates to be exclusive
          if (startDate && startDate === endDate) {
            const d = new Date(startDate)
            d.setDate(d.getDate() + 1)
            endDate = d.toISOString().slice(0, 10)
          }

          if (startDate) startField = { date: startDate, dateTime: null }
          if (endDate) endField = { date: endDate, dateTime: null }
        } else {
          const tz = body.timeZone || 'Europe/Istanbul'
          // Strip any trailing Z or +HH:MM offset so Google interprets the time
          // as a wall-clock time in the given timeZone, not as UTC.
          const stripOffset = (dt: string) => dt.replace(/(Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19)
          if (body.start) startField = { dateTime: stripOffset(body.start), timeZone: tz, date: null }
          if (body.end) endField = { dateTime: stripOffset(body.end), timeZone: tz, date: null }
        }
      } else {
        // Fallback if allDay is not provided (though our frontend sends it)
        if (body.start) {
          const isDateOnly = body.start.length === 10
          startField = isDateOnly
            ? { date: body.start }
            : { dateTime: body.start.replace(/(Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19), timeZone: body.timeZone || 'Europe/Istanbul' }
        }
        if (body.end) {
          const isDateOnly = body.end.length === 10
          endField = isDateOnly
            ? { date: body.end }
            : { dateTime: body.end.replace(/(Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19), timeZone: body.timeZone || 'Europe/Istanbul' }
        }
      }

      const patchBody: any = {}
      if (body.summary !== undefined) patchBody.summary = body.summary
      if (body.description !== undefined) patchBody.description = body.description || null
      if (body.location !== undefined) patchBody.location = body.location || null
      if (body.colorId !== undefined) patchBody.colorId = body.colorId ? String(body.colorId) : null
      if (startField) patchBody.start = startField
      if (endField) patchBody.end = endField
      if (body.attendees && Array.isArray(body.attendees)) {
        patchBody.attendees = body.attendees.map((email: string) => ({ email }))
      }

      const patchParams: any = {
        calendarId: googleCalendarId,
        eventId: id,
        requestBody: patchBody,
      }

      if (body.attendees && body.attendees.length > 0) {
        patchParams.sendUpdates = 'all'
      }

      const response: any = await withExponentialBackoff(() => calendar.events.patch(patchParams))
      const ev = response.data

      let meetLinkRet: string | undefined
      if (ev.conferenceData?.entryPoints) {
        const videoEntryPoint = ev.conferenceData.entryPoints.find((ep: any) => ep.entryPointType === 'video')
        if (videoEntryPoint?.uri) meetLinkRet = videoEntryPoint.uri
      }

      return res.status(200).json({
        id: ev.id || '',
        summary: ev.summary || 'Başlıksız Etkinlik',
        description: ev.description || undefined,
        start: ev.start?.dateTime || ev.start?.date || '',
        end: ev.end?.dateTime || ev.end?.date || '',
        colorId: ev.colorId || undefined,
        location: ev.location || undefined,
        calendarId: requestedCalendarId || 'primary',
        allDay: !!ev.start?.date,
        status: ev.status || 'confirmed',
        meetLink: meetLinkRet,
        attendees: ev.attendees || undefined,
      })
    } catch (err) {
      console.error('Error updating event:', err)
      return res.status(500).json({ error: 'Failed to update event', detail: (err as any)?.message })
    }
  }

  // ── DELETE: Remove event ─────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      let googleCalendarId = 'primary'
      const requestedCalendarId = (req.query.calendarId as string)

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

      console.log(`[DELETE] event=${id} calendar=${googleCalendarId}`)

      await withExponentialBackoff(() => calendar.events.delete({ calendarId: googleCalendarId, eventId: id }))
      return res.status(204).end()
    } catch (err: any) {
      if (err.code === 404 || err.code === 410) {
        return res.status(204).end()
      }
      console.error('Error deleting event:', err)
      return res.status(500).json({ error: 'Failed to delete event', detail: err?.message })
    }
  }

  return res.status(405).json({ error: `Method ${req.method} not allowed` })
}
