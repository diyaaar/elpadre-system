import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabase, getAuthenticatedCalendar, withExponentialBackoff } from './utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Get user ID from query
  const userId = req.query.user_id as string

  if (!userId) {
    return res.status(401).json({ error: 'User ID required' })
  }

  // Initialize Supabase client
  const supabase = getSupabase()
  if (!supabase) {
    console.error('[calendars] Missing Supabase config')
    return res.status(500).json({ error: 'Supabase configuration missing' })
  }

  if (req.method === 'GET') {
    try {
      // Get user's calendars from database
      const { data: calendars, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true })

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === 'PGRST301' || error.message?.includes('Not Acceptable')) {
          return res.status(200).json({ calendars: [] })
        }
        throw error
      }

      return res.status(200).json({ calendars: calendars || [] })
    } catch (err) {
      console.error('Error fetching calendars:', err)
      return res.status(500).json({ error: 'Failed to fetch calendars' })
    }
  }

  if (req.method === 'POST') {
    try {
      // Sync calendars from Google Calendar
      console.log('[calendars POST] Starting sync for user:', userId)
      // Initialize Google Calendar API
      const calendar = await getAuthenticatedCalendar(supabase, userId)
      if (!calendar) {
        return res.status(401).json({ error: 'Google Calendar not connected' })
      }

      // Fetch calendar list from Google
      const response: any = await withExponentialBackoff(() => calendar.calendarList.list({
        minAccessRole: 'reader',
      }))

      const googleCalendars = response.data.items || []

      // Map Google Calendar colors
      const colorMap: Record<string, string> = {
        '1': '#a4bdfc', // Lavender
        '2': '#7ae7bf', // Sage
        '3': '#dbadff', // Grape
        '4': '#ff887c', // Flamingo
        '5': '#fbd75b', // Banana
        '6': '#ffb878', // Tangerine
        '7': '#46d6db', // Peacock
        '8': '#e1e1e1', // Graphite
        '9': '#5484ed', // Blueberry
        '10': '#51b749', // Basil
        '11': '#dc2127', // Tomato
      }

      // Sync calendars to database
      const syncedCalendars = []
      for (const googleCal of googleCalendars) {
        if (!googleCal.id) continue

        const calendarColor = googleCal.backgroundColor || colorMap[googleCal.colorId || ''] || '#3b82f6'
        const isPrimary = googleCal.primary === true

        // Check if calendar already exists
        const { data: existing } = await supabase
          .from('calendars')
          .select('id')
          .eq('user_id', userId)
          .eq('google_calendar_id', googleCal.id)
          .maybeSingle()

        if (existing) {
          // Update existing calendar
          const { data: updated } = await supabase
            .from('calendars')
            .update({
              name: googleCal.summary || 'Untitled Calendar',
              color: calendarColor,
              is_primary: isPrimary,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single()

          if (updated) syncedCalendars.push(updated)
        } else {
          // Create new calendar
          const { data: created } = await supabase
            .from('calendars')
            .insert({
              user_id: userId,
              name: googleCal.summary || 'Untitled Calendar',
              color: calendarColor,
              is_primary: isPrimary,
              google_calendar_id: googleCal.id,
            })
            .select()
            .single()

          if (created) syncedCalendars.push(created)
        }
      }

      return res.status(200).json({ calendars: syncedCalendars })
    } catch (err: any) {
      console.error('[calendars POST] Error syncing calendars:', {
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
      })
      return res.status(500).json({ error: 'Failed to sync calendars', detail: err?.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

