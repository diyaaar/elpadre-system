// ============================================================
// TRANSACTION LIST with filters
// Click a row → action popup (edit / archive / delete)
// ============================================================

import { useState } from 'react'
import { Plus, Trash2, Archive, ExternalLink, ChevronDown, ChevronUp, Pencil, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinance } from '../../../contexts/FinanceContext'
import { formatCurrency } from '../types/finance.types'
import type { FinanceTransaction } from '../types/finance.types'
import { TransactionForm } from './TransactionForm'
import { getReceiptUrl } from '../../../lib/financeStorage'
import { Portal } from '../../../components/Portal'
import { ReceiptViewer } from './ReceiptViewer'

export function TransactionSection() {
    const {
        transactions,
        categories,
        transactionFilters,
        setTransactionFilters,
        archiveTransaction,
        deleteTransaction,
        loading,
    } = useFinance()

    const [showForm, setShowForm] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null)
    const [activeTransaction, setActiveTransaction] = useState<FinanceTransaction | null>(null)
    const [viewingReceipt, setViewingReceipt] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const getCategoryForTxn = (catId: string | null) =>
        catId ? categories.find((c) => c.id === catId) : null

    const handleDelete = async (id: string, receiptPath: string | null) => {
        setDeletingId(id)
        setActiveTransaction(null)
        await deleteTransaction(id, receiptPath)
        setDeletingId(null)
    }

    const handleArchive = async (id: string) => {
        setActiveTransaction(null)
        await archiveTransaction(id)
    }

    const handleEdit = (txn: FinanceTransaction) => {
        setActiveTransaction(null)
        setEditingTransaction(txn)
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">İşlemler</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-white bg-background-elevated rounded-lg border border-white/5 transition-all"
                    >
                        Filtrele
                        {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Yeni İşlem
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 bg-background-elevated rounded-xl border border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {/* Type Filter */}
                            <div>
                                <label className="text-xs text-text-tertiary mb-1 block">Tür</label>
                                <select
                                    value={transactionFilters.type || 'all'}
                                    onChange={(e) => setTransactionFilters({ ...transactionFilters, type: e.target.value as any })}
                                    className="w-full px-2 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-white text-sm appearance-none"
                                >
                                    <option value="all">Tümü</option>
                                    <option value="income">Gelir</option>
                                    <option value="expense">Gider</option>
                                </select>
                            </div>

                            {/* Date From */}
                            <div>
                                <label className="text-xs text-text-tertiary mb-1 block">Başlangıç</label>
                                <input
                                    type="date"
                                    value={transactionFilters.dateFrom || ''}
                                    onChange={(e) => setTransactionFilters({ ...transactionFilters, dateFrom: e.target.value || undefined })}
                                    className="w-full px-2 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-white text-sm"
                                />
                            </div>

                            {/* Date To */}
                            <div>
                                <label className="text-xs text-text-tertiary mb-1 block">Bitiş</label>
                                <input
                                    type="date"
                                    value={transactionFilters.dateTo || ''}
                                    onChange={(e) => setTransactionFilters({ ...transactionFilters, dateTo: e.target.value || undefined })}
                                    className="w-full px-2 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-white text-sm"
                                />
                            </div>

                            {/* Sort */}
                            <div>
                                <label className="text-xs text-text-tertiary mb-1 block">Sırala</label>
                                <select
                                    value={transactionFilters.sortOrder || 'desc'}
                                    onChange={(e) => setTransactionFilters({ ...transactionFilters, sortOrder: e.target.value as 'asc' | 'desc' })}
                                    className="w-full px-2 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-white text-sm appearance-none"
                                >
                                    <option value="desc">Yeniden Eskiye</option>
                                    <option value="asc">Eskiden Yeniye</option>
                                </select>
                            </div>

                            {/* Reset */}
                            <button
                                onClick={() => setTransactionFilters({ sortOrder: 'desc', type: 'all', includeArchived: false })}
                                className="col-span-2 sm:col-span-4 text-xs text-text-tertiary hover:text-white transition-colors text-right"
                            >
                                Filtreleri temizle
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transaction List */}
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-background-elevated rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-text-tertiary">
                    <p className="text-sm">Henüz işlem yok.</p>
                    <button onClick={() => setShowForm(true)} className="mt-2 text-primary text-sm hover:underline">
                        İlk işlemi ekle
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence>
                        {transactions.map((txn) => {
                            const cat = getCategoryForTxn(txn.category_id)
                            const isIncome = txn.type === 'income'

                            return (
                                <motion.div
                                    key={txn.id}
                                    layout
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={() => setActiveTransaction(txn)}
                                    className="cursor-pointer flex items-center gap-4 p-4 bg-background-elevated hover:bg-background-tertiary active:scale-[0.99] rounded-xl border border-white/5 hover:border-white/10 transition-all select-none"
                                >
                                    {/* Color dot */}
                                    <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: cat?.color || (isIncome ? '#10b981' : '#ef4444') }}
                                    />

                                    {/* Main info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-base font-semibold ${isIncome ? 'text-success' : 'text-danger'}`}>
                                                {isIncome ? '+' : '-'}{formatCurrency(txn.amount, txn.currency)}
                                            </span>
                                            {cat && (
                                                <span className="text-xs px-2 py-0.5 rounded-full text-text-secondary"
                                                    style={{ backgroundColor: `${cat.color}20`, border: `1px solid ${cat.color}30` }}>
                                                    {cat.name}
                                                </span>
                                            )}
                                        </div>
                                        {txn.note && (
                                            <p className="text-xs text-text-tertiary truncate mt-0.5">{txn.note}</p>
                                        )}
                                    </div>

                                    {/* Date */}
                                    <span className="text-xs text-text-tertiary flex-shrink-0">
                                        {new Date(txn.occurred_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                    </span>

                                    {/* Deleting spinner */}
                                    {deletingId === txn.id && (
                                        <div className="w-4 h-4 border-2 border-danger/40 border-t-danger rounded-full animate-spin flex-shrink-0" />
                                    )}
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Transaction Action Popup ── */}
            <AnimatePresence>
                {activeTransaction && (() => {
                    const txn = activeTransaction
                    const cat = getCategoryForTxn(txn.category_id)
                    const isIncome = txn.type === 'income'
                    return (
                        <Portal>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                                onClick={() => setActiveTransaction(null)}
                            >
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                                {/* Panel */}
                                <motion.div
                                    initial={{ y: 60, opacity: 0, scale: 0.97 }}
                                    animate={{ y: 0, opacity: 1, scale: 1 }}
                                    exit={{ y: 60, opacity: 0, scale: 0.97 }}
                                    transition={{ type: 'spring', bounce: 0.18, duration: 0.35 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="relative w-full sm:max-w-sm bg-background-secondary border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
                                >
                                    {/* Drag handle (mobile) */}
                                    <div className="flex justify-center pt-3 pb-1 sm:hidden">
                                        <div className="w-10 h-1 bg-white/20 rounded-full" />
                                    </div>

                                    {/* Header */}
                                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: cat?.color || (isIncome ? '#10b981' : '#ef4444') }}
                                            />
                                            <div className="min-w-0">
                                                <p className={`text-lg font-bold ${isIncome ? 'text-success' : 'text-danger'}`}>
                                                    {isIncome ? '+' : '-'}{formatCurrency(txn.amount, txn.currency)}
                                                </p>
                                                {cat && <p className="text-xs text-text-tertiary">{cat.name}</p>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setActiveTransaction(null)}
                                            className="p-1.5 rounded-lg text-text-tertiary hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Meta info */}
                                    <div className="px-5 py-3 space-y-1 border-b border-white/5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-text-tertiary">Tarih</span>
                                            <span className="text-white">
                                                {new Date(txn.occurred_at).toLocaleDateString('tr-TR', {
                                                    day: 'numeric', month: 'long', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        {txn.note && (
                                            <div className="flex items-start justify-between gap-4 text-sm">
                                                <span className="text-text-tertiary shrink-0">Not</span>
                                                <span className="text-white text-right">{txn.note}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="p-3 space-y-1.5">
                                        {txn.receipt_path && (
                                            <button
                                                onClick={() => setViewingReceipt(getReceiptUrl(txn.receipt_path!))}
                                                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-all text-sm"
                                            >
                                                <ExternalLink className="w-4 h-4 shrink-0" />
                                                Fişi Görüntüle
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleEdit(txn)}
                                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-text-secondary hover:text-primary hover:bg-primary/10 transition-all text-sm"
                                        >
                                            <Pencil className="w-4 h-4 shrink-0" />
                                            Düzenle
                                        </button>
                                        <button
                                            onClick={() => handleArchive(txn.id)}
                                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-all text-sm"
                                        >
                                            <Archive className="w-4 h-4 shrink-0" />
                                            Arşivle
                                        </button>
                                        <button
                                            onClick={() => handleDelete(txn.id, txn.receipt_path)}
                                            disabled={deletingId === txn.id}
                                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-danger hover:bg-danger/10 transition-all text-sm disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4 shrink-0" />
                                            {deletingId === txn.id ? 'Siliniyor...' : 'Sil'}
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </Portal>
                    )
                })()}
            </AnimatePresence>

            {/* Transaction Form Modal — Create */}
            <AnimatePresence>
                {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
            </AnimatePresence>

            {/* Transaction Form Modal — Edit */}
            <AnimatePresence>
                {editingTransaction && (
                    <TransactionForm
                        editingTransaction={editingTransaction}
                        onClose={() => setEditingTransaction(null)}
                    />
                )}
            </AnimatePresence>

            {/* Receipt Viewer Modal */}
            <ReceiptViewer
                url={viewingReceipt}
                onClose={() => setViewingReceipt(null)}
            />
        </div>
    )
}
