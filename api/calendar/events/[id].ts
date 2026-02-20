import type { VercelRequest, VercelResponse } from '@vercel/node'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

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

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Supabase configuration missing' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: tokens, error: tokenError } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (tokenError || !tokens) {
    return res.status(401).json({ error: 'Google Calendar not connected' })
  }

  // Always use the freshest bearer token from the request header
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : tokens.access_token
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials({ access_token: bearerToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // ── PATCH: Update event using events.patch() (only sends changed fields) ──
  if (req.method === 'PATCH') {
    try {
      const body = req.body
      const calendarId = (req.query.calendarId as string) || body?.calendarId || 'primary'

      console.log(`[PATCH] event=${id} calendar=${calendarId}`)

      // Build start/end according to allDay flag
      type DateField = { date: string } | { dateTime: string; timeZone: string }
      let startField: DateField | undefined
      let endField: DateField | undefined

      if (body.allDay) {
        // All-day event: use "date" field (YYYY-MM-DD), no timeZone
        const startDate = typeof body.start === 'string' ? body.start.slice(0, 10) : undefined
        const endDate = typeof body.end === 'string' ? body.end.slice(0, 10) : undefined
        if (startDate) startField = { date: startDate }
        if (endDate) endField = { date: endDate }
      } else {
        // Timed event: use "dateTime" with explicit timeZone
        const tz = body.timeZone || 'Europe/Istanbul'
        if (body.start) startField = { dateTime: body.start, timeZone: tz }
        if (body.end) endField = { dateTime: body.end, timeZone: tz }
      }

      // Use patch() — only sends the fields we provide, no ETag conflicts
      const patchBody: Record<string, unknown> = {}
      if (body.summary !== undefined) patchBody.summary = body.summary
      if (body.description !== undefined) patchBody.description = body.description || null
      if (body.location !== undefined) patchBody.location = body.location || null
      if (body.colorId !== undefined) patchBody.colorId = body.colorId ? String(body.colorId) : null
      if (startField) patchBody.start = startField
      if (endField) patchBody.end = endField

      const response = await calendar.events.patch({
        calendarId,
        eventId: id,
        requestBody: patchBody,
      })

      const ev = response.data
      return res.status(200).json({
        id: ev.id || '',
        summary: ev.summary || 'Başlıksız Etkinlik',
        description: ev.description || undefined,
        start: ev.start?.dateTime || ev.start?.date || '',
        end: ev.end?.dateTime || ev.end?.date || '',
        colorId: ev.colorId || undefined,
        location: ev.location || undefined,
        calendarId,
        allDay: !!ev.start?.date,
      })
    } catch (err) {
      console.error('Error updating event:', err)
      const detail = err instanceof Error ? err.message : String(err)
      return res.status(500).json({ error: 'Failed to update event', detail })
    }
  }

  // ── DELETE: Remove event, handle "already deleted" gracefully ──
  if (req.method === 'DELETE') {
    try {
      const calendarId = (req.query.calendarId as string) || 'primary'

      console.log(`[DELETE] event=${id} calendar=${calendarId}`)

      await calendar.events.delete({ calendarId, eventId: id })

      // 204 No Content is the correct success response for DELETE
      return res.status(204).end()
    } catch (err: unknown) {
      const status = (err as { code?: number })?.code
      // 404 / 410 = already deleted — treat as success
      if (status === 404 || status === 410) {
        return res.status(204).end()
      }
      console.error('Error deleting event:', err)
      const detail = err instanceof Error ? err.message : String(err)
      return res.status(500).json({ error: 'Failed to delete event', detail })
    }
  }

  return res.status(405).json({ error: `Method ${req.method} not allowed` })
}
