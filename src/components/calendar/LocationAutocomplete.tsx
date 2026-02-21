import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2, X } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────
interface NominatimResult {
    place_id: number
    display_name: string
    address: {
        road?: string
        house_number?: string
        neighbourhood?: string
        suburb?: string
        city_district?: string
        district?: string
        county?: string
        city?: string
        town?: string
        village?: string
        state?: string
        country?: string
        postcode?: string
    }
}

interface LocationSuggestion {
    placeId: number
    formatted: string   // clean string sent to Google Calendar
    display: string     // shown in the dropdown
}

interface LocationAutocompleteProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

// ── Utility: build a clean, Google Calendar-friendly address ──
function formatAddress(result: NominatimResult): string {
    const a = result.address
    const parts: string[] = []

    // Street + house number
    if (a.road) {
        parts.push(a.house_number ? `${a.road} ${a.house_number}` : a.road)
    }

    // Neighbourhood / suburb / district
    const area = a.neighbourhood || a.suburb || a.city_district || a.district
    if (area) parts.push(area)

    // City / town / village
    const city = a.city || a.town || a.village || a.county
    if (city) parts.push(city)

    // State
    if (a.state) parts.push(a.state)

    // Country
    if (a.country) parts.push(a.country)

    // Fallback to Nominatim's full display_name if nothing parsed
    return parts.length >= 2 ? parts.join(', ') : result.display_name
}

// ── Hook: debounced Nominatim search ─────────────────────────
function useNominatim(query: string, debounceMs = 500) {
    const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
    const [loading, setLoading] = useState(false)
    const abortRef = useRef<AbortController | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current)

        const trimmed = query.trim()
        if (trimmed.length < 3) {
            setSuggestions([])
            setLoading(false)
            return
        }

        setLoading(true)

        timerRef.current = setTimeout(async () => {
            // Cancel the previous in-flight request
            if (abortRef.current) abortRef.current.abort()
            abortRef.current = new AbortController()

            try {
                const url = new URL('https://nominatim.openstreetmap.org/search')
                url.searchParams.set('q', trimmed)
                url.searchParams.set('format', 'json')
                url.searchParams.set('addressdetails', '1')
                url.searchParams.set('limit', '6')
                // Prefer results within Turkey
                url.searchParams.set('countrycodes', 'tr')

                const res = await fetch(url.toString(), {
                    signal: abortRef.current.signal,
                    headers: {
                        // Required by Nominatim ToS — identify your app
                        'Accept-Language': 'tr',
                    },
                })

                if (!res.ok) throw new Error('Nominatim error')

                const data: NominatimResult[] = await res.json()
                setSuggestions(
                    data.map((r) => ({
                        placeId: r.place_id,
                        formatted: formatAddress(r),
                        display: r.display_name,
                    }))
                )
            } catch (err: any) {
                if (err?.name !== 'AbortError') {
                    console.warn('[LocationAutocomplete] Nominatim fetch failed:', err)
                    setSuggestions([])
                }
            } finally {
                setLoading(false)
            }
        }, debounceMs)

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [query, debounceMs])

    return { suggestions, loading }
}

// ── Component ─────────────────────────────────────────────────
export function LocationAutocomplete({
    value,
    onChange,
    placeholder = 'Konum ekle',
    className = '',
}: LocationAutocompleteProps) {
    const [inputValue, setInputValue] = useState(value)
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Only search when the user is actively typing (not after selecting)
    const [searching, setSearching] = useState(false)
    const { suggestions, loading } = useNominatim(searching ? inputValue : '')

    // Sync prop → input when value is cleared externally
    useEffect(() => {
        setInputValue(value)
    }, [value])

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
                setSearching(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Show dropdown when we have suggestions
    useEffect(() => {
        setOpen(suggestions.length > 0)
        setActiveIndex(-1)
    }, [suggestions])

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setInputValue(val)
        setSearching(true)
        onChange(val) // keep parent in sync as the user types
    }, [onChange])

    const handleSelect = useCallback((suggestion: LocationSuggestion) => {
        setInputValue(suggestion.formatted)
        onChange(suggestion.formatted)
        setOpen(false)
        setSearching(false)
        setActiveIndex(-1)
        inputRef.current?.blur()
    }, [onChange])

    const handleClear = useCallback(() => {
        setInputValue('')
        onChange('')
        setSearching(false)
        setOpen(false)
        inputRef.current?.focus()
    }, [onChange])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open) return

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setActiveIndex(prev => Math.max(prev - 1, 0))
                break
            case 'Enter':
                e.preventDefault()
                if (activeIndex >= 0 && suggestions[activeIndex]) {
                    handleSelect(suggestions[activeIndex])
                }
                break
            case 'Escape':
                setOpen(false)
                setSearching(false)
                break
        }
    }, [open, activeIndex, suggestions, handleSelect])

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Input */}
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pl-9 pr-8 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60 transition-all"
                />
                {/* Clear button or spinner */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {loading ? (
                        <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                    ) : inputValue ? (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                            aria-label="Konumu temizle"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Dropdown */}
            {open && suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
                    <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
                        {suggestions.map((suggestion, index) => (
                            <li
                                key={suggestion.placeId}
                                role="option"
                                aria-selected={index === activeIndex}
                                onClick={() => handleSelect(suggestion)}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${index === activeIndex
                                        ? 'bg-emerald-500/15 text-white'
                                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <MapPin className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${index === activeIndex ? 'text-emerald-400' : 'text-slate-500'
                                    }`} />
                                <span className="text-sm leading-snug line-clamp-2">
                                    {suggestion.formatted}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="px-3 py-1.5 border-t border-white/5 text-[10px] text-slate-600">
                        © <a
                            href="https://www.openstreetmap.org/copyright"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-slate-400 transition-colors"
                            onClick={e => e.stopPropagation()}
                        >
                            OpenStreetMap
                        </a> katkıcıları
                    </div>
                </div>
            )}
        </div>
    )
}
