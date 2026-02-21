// ============================================================
// RECURRING TEMPLATES SECTION
// Modal rendered via Portal — escapes framer-motion transform
// ============================================================

import { useState } from 'react'
import { Plus, Play, Trash2, X, RefreshCcw, Pencil } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinance } from '../../../contexts/FinanceContext'
import { formatCurrency, formatInputAmountTl, kurusToTl } from '../types/finance.types'
import { Portal } from '../../../components/Portal'

export function RecurringSection() {
    const { recurringTemplates, categories, createRecurringTemplate, updateRecurringTemplate, generateTransactionFromTemplate, deleteRecurringTemplate } = useFinance()

    const [showForm, setShowForm] = useState(false)
    const [generatingId, setGeneratingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

    // Form state
    const [formType, setFormType] = useState<'income' | 'expense'>('expense')
    const [formName, setFormName] = useState('')
    const [formAmount, setFormAmount] = useState('')
    const [formCategoryId, setFormCategoryId] = useState('')
    const [formFrequency, setFormFrequency] = useState<'monthly' | 'yearly'>('monthly')
    const [formNextOccurrence, setFormNextOccurrence] = useState(new Date().toISOString().slice(0, 10))
    const [submitting, setSubmitting] = useState(false)

    const today = new Date().toISOString().slice(0, 10)
    const isToday = (dateStr: string) => dateStr === today
    const isPast = (dateStr: string) => dateStr < today
    const filteredCategories = categories.filter((c) => c.type === formType)

    const handleEdit = (tmpl: any) => {
        setEditingTemplateId(tmpl.id)
        setFormType(tmpl.type)
        setFormName(tmpl.name)
        setFormAmount(kurusToTl(tmpl.amount)) // Use kurusToTl to populate input correctly
        setFormCategoryId(tmpl.category_id || '')
        setFormFrequency(tmpl.frequency)
        setFormNextOccurrence(tmpl.next_occurrence)
        setShowForm(true)
    }

    const handleGenerate = async (templateId: string) => {
        setGeneratingId(templateId)
        await generateTransactionFromTemplate(templateId)
        setGeneratingId(null)
    }

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        await deleteRecurringTemplate(id)
        setDeletingId(null)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!formName || !formAmount) return
        setSubmitting(true)

        let result;
        if (editingTemplateId) {
            result = await updateRecurringTemplate(editingTemplateId, {
                type: formType,
                amountTl: formAmount,
                category_id: formCategoryId || null,
                name: formName,
                frequency: formFrequency,
                next_occurrence: formNextOccurrence,
            })
        } else {
            result = await createRecurringTemplate({
                type: formType,
                amountTl: formAmount,
                category_id: formCategoryId || undefined,
                name: formName,
                frequency: formFrequency,
                next_occurrence: formNextOccurrence,
            })
        }

        setSubmitting(false)
        if (result) {
            setShowForm(false)
            setFormName('')
            setFormAmount('')
            setFormCategoryId('')
            setEditingTemplateId(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Tekrarlayan İşlemler</h3>
                <button
                    onClick={() => {
                        setEditingTemplateId(null)
                        setFormName('')
                        setFormAmount('')
                        setFormCategoryId('')
                        setFormType('expense')
                        const d = new Date()
                        // Ensure we always default to the exact local YYYY-MM-DD string safely
                        d.setDate(d.getDate() + 1)
                        setFormNextOccurrence(d.toISOString().slice(0, 10))
                        setShowForm(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/25 transition-all text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Şablon
                </button>
            </div>

            {recurringTemplates.length === 0 ? (
                <p className="text-center text-text-tertiary text-sm py-8">Tekrarlayan şablon yok.</p>
            ) : (
                <div className="space-y-2">
                    {recurringTemplates.map((tmpl) => {
                        const cat = categories.find((c) => c.id === tmpl.category_id)
                        const due = isToday(tmpl.next_occurrence)
                        const overdue = isPast(tmpl.next_occurrence)

                        return (
                            <motion.div
                                key={tmpl.id}
                                layout
                                className={`
                  group flex items-center gap-4 p-4 rounded-xl border transition-all
                  ${overdue || due
                                        ? 'bg-warning/5 border-warning/20'
                                        : 'bg-background-elevated border-white/5 hover:border-white/10'
                                    }
                `}
                            >
                                <RefreshCcw className={`w-4 h-4 flex-shrink-0 ${due || overdue ? 'text-warning' : 'text-text-tertiary'}`} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-white">{tmpl.name}</span>
                                        {due && <span className="text-xs text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded-full">Bugün</span>}
                                        {overdue && !due && <span className="text-xs text-danger bg-danger/10 border border-danger/20 px-1.5 py-0.5 rounded-full">Gecikti</span>}
                                        {cat && (
                                            <span className="text-xs px-1.5 py-0.5 rounded-full text-text-secondary"
                                                style={{ backgroundColor: `${cat.color}20`, border: `1px solid ${cat.color}30` }}>
                                                {cat.name}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-text-tertiary mt-0.5">
                                        {tmpl.frequency === 'monthly' ? 'Aylık' : 'Yıllık'} · Sonraki: {new Date(tmpl.next_occurrence).toLocaleDateString('tr-TR')}
                                    </p>
                                </div>

                                <span className={`text-sm font-bold flex-shrink-0 ${tmpl.type === 'income' ? 'text-success' : 'text-danger'}`}>
                                    {tmpl.type === 'income' ? '+' : '-'}{formatCurrency(tmpl.amount)}
                                </span>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleGenerate(tmpl.id)}
                                        disabled={generatingId === tmpl.id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                                    >
                                        <Play className="w-3 h-3" />
                                        {generatingId === tmpl.id ? '...' : 'Oluştur'}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(tmpl)}
                                        className="p-1.5 rounded-lg text-text-tertiary hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(tmpl.id)}
                                        disabled={deletingId === tmpl.id}
                                        className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 transition-all disabled:opacity-50"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* Create Template Modal — rendered in Portal to escape transform containing block */}
            <AnimatePresence>
                {showForm && (
                    <Portal>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.target === e.currentTarget && setShowForm(false)}
                        >
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                            <motion.form
                                onSubmit={handleSubmit}
                                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                                className="relative w-full max-w-md bg-background-secondary border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                    <h2 className="text-lg font-semibold text-white">{editingTemplateId ? 'Şablon Düzenle' : 'Yeni Tekrarlayan Şablon'}</h2>
                                    <button type="button" onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-text-tertiary hover:text-white hover:bg-white/10 transition-all">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    {/* Type */}
                                    <div className="flex gap-2 p-1 bg-background-elevated rounded-xl">
                                        {(['income', 'expense'] as const).map((t) => (
                                            <button key={t} type="button" onClick={() => { setFormType(t); setFormCategoryId('') }}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formType === t ? 'bg-primary/20 text-white border border-primary/30' : 'text-text-tertiary hover:text-white'}`}>
                                                {t === 'income' ? 'Gelir' : 'Gider'}
                                            </button>
                                        ))}
                                    </div>

                                    <div>
                                        <label className="text-xs text-text-tertiary mb-1 block">İsim *</label>
                                        <input value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder="Kira, Maaş vb."
                                            className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                                    </div>

                                    <div>
                                        <label className="text-xs text-text-tertiary mb-1 block">Tutar (₺) *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">₺</span>
                                            <input type="text" inputMode="decimal" placeholder="0,00" value={formAmount} onChange={(e) => setFormAmount(formatInputAmountTl(e.target.value))} required
                                                className="w-full pl-8 pr-4 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-text-tertiary mb-1 block">Kategori</label>
                                            <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40">
                                                <option value="">Seçiniz...</option>
                                                {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-tertiary mb-1 block">Sıklık</label>
                                            <select value={formFrequency} onChange={(e) => setFormFrequency(e.target.value as 'monthly' | 'yearly')}
                                                className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40">
                                                <option value="monthly">Aylık</option>
                                                <option value="yearly">Yıllık</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-text-tertiary mb-1 block">İlk Tarih</label>
                                        <input type="date" value={formNextOccurrence} onChange={(e) => setFormNextOccurrence(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                                    </div>

                                    <div className="flex gap-3 pt-1">
                                        <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-background-elevated text-text-secondary rounded-xl border border-white/5 text-sm">İptal</button>
                                        <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-60">
                                            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
                                        </button>
                                    </div>
                                </div>
                            </motion.form>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>
        </div>
    )
}
