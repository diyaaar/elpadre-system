import type { VercelRequest, VercelResponse } from '@vercel/node'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  // Get user ID from Authorization header or session
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let userId: string | null = null
  try {
    // For now, we'll need to get user_id from the query or body
    userId = req.query.user_id as string || (req.body && req.body.user_id) || null
  } catch (err) {
    return res.status(401).json({ error: 'Invalid authentication' })
  }

  if (!userId) {
    return res.status(401).json({ error: 'User ID required' })
  }

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables in event edit endpoint')
    return res.status(500).json({ error: 'Supabase configuration missing' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Get user's tokens
  const { data: tokens, error: tokenError } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (tokenError || !tokens) {
    return res.status(401).json({ error: 'Google Calendar not connected' })
  }

  // Initialize Google Calendar API
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials({ access_token: tokens.access_token })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  if (req.method === 'PATCH') {
    try {
      const updates = req.body

      // Assume event is on primary calendar. For a full robust solution, we'd need to know the calendarId.
      // Or we can get it from the event first, or pass it via client.
      const calendarId = req.query.calendarId as string || req.body.calendarId || 'primary'

      // First fetch the existing event to merge with updates properly
      const eventResponse = await calendar.events.get({
        calendarId,
        eventId: id,
      })
      const event = eventResponse.data

      // Apply updates
      if (updates.summary) event.summary = updates.summary
      if (updates.description !== undefined) event.description = updates.description
      if (updates.start) event.start = { dateTime: updates.start, timeZone: 'UTC' }
      if (updates.end) event.end = { dateTime: updates.end, timeZone: 'UTC' }
      if (updates.colorId !== undefined) event.colorId = updates.colorId ? String(updates.colorId) : undefined
      if (updates.location !== undefined) event.location = updates.location

      const response = await calendar.events.update({
        calendarId,
        eventId: id,
        requestBody: event,
      })

      const eventData = response.data
      const updatedEventFormatted = {
        id: eventData.id || '',
        summary: eventData.summary || 'Untitled Event',
        description: eventData.description,
        start: eventData.start?.dateTime || eventData.start?.date || '',
        end: eventData.end?.dateTime || eventData.end?.date || '',
        colorId: eventData.colorId,
        location: eventData.location,
        calendarId,
      }

      return res.status(200).json(updatedEventFormatted)
    } catch (err) {
      console.error('Error updating event:', err)
      return res.status(500).json({ error: 'Failed to update event' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const calendarId = req.query.calendarId as string || 'primary'
      await calendar.events.delete({
        calendarId,
        eventId: id,
      })

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('Error deleting event:', err)
      return res.status(500).json({ error: 'Failed to delete event' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
