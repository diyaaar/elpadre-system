// ============================================================
// TRANSACTION FORM — Modal rendered via Portal to document.body
// Escapes framer-motion transform containing block
// AI Receipt Auto-Fill: gpt-4o-mini via /api/finance/analyze-receipt
// ============================================================

import { useState, useRef } from 'react'
import { X, TrendingUp, TrendingDown, Upload, Paperclip, Camera, Sparkles, Loader2, AlertTriangle, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinance } from '../../../contexts/FinanceContext'
import type { FinanceTransaction } from '../types/finance.types'
import { Portal } from '../../../components/Portal'

interface TransactionFormProps {
    onClose: () => void
    onSuccess?: (txn: FinanceTransaction) => void
    presetType?: 'income' | 'expense'
    presetObligationId?: string
}

interface ReceiptAnalysisResult {
    type: 'income' | 'expense'
    amountKurus: number
    amountTl: string
    date: string
    note: string
    matched_category_id: string | null
    suggested_new_category_name: string | null
}

export function TransactionForm({ onClose, onSuccess, presetType, presetObligationId }: TransactionFormProps) {
    const { categories, obligations, getTagsForCategory, createTransaction, createCategory } = useFinance()

    const now = new Date()
    const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)

    const [type, setType] = useState<'income' | 'expense'>(presetType || 'expense')
    const [amountTl, setAmountTl] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [tagId, setTagId] = useState('')
    const [obligationId, setObligationId] = useState(presetObligationId || '')
    const [occurredAt, setOccurredAt] = useState(localDatetime)
    const [note, setNote] = useState('')
    const [receiptFile, setReceiptFile] = useState<File | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // AI scan state
    const [isScanning, setIsScanning] = useState(false)
    const [scanError, setScanError] = useState<string | null>(null)
    const [suggestedCategoryName, setSuggestedCategoryName] = useState<string | null>(null)
    const [creatingCategory, setCreatingCategory] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const filteredCategories = categories.filter((c) => c.type === type)
    const availableTags = categoryId ? getTagsForCategory(categoryId) : []
    const openObligations = obligations.filter((o) => !o.is_closed)

    const handleCategoryChange = (id: string) => {
        setCategoryId(id)
        setTagId('')
        setSuggestedCategoryName(null)
    }

    const handleTypeChange = (newType: 'income' | 'expense') => {
        setType(newType)
        setCategoryId('')
        setTagId('')
        setSuggestedCategoryName(null)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null
        setReceiptFile(file)
        setScanError(null)
        setSuggestedCategoryName(null)
    }

    // ── AI Receipt Scanner ──────────────────────────────────
    const handleScanReceipt = async () => {
        if (!receiptFile) return

        setIsScanning(true)
        setScanError(null)
        setSuggestedCategoryName(null)

        try {
            // Convert file to base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                    const result = reader.result as string
                    // Strip the data URL prefix to get raw base64
                    const base64Data = result.split(',')[1]
                    resolve(base64Data)
                }
                reader.onerror = () => reject(new Error('Dosya okunamadı'))
                reader.readAsDataURL(receiptFile)
            })

            const response = await fetch('/api/finance/analyze-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: base64,
                    imageMimeType: receiptFile.type || 'image/jpeg',
                    // Send all categories with their type so the LLM can also
                    // infer transaction type. The server validates category IDs.
                    categories: categories.map((c) => ({
                        id: c.id,
                        name: c.name,
                        type: c.type,
                    })),
                }),
            })

            if (!response.ok) {
                const { error: errMsg } = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }))
                throw new Error(errMsg || `Sunucu hatası: ${response.status}`)
            }

            const result: ReceiptAnalysisResult = await response.json()

            // ── Populate form fields ──────────────────────
            setType(result.type)
            setAmountTl(result.amountTl)
            setNote(result.note)

            // Convert YYYY-MM-DD → datetime-local format (YYYY-MM-DDTHH:mm)
            if (result.date) {
                const dateObj = new Date(`${result.date}T12:00:00`)
                const localDt = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16)
                setOccurredAt(localDt)
            }

            // ── Category matching ─────────────────────────
            if (result.matched_category_id) {
                setCategoryId(result.matched_category_id)
                setTagId('')
            } else if (result.suggested_new_category_name) {
                setSuggestedCategoryName(result.suggested_new_category_name)
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Fiş analiz edilemedi'
            setScanError(msg)
        } finally {
            setIsScanning(false)
        }
    }

    // ── Quick-create suggested category ────────────────────
    const handleCreateSuggestedCategory = async () => {
        if (!suggestedCategoryName) return
        setCreatingCategory(true)
        try {
            const newCat = await createCategory({
                type,
                name: suggestedCategoryName,
                color: '#f59e0b',
            })
            if (newCat) {
                setCategoryId(newCat.id)
                setTagId('')
                setSuggestedCategoryName(null)
            }
        } finally {
            setCreatingCategory(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        if (!amountTl || parseFloat(amountTl.replace(',', '.')) <= 0) {
            setError('Geçerli bir tutar girin')
            return
        }

        setSubmitting(true)
        try {
            const txn = await createTransaction({
                type,
                amountTl,
                category_id: categoryId || undefined,
                tag_id: tagId || undefined,
                obligation_id: obligationId || undefined,
                occurred_at: new Date(occurredAt).toISOString(),
                note: note.trim() || undefined,
                receiptFile,
            })

            if (txn) {
                onSuccess?.(txn)
                onClose()
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Portal>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.target === e.currentTarget && onClose()}
            >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', bounce: 0.2 }}
                    className="relative w-full max-w-lg bg-background-secondary border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                        <h2 className="text-lg font-semibold text-white">Yeni İşlem</h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-white hover:bg-white/10 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Type Toggle */}
                        <div className="flex gap-2 p-1 bg-background-elevated rounded-xl">
                            {(['income', 'expense'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => handleTypeChange(t)}
                                    className={`
                    flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${type === t
                                            ? t === 'income'
                                                ? 'bg-success/20 text-success border border-success/30'
                                                : 'bg-danger/20 text-danger border border-danger/30'
                                            : 'text-text-tertiary hover:text-text-primary'
                                        }
                  `}
                                >
                                    {t === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    {t === 'income' ? 'Gelir' : 'Gider'}
                                </button>
                            ))}
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Tutar (₺)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary font-medium">₺</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amountTl}
                                    onChange={(e) => setAmountTl(e.target.value)}
                                    placeholder="0,00"
                                    required
                                    className="w-full pl-8 pr-4 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-lg font-semibold"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Category */}
                            <div>
                                <label className="block text-xs font-medium text-text-tertiary mb-1.5">Kategori</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm appearance-none"
                                >
                                    <option value="">Seçiniz...</option>
                                    {filteredCategories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Tag */}
                            <AnimatePresence>
                                {categoryId && availableTags.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                    >
                                        <label className="block text-xs font-medium text-text-tertiary mb-1.5">Etiket</label>
                                        <select
                                            value={tagId}
                                            onChange={(e) => setTagId(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm appearance-none"
                                        >
                                            <option value="">Seçiniz...</option>
                                            {availableTags.map((tag) => (
                                                <option key={tag.id} value={tag.id}>{tag.name}</option>
                                            ))}
                                        </select>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* AI Suggested Category Banner */}
                        <AnimatePresence>
                            {suggestedCategoryName && !categoryId && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="flex items-center justify-between gap-3 px-3 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span className="text-xs text-amber-300 truncate">
                                            Önerilen: <span className="font-semibold text-amber-200">{suggestedCategoryName}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleCreateSuggestedCategory}
                                            disabled={creatingCategory}
                                            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
                                        >
                                            {creatingCategory ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Plus className="w-3 h-3" />
                                            )}
                                            Oluştur ve Seç
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSuggestedCategoryName(null)}
                                            className="p-1 text-amber-400/60 hover:text-amber-300 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Tarih & Saat</label>
                            <input
                                type="datetime-local"
                                value={occurredAt}
                                onChange={(e) => setOccurredAt(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm"
                            />
                        </div>

                        {/* Link to Obligation */}
                        {openObligations.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-text-tertiary mb-1.5">Yükümlülüğe Bağla (opsiyonel)</label>
                                <select
                                    value={obligationId}
                                    onChange={(e) => setObligationId(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm appearance-none"
                                >
                                    <option value="">Bağlama</option>
                                    {openObligations.map((ob) => (
                                        <option key={ob.id} value={ob.id}>{ob.description}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Note */}
                        <div>
                            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Not</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Açıklama..."
                                rows={2}
                                className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm resize-none"
                            />
                        </div>

                        {/* Receipt Upload — File & Camera */}
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-text-tertiary">Fiş / Fatura</label>

                            {/* File name display */}
                            {receiptFile && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                                    <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="text-primary text-xs truncate flex-1">{receiptFile.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => { setReceiptFile(null); setScanError(null); setSuggestedCategoryName(null) }}
                                        className="text-text-tertiary hover:text-white transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Upload buttons row */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-white/20 rounded-xl text-text-tertiary hover:text-white hover:border-primary/40 transition-all text-xs"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Dosya Seç</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-white/20 rounded-xl text-text-tertiary hover:text-white hover:border-primary/40 transition-all text-xs"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>Kamera</span>
                                </button>
                            </div>

                            {/* Hidden file inputs */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            {/* capture="environment" prompts the rear camera on mobile */}
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {/* AI Scan Button — only visible when a file is selected */}
                            <AnimatePresence>
                                {receiptFile && (
                                    <motion.button
                                        type="button"
                                        initial={{ opacity: 0, scale: 0.97 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.97 }}
                                        onClick={handleScanReceipt}
                                        disabled={isScanning || submitting}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600/20 to-purple-600/20 hover:from-violet-600/30 hover:to-purple-600/30 border border-violet-500/30 hover:border-violet-400/50 rounded-xl text-violet-200 hover:text-white transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isScanning ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Yapay Zeka İnceliyor...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                <span>✨ Fişi Tara (AI)</span>
                                            </>
                                        )}
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            {/* Scan error */}
                            <AnimatePresence>
                                {scanError && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-start gap-2 px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg"
                                    >
                                        <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                                        <p className="text-danger text-xs">{scanError}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Form Error */}
                        {error && (
                            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 bg-background-elevated hover:bg-background-tertiary text-text-secondary hover:text-white rounded-xl border border-white/5 transition-all text-sm font-medium"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </Portal>
    )
}
