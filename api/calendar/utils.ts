import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        return null
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
}

export async function getAuthenticatedCalendar(supabase: ReturnType<typeof getSupabase>, userId: string) {
    if (!supabase) return null

    const { data: tokens, error: tokenError } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (tokenError || !tokens) return null

    let accessToken = tokens.access_token
    const now = Date.now()

    // Proactively refresh if token expires within 5 minutes
    if (tokens.expiry_date - now < 5 * 60 * 1000) {
        try {
            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    refresh_token: tokens.refresh_token,
                    grant_type: 'refresh_token',
                }),
            })

            if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json()
                accessToken = refreshData.access_token
                await supabase
                    .from('google_calendar_tokens')
                    .update({
                        access_token: refreshData.access_token,
                        expiry_date: Date.now() + (refreshData.expires_in * 1000),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', userId)
            }
        } catch (err) {
            console.warn('[calendar utils] Token refresh failed, proceeding with existing token:', err)
        }
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    )
    oauth2Client.setCredentials({ access_token: accessToken })

    return google.calendar({ version: 'v3', auth: oauth2Client })
}

/**
 * Executes a function with exponential backoff for expected API errors (403, 429, 500).
 */
export async function withExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000
): Promise<T> {
    let attempt = 0

    while (true) {
        try {
            return await operation()
        } catch (error: any) {
            attempt++

            const status = error?.code || error?.status || (error?.response && error.response.status)
            const isRetryable = status === 403 || status === 429 || status >= 500

            if (!isRetryable || attempt > maxRetries) {
                throw error
            }

            // 403 can also be "forbiddenForNonOrganizer" or other hard fails.
            // We check if it's a rate limit.
            if (status === 403) {
                const reason = error?.errors?.[0]?.reason
                if (reason && reason !== 'rateLimitExceeded' && reason !== 'userRateLimitExceeded') {
                    throw error // Not a rate limit 403, so don't retry.
                }
            }

            // Calculate delay with jitter: baseDelay * 2^attempt + random(0..1000)
            const delay = (baseDelayMs * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 1000)
            console.warn(`[calendar utils] API error ${status}. Retrying in ${delay}ms (attempt ${attempt} of ${maxRetries})...`)

            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }
}
