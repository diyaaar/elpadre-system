import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Loader2 } from 'lucide-react'
import { Portal } from '../../../components/Portal'

interface OmitBaseProps {
    url: string | null
    onClose: () => void
}

export function ReceiptViewer({ url, onClose }: OmitBaseProps) {
    const [loading, setLoading] = useState(true)

    if (!url) return null

    // Heuristic: check if the URL contains .pdf
    // Note: Supabase storage public URLs often don't have .pdf if uploaded without extension, 
    // but our upload logic always adds an extension (e.g. receipt-12345.pdf)
    const isPdf = url.toLowerCase().includes('.pdf')

    // Download handler that forces a download instead of opening a new tab
    const handleDownload = async () => {
        try {
            const response = await fetch(url)
            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)

            const a = document.createElement('a')
            a.style.display = 'none'
            a.href = blobUrl
            // Extract filename from URL or fallback
            const filename = url.split('/').pop()?.split('?')[0] || `receipt-${Date.now()}`
            a.download = filename

            document.body.appendChild(a)
            a.click()

            window.URL.revokeObjectURL(blobUrl)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Download failed:', error)
            // Fallback to opening in new tab
            window.open(url, '_blank')
        }
    }

    return (
        <AnimatePresence>
            <Portal>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md"
                >
                    {/* Header Bar */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
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
                                src={`${url}#toolbar=0`}
                                onLoad={() => setLoading(false)}
                                className={`w-full max-w-4xl h-full bg-white rounded-xl shadow-2xl transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                                title="Receipt PDF"
                            />
                        ) : (
                            <img
                                src={url}
                                onLoad={() => setLoading(false)}
                                alt="Receipt"
                                className={`max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                            />
                        )}
                    </div>
                </motion.div>
            </Portal>
        </AnimatePresence>
    )
} 
