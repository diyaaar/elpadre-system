// ============================================================
// OBLIGATION SECTION — List of obligations (payable/receivable)
// Shows derived remaining_amount — never reads a stored field
// Both modals use Portal to escape framer-motion transform
// ============================================================

import { useState } from 'react'
import { Plus, X, Check, CreditCard, HandIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinance } from '../../../contexts/FinanceContext'
import { formatCurrency } from '../types/finance.types'
import type { ObligationWithDerived } from '../types/finance.types'
import { TransactionForm } from './TransactionForm'
import { Portal } from '../../../components/Portal'

export function ObligationSection() {
    const {
        obligations,
        createObligation,
        closeObligation,
        deleteObligation,
        getObligationDetail,
    } = useFinance()

    const [activeTab, setActiveTab] = useState<'payable' | 'receivable'>('payable')
    const [showForm, setShowForm] = useState(false)
    const [showClosed, setShowClosed] = useState(false)
    const [detail, setDetail] = useState<ObligationWithDerived | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [showPaymentForm, setShowPaymentForm] = useState(false)

    // New obligation form state
    const [formType, setFormType] = useState<'payable' | 'receivable'>('payable')
    const [formAmount, setFormAmount] = useState('')
    const [formDesc, setFormDesc] = useState('')
    const [formDeadline, setFormDeadline] = useState('')
    const [formCounterparty, setFormCounterparty] = useState('')
    const [formSubmitting, setFormSubmitting] = useState(false)

    const filtered = obligations.filter(
        (o) => o.type === activeTab && (showClosed ? true : !o.is_closed)
    )

    const handleOpenDetail = async (id: string) => {
        setDetailLoading(true)
        const d = await getObligationDetail(id)
        setDetail(d)
        setDetailLoading(false)
    }

    const handleCreateObligation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!formAmount || !formDesc) return
        setFormSubmitting(true)
        const result = await createObligation({
            type: formType,
            amountTl: formAmount,
            description: formDesc,
            deadline: formDeadline || undefined,
            counterparty: formCounterparty || undefined,
        })
        setFormSubmitting(false)
        if (result) {
            setShowForm(false)
            setFormAmount('')
            setFormDesc('')
            setFormDeadline('')
            setFormCounterparty('')
        }
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Borç & Alacak</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowClosed(!showClosed)}
                        className="text-xs text-text-tertiary hover:text-white transition-colors"
                    >
                        {showClosed ? 'Kapatılanları gizle' : 'Kapatılanları göster'}
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/25 transition-all text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Yeni
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-background-elevated rounded-xl w-fit">
                {(['payable', 'receivable'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`
              flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab ? 'bg-primary/20 text-white border border-primary/30' : 'text-text-tertiary hover:text-white'}
            `}
                    >
                        {tab === 'payable' ? <CreditCard className="w-3.5 h-3.5" /> : <HandIcon className="w-3.5 h-3.5" />}
                        {tab === 'payable' ? 'Borç' : 'Alacak'}
                    </button>
                ))}
            </div>

            {/* Obligation List */}
            {filtered.length === 0 ? (
                <p className="text-center text-text-tertiary text-sm py-8">
                    {activeTab === 'payable' ? 'Aktif borç yok.' : 'Aktif alacak yok.'}
                </p>
            ) : (
                <div className="space-y-3">
                    {filtered.map((ob) => {
                        const isPastDue = ob.deadline && !ob.is_closed && new Date(ob.deadline) < new Date()
                        return (
                            <motion.div
                                key={ob.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`
                  p-4 rounded-xl border transition-all cursor-pointer
                  ${ob.is_closed
                                        ? 'bg-background-elevated/50 border-white/5 opacity-60'
                                        : isPastDue
                                            ? 'bg-danger/5 border-danger/20 hover:border-danger/40'
                                            : 'bg-background-elevated border-white/5 hover:border-white/10'
                                    }
                `}
                                onClick={() => handleOpenDetail(ob.id)}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-white truncate">{ob.description}</p>
                                            {ob.is_closed && <span className="text-xs text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded-full">Kapandı</span>}
                                            {isPastDue && <span className="text-xs text-danger bg-danger/10 border border-danger/20 px-1.5 py-0.5 rounded-full">Vadesi geçti</span>}
                                        </div>
                                        {ob.counterparty && <p className="text-xs text-text-tertiary mt-0.5">{ob.counterparty}</p>}
                                        {ob.deadline && <p className="text-xs text-text-tertiary mt-0.5">{new Date(ob.deadline).toLocaleDateString('tr-TR')}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className={`text-base font-bold ${activeTab === 'payable' ? 'text-danger' : 'text-success'}`}>
                                            {formatCurrency(ob.total_amount, ob.currency)}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* ── Create Obligation Modal ── */}
            <AnimatePresence>
                {showForm && (
                    <Portal>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.target === e.currentTarget && setShowForm(false)}
                        >
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                            <motion.form
                                onSubmit={handleCreateObligation}
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="relative w-full max-w-md bg-background-secondary border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                    <h2 className="text-lg font-semibold text-white">Yeni Yükümlülük</h2>
                                    <button type="button" onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-text-tertiary hover:text-white hover:bg-white/10 transition-all">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    {/* Type */}
                                    <div className="flex gap-2 p-1 bg-background-elevated rounded-xl">
                                        {(['payable', 'receivable'] as const).map((t) => (
                                            <button key={t} type="button" onClick={() => setFormType(t)}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formType === t ? 'bg-primary/20 text-white border border-primary/30' : 'text-text-tertiary hover:text-white'}`}>
                                                {t === 'payable' ? 'Borç (Ödenecek)' : 'Alacak (Tahsil edilecek)'}
                                            </button>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="text-xs text-text-tertiary mb-1 block">Açıklama *</label>
                                        <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} required
                                            className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-text-tertiary mb-1 block">Toplam Tutar (₺) *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">₺</span>
                                            <input type="number" step="0.01" min="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} required
                                                className="w-full pl-8 pr-4 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-text-tertiary mb-1 block">Karşı Taraf</label>
                                            <input value={formCounterparty} onChange={(e) => setFormCounterparty(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-tertiary mb-1 block">Son Ödeme Tarihi</label>
                                            <input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-1">
                                        <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-background-elevated text-text-secondary rounded-xl border border-white/5 text-sm">İptal</button>
                                        <button type="submit" disabled={formSubmitting} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-60">
                                            {formSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                                        </button>
                                    </div>
                                </div>
                            </motion.form>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* ── Obligation Detail Modal ── */}
            <AnimatePresence>
                {(detail || detailLoading) && (
                    <Portal>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.target === e.currentTarget && setDetail(null)}
                        >
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="relative w-full max-w-lg bg-background-secondary border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            >
                                {detailLoading ? (
                                    <div className="h-64 flex items-center justify-center text-text-tertiary">Yükleniyor...</div>
                                ) : detail ? (
                                    <>
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                            <div>
                                                <h2 className="text-lg font-semibold text-white">{detail.description}</h2>
                                                {detail.counterparty && <p className="text-xs text-text-tertiary">{detail.counterparty}</p>}
                                            </div>
                                            <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg text-danger/50 hover:text-danger hover:bg-danger/10 transition-all">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="p-6 space-y-5">
                                            {/* Derived remaining amount — NEVER from stored field */}
                                            <div>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-text-tertiary">İlerleme</span>
                                                    <span className="text-white font-medium">
                                                        {formatCurrency(detail.total_amount - detail.remaining_amount)} / {formatCurrency(detail.total_amount)}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-background-elevated rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-primary rounded-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, Math.round((1 - detail.remaining_amount / detail.total_amount) * 100))}%` }}
                                                        transition={{ duration: 0.6, ease: 'easeOut' }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-xs text-text-tertiary mt-1">
                                                    <span>Ödendi: {formatCurrency(detail.total_amount - detail.remaining_amount)}</span>
                                                    <span className="text-warning">Kalan: {formatCurrency(detail.remaining_amount)}</span>
                                                </div>
                                            </div>

                                            {/* Payment history */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-sm font-medium text-white">Ödeme Geçmişi</h4>
                                                    <button
                                                        onClick={() => setShowPaymentForm(true)}
                                                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        Ödeme Ekle
                                                    </button>
                                                </div>
                                                {detail.payments.length === 0 ? (
                                                    <p className="text-xs text-text-tertiary text-center py-4">Henüz ödeme yok</p>
                                                ) : (
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {detail.payments.map((p) => (
                                                            <div key={p.id} className="flex justify-between text-sm p-2 bg-background-elevated rounded-lg">
                                                                <span className="text-text-secondary">{new Date(p.occurred_at).toLocaleDateString('tr-TR')}</span>
                                                                <span className="text-success font-medium">+{formatCurrency(p.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            {!detail.is_closed && (
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={async () => { await closeObligation(detail.id); setDetail(null) }}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-success/20 hover:bg-success/30 text-success border border-success/30 rounded-xl text-sm font-medium transition-all"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        Borcu Kapat
                                                    </button>
                                                    <button
                                                        onClick={async () => { await deleteObligation(detail.id); setDetail(null) }}
                                                        className="flex-1 py-2.5 bg-background-elevated text-text-secondary hover:text-danger rounded-xl border border-white/5 text-sm transition-all"
                                                    >
                                                        Borcu Sil
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : null}
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* Payment Form — also a Portal via TransactionForm */}
            <AnimatePresence>
                {showPaymentForm && detail && (
                    <TransactionForm
                        onClose={() => setShowPaymentForm(false)}
                        presetType="expense"
                        presetObligationId={detail.id}
                        onSuccess={async () => {
                            setShowPaymentForm(false)
                            const refreshed = await getObligationDetail(detail.id)
                            setDetail(refreshed)
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
