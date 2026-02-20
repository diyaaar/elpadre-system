// ============================================================
// TRANSACTION FORM — Modal/Slide-in form for creating/editing transactions
// Handles: category select → conditional tag select, receipt upload,
//          amount input (TL string), obligation link
// ============================================================

import { useState, useRef } from 'react'
import { X, TrendingUp, TrendingDown, Upload, Paperclip } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinance } from '../../../contexts/FinanceContext'
import type { FinanceTransaction } from '../types/finance.types'

interface TransactionFormProps {
    onClose: () => void
    onSuccess?: (txn: FinanceTransaction) => void
    presetType?: 'income' | 'expense'
    presetObligationId?: string
}

export function TransactionForm({ onClose, onSuccess, presetType, presetObligationId }: TransactionFormProps) {
    const { categories, obligations, getTagsForCategory, createTransaction } = useFinance()

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

    const fileInputRef = useRef<HTMLInputElement>(null)

    const filteredCategories = categories.filter((c) => c.type === type)
    const availableTags = categoryId ? getTagsForCategory(categoryId) : []
    const openObligations = obligations.filter((o) => !o.is_closed)

    const handleCategoryChange = (id: string) => {
        setCategoryId(id)
        setTagId('') // Reset tag when category changes
    }

    const handleTypeChange = (newType: 'income' | 'expense') => {
        setType(newType)
        setCategoryId('')
        setTagId('')
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null
        setReceiptFile(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Backdrop */}
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

                        {/* Tag — conditionally rendered based on category */}
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

                    {/* Link to Obligation (optional) */}
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

                    {/* Receipt Upload */}
                    <div>
                        <label className="block text-xs font-medium text-text-tertiary mb-1.5">Fiş / Fatura</label>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-white/20 rounded-xl text-text-tertiary hover:text-white hover:border-primary/40 transition-all text-sm"
                        >
                            {receiptFile ? (
                                <>
                                    <Paperclip className="w-4 h-4 text-primary" />
                                    <span className="text-primary truncate max-w-xs">{receiptFile.name}</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    <span>Dosya seç (JPG, PNG, PDF — max 15MB)</span>
                                </>
                            )}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Error */}
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
    )
}
