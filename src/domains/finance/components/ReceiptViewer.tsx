import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Loader2, ZoomIn, ZoomOut, Search } from 'lucide-react'
import { Portal } from '../../../components/Portal'

interface ReceiptViewerProps {
    url: string | null
    onClose: () => void
}

const MIN_SCALE = 0.25
const MAX_SCALE = 5
const ZOOM_STEP = 0.25

function getTouchDistance(touches: React.TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
}

export function ReceiptViewer({ url, onClose }: ReceiptViewerProps) {
    const [loading, setLoading] = useState(true)
    const [scale, setScale] = useState(1)
    const [position, setPosition] = useState({ x: 0, y: 0 })

    // Drag refs — use refs to avoid stale closures in event handlers
    const isDragging = useRef(false)
    const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 })

    // Pinch-to-zoom refs
    const lastPinchDist = useRef<number | null>(null)

    // Double-tap ref
    const lastTapTime = useRef(0)

    const isPdf = !!url && url.toLowerCase().includes('.pdf')

    // Reset when a new file opens
    useEffect(() => {
        if (url) {
            setLoading(true)
            setScale(1)
            setPosition({ x: 0, y: 0 })
        }
    }, [url])

    const clamp = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v))

    const adjustScale = useCallback((delta: number) => {
        setScale(s => clamp(s + delta))
    }, [])

    const resetZoom = useCallback(() => {
        setScale(1)
        setPosition({ x: 0, y: 0 })
    }, [])

    // ── Desktop scroll zoom ──────────────────────────────────
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
        setScale(s => clamp(s + delta))
    }, [])

    // ── Desktop drag (pan when zoomed in) ────────────────────
    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale <= 1) return
        isDragging.current = true
        dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: position.x, posY: position.y }
    }
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return
        setPosition({
            x: dragStart.current.posX + (e.clientX - dragStart.current.mouseX) / scale,
            y: dragStart.current.posY + (e.clientY - dragStart.current.mouseY) / scale,
        })
    }
    const handleMouseUp = () => { isDragging.current = false }

    // ── Double-click / double-tap to zoom ────────────────────
    const handleClick = () => {
        const now = Date.now()
        if (now - lastTapTime.current < 300) {
            if (scale > 1) { resetZoom() } else { setScale(2) }
        }
        lastTapTime.current = now
    }

    // ── Mobile pinch-to-zoom ─────────────────────────────────
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            lastPinchDist.current = getTouchDistance(e.touches)
        }
    }
    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && lastPinchDist.current !== null) {
            e.preventDefault()
            const newDist = getTouchDistance(e.touches)
            const ratio = newDist / lastPinchDist.current
            setScale(s => clamp(s * ratio))
            lastPinchDist.current = newDist
        }
    }
    const handleTouchEnd = () => { lastPinchDist.current = null }

    // ── Force download ────────────────────────────────────────
    const handleDownload = async () => {
        if (!url) return
        try {
            const response = await fetch(url)
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.style.display = 'none'
            a.href = blobUrl
            a.download = url.split('/').pop()?.split('?')[0] || `receipt-${Date.now()}`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(blobUrl)
            document.body.removeChild(a)
        } catch {
            window.open(url, '_blank')
        }
    }

    return (
        <Portal>
            <AnimatePresence>
                {url && (
                    <motion.div
                        key={url}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md select-none"
                    >
                        {/* ── Header Bar ── */}
                        <div className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0">

                            {/* Left spacer */}
                            <div className="flex-1" />

                            {/* Zoom controls — image only (PDF has native controls) */}
                            {!isPdf && (
                                <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl px-2 py-1">
                                    <button
                                        onClick={() => adjustScale(-ZOOM_STEP)}
                                        disabled={scale <= MIN_SCALE}
                                        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                                        title="Uzaklaştır"
                                    >
                                        <ZoomOut className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={resetZoom}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-white text-xs font-medium hover:bg-white/10 transition-all min-w-[62px] justify-center"
                                        title="Sıfırla"
                                    >
                                        <Search className="w-3 h-3 text-white/50 flex-shrink-0" />
                                        {Math.round(scale * 100)}%
                                    </button>

                                    <button
                                        onClick={() => adjustScale(ZOOM_STEP)}
                                        disabled={scale >= MAX_SCALE}
                                        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                                        title="Yakınlaştır"
                                    >
                                        <ZoomIn className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Right: download + close */}
                            <div className="flex items-center gap-2 flex-1 justify-end">
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-medium text-sm border border-white/10"
                                    title="İndir"
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">İndir</span>
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 bg-white/10 hover:bg-danger/70 text-white/80 hover:text-white rounded-xl transition-all border border-white/10"
                                    title="Kapat"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* ── Content Area ── */}
                        <div
                            className="flex-1 relative flex items-center justify-center overflow-hidden"
                            style={{ cursor: isPdf ? 'default' : scale > 1 ? 'grab' : 'zoom-in' }}
                            onWheel={isPdf ? undefined : handleWheel}
                        >
                            {/* Loading spinner */}
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                            )}

                            {isPdf ? (
                                /* PDF: use native browser controls */
                                <iframe
                                    key={url}
                                    src={`${url}#toolbar=1`}
                                    onLoad={() => setLoading(false)}
                                    className={`w-full h-full bg-white rounded-t-none transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                                    title="Receipt PDF"
                                />
                            ) : (
                                /* Image: custom zoom + pan + gestures */
                                <div
                                    className="w-full h-full flex items-center justify-center p-4 sm:p-8"
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    onClick={handleClick}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    <img
                                        key={url}
                                        src={url}
                                        onLoad={() => setLoading(false)}
                                        onError={() => setLoading(false)}
                                        alt="Receipt"
                                        draggable={false}
                                        style={{
                                            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                                            transformOrigin: 'center center',
                                            transition: isDragging.current ? 'none' : 'transform 0.15s ease',
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain',
                                            borderRadius: '12px',
                                            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
                                        }}
                                        className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                </div>
                            )}
                        </div>

                        {/* ── Bottom hint (image only) ── */}
                        {!isPdf && (
                            <div className="flex justify-center pb-3 flex-shrink-0">
                                <p className="text-white/30 text-xs">
                                    Çift tıkla yakınlaştır · Kaydır veya iki parmakla sıkıştır
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </Portal>
    )
}
