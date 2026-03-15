// ============================================================
// FINANCE DASHBOARD — Monthly/Yearly stats cards + category breakdown
// All numbers computed at runtime from getDashboardStats
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useFinance } from '../../../contexts/FinanceContext'
import { formatCurrency } from '../types/finance.types'
import type { DashboardStats, DashboardPeriodConfig } from '../types/finance.types'

export function FinanceDashboard() {
    const { getDashboardStats } = useFinance()

    const now = new Date()
    const [periodMode, setPeriodMode] = useState<'month' | 'year'>('month')
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth())
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    const loadStats = useCallback(async () => {
        setLoading(true)
        const config: DashboardPeriodConfig = periodMode === 'month'
            ? { period: 'month', year, month }
            : { period: 'year', year }
        const result = await getDashboardStats(config)
        setStats(result)
        setLoading(false)
    }, [getDashboardStats, periodMode, year, month])

    useEffect(() => { loadStats() }, [loadStats])

    const prevPeriod = () => {
        if (periodMode === 'month') {
            if (month === 0) { setMonth(11); setYear((y) => y - 1) }
            else setMonth((m) => m - 1)
        } else {
            setYear((y) => y - 1)
        }
    }

    const nextPeriod = () => {
        if (periodMode === 'month') {
            if (month === 11) { setMonth(0); setYear((y) => y + 1) }
            else setMonth((m) => m + 1)
        } else {
            setYear((y) => y + 1)
        }
    }

    return (
        <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex gap-1 p-1 bg-background-elevated rounded-xl">
                    {(['month', 'year'] as const).map((mode) => (
                        <button key={mode} onClick={() => setPeriodMode(mode)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${periodMode === mode ? 'bg-primary/20 text-white border border-primary/30' : 'text-text-tertiary hover:text-white'}`}>
                            {mode === 'month' ? 'Aylık' : 'Yıllık'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={prevPeriod} className="p-1.5 rounded-lg text-text-tertiary hover:text-white hover:bg-white/10 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-white min-w-[120px] text-center capitalize">
                        {stats?.periodLabel || '—'}
                    </span>
                    <button onClick={nextPeriod} className="p-1.5 rounded-lg text-text-tertiary hover:text-white hover:bg-white/10 transition-all">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-background-elevated rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : stats ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Total Income */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0 }}
                        className="p-5 rounded-2xl bg-success/5 border border-success/15"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Toplam Gelir</span>
                            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-success" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-success">{formatCurrency(stats.totalIncomeKurus)}</p>
                    </motion.div>

                    {/* Total Expense */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="p-5 rounded-2xl bg-danger/5 border border-danger/15"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Toplam Gider</span>
                            <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
                                <TrendingDown className="w-4 h-4 text-danger" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-danger">{formatCurrency(stats.totalExpenseKurus)}</p>
                    </motion.div>

                    {/* Net */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`p-5 rounded-2xl border ${stats.netKurus >= 0 ? 'bg-primary/5 border-primary/15' : 'bg-danger/5 border-danger/15'}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Net</span>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.netKurus >= 0 ? 'bg-primary/10' : 'bg-danger/10'}`}>
                                <DollarSign className={`w-4 h-4 ${stats.netKurus >= 0 ? 'text-primary' : 'text-danger'}`} />
                            </div>
                        </div>
                        <p className={`text-2xl font-bold ${stats.netKurus >= 0 ? 'text-primary' : 'text-danger'}`}>
                            {stats.netKurus >= 0 ? '+' : ''}{formatCurrency(stats.netKurus)}
                        </p>
                    </motion.div>
                </div>
            ) : null}

            {/* Category Breakdown */}
            {stats && stats.categoryBreakdown.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-white mb-3">En Büyük Giderler</h4>
                    <div className="space-y-2">
                        {stats.top5Expenses.map((cs, i) => (
                            <motion.div
                                key={cs.category.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-3"
                            >
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cs.category.color }} />
                                <span className="text-sm text-text-secondary flex-1 truncate">{cs.category.name}</span>
                                <div className="flex-1 max-w-[120px] mx-2">
                                    <div className="h-1.5 bg-background-elevated rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: cs.category.color }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${cs.percentage}%` }}
                                            transition={{ duration: 0.5, delay: i * 0.05 }}
                                        />
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-white flex-shrink-0 w-24 text-right">
                                    {formatCurrency(cs.totalKurus)}
                                </span>
                                <span className="text-xs text-text-tertiary w-8 text-right">{cs.percentage}%</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
