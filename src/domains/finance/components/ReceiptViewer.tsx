import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Loader2 } from 'lucide-react'
import { Portal } from '../../../components/Portal'

interface ReceiptViewerProps {
    url: string | null
    onClose: () => void
}

export function ReceiptViewer({ url, onClose }: ReceiptViewerProps) {
    const [loading, setLoading] = useState(true)

    // Reset loading spinner whenever the URL changes (different receipt opened)
    useEffect(() => {
        if (url) setLoading(true)
    }, [url])

    const isPdf = !!url && url.toLowerCase().includes('.pdf')

    // Force-download: fetch as blob to bypass browser's "view in new tab" behavior
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
        } catch (error) {
            console.error('[ReceiptViewer] Download failed:', error)
            window.open(url, '_blank')
        }
    }

    return (
        // Portal must wrap AnimatePresence so exit animations work correctly
        <Portal>
            <AnimatePresence>
                {url && (
                    <motion.div
                        key={url}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md"
                    >
                        {/* Header Bar */}
                        <div className="flex items-center justify-between p-4">
                            <div className="flex-1" />
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-medium text-sm backdrop-blur-md border border-white/10"
                                    title="İndir"
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">İndir</span>
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 bg-white/10 hover:bg-danger/80 hover:text-white text-white/80 rounded-xl transition-all backdrop-blur-md border border-white/10"
                                    title="Kapat"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                            )}

                            {isPdf ? (
                                <iframe
                                    key={url}
                                    src={`${url}#toolbar=0`}
                                    onLoad={() => setLoading(false)}
                                    className={`w-full max-w-4xl h-full bg-white rounded-xl shadow-2xl transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                                    title="Receipt PDF"
                                />
                            ) : (
                                <img
                                    key={url}
                                    src={url}
                                    onLoad={() => setLoading(false)}
                                    onError={() => setLoading(false)}
                                    alt="Receipt"
                                    className={`max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Portal>
    )
}
