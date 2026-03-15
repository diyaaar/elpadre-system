import { motion, AnimatePresence } from 'framer-motion'
import { X, Settings2 } from 'lucide-react'
import { TagSelector } from './TagSelector'
import { Portal } from './Portal'

interface TagManagementModalProps {
    isOpen: boolean
    onClose: () => void
}

export function TagManagementModal({ isOpen, onClose }: TagManagementModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <Portal>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="bg-background-elevated rounded-2xl border border-white/10 shadow-glass-lg w-full max-w-md overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-background-tertiary/30">
                                <div className="flex items-center gap-2 text-text-primary">
                                    <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
                                        <Settings2 className="w-4 h-4" />
                                    </div>
                                    <h2 className="text-base font-medium">Etiket Yönetimi</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-5 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                <p className="text-xs text-text-tertiary mb-4">
                                    Buradan sistemdeki etiketleri yönetebilir, yeni etiket oluşturabilir veya kullanmadığınız etiketleri kalıcı olarak silebilirsiniz. Sildiğiniz etiketler onlara sahip olan tüm görevlerden de kaldırılır.
                                </p>
                                <TagSelector selectedTagIds={[]} onChange={() => { }} />
                            </div>
                        </motion.div>
                    </motion.div>
                </Portal>
            )}
        </AnimatePresence>
    )
}
