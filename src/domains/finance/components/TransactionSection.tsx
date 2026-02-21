// ============================================================
// TRANSACTION LIST with filters
// Displays filtered transactions, delete/archive actions
// ============================================================

import { useState } from 'react'
import { Plus, Trash2, Archive, ExternalLink, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinance } from '../../../contexts/FinanceContext'
import { formatCurrency } from '../types/finance.types'
import type { FinanceTransaction } from '../types/finance.types'
import { TransactionForm } from './TransactionForm'
import { getReceiptUrl } from '../../../lib/financeStorage'

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
    const [showFilters, setShowFilters] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const getCategoryForTxn = (catId: string | null) =>
        catId ? categories.find((c) => c.id === catId) : null

    const handleDelete = async (id: string, receiptPath: string | null) => {
        setDeletingId(id)
        await deleteTransaction(id, receiptPath)
        setDeletingId(null)
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
                                    className="group flex items-center gap-4 p-4 bg-background-elevated hover:bg-background-tertiary rounded-xl border border-white/5 hover:border-white/10 transition-all"
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

                                    {/* Actions — visible on hover */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setEditingTransaction(txn)}
                                            className="p-1.5 rounded-lg text-text-tertiary hover:text-primary hover:bg-primary/10 transition-all"
                                            title="Düzenle"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        {txn.receipt_path && (
                                            <a
                                                href={getReceiptUrl(txn.receipt_path)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 rounded-lg text-text-tertiary hover:text-white hover:bg-white/10 transition-all"
                                                title="Fişi görüntüle"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => archiveTransaction(txn.id)}
                                            className="p-1.5 rounded-lg text-text-tertiary hover:text-white hover:bg-white/10 transition-all"
                                            title="Arşivle"
                                        >
                                            <Archive className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(txn.id, txn.receipt_path)}
                                            disabled={deletingId === txn.id}
                                            className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 transition-all disabled:opacity-50"
                                            title="Sil"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

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
        </div>
    )
}
