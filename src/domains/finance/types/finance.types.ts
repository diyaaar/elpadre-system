// ============================================================
// FINANCE DOMAIN — TYPE DEFINITIONS
// Cash-based model. All amounts stored as integers (kuruş).
// ============================================================

export type FinanceTransactionType = 'income' | 'expense'
export type ObligationType = 'payable' | 'receivable'
export type RecurringFrequency = 'monthly' | 'yearly'

// ──────────────────────────────────────────────
// Core DB row types (amounts in kuruş)
// ──────────────────────────────────────────────

export interface FinanceCategory {
    id: string
    user_id: string
    type: FinanceTransactionType
    name: string
    color: string
    icon: string | null
    is_active: boolean
    created_at: string
    updated_at: string | null
}

export interface FinanceTag {
    id: string
    user_id: string
    category_id: string | null
    name: string
    color: string
    created_at: string
}

export interface FinanceObligation {
    id: string
    user_id: string
    type: ObligationType
    total_amount: number // kuruş — BIGINT
    currency: string
    description: string
    counterparty: string | null
    start_date: string
    deadline: string | null
    reminder_days: number
    is_closed: boolean
    created_at: string
    updated_at: string | null
}

export interface FinanceTransaction {
    id: string
    user_id: string
    type: FinanceTransactionType
    amount: number // kuruş — BIGINT. NEVER float.
    amount_try: number // kuruş — TL equivalent at the time of transaction
    currency: string
    category_id: string | null
    tag_id: string | null
    obligation_id: string | null
    occurred_at: string
    note: string | null
    receipt_path: string | null // Supabase Storage path
    is_archived: boolean
    created_at: string
    updated_at: string | null
}

export interface RecurringTemplate {
    id: string
    user_id: string
    type: FinanceTransactionType
    amount: number // kuruş — BIGINT
    currency: string
    category_id: string | null
    tag_id: string | null
    name: string
    note: string | null
    frequency: RecurringFrequency
    next_occurrence: string // ISO date string
    is_active: boolean
    created_at: string
    updated_at: string | null
}

// ──────────────────────────────────────────────
// Enriched / derived types (never stored in DB)
// ──────────────────────────────────────────────

export interface ObligationWithDerived extends FinanceObligation {
    /** Derived: total_amount - SUM(linked transactions). Never a stored column. */
    remaining_amount: number // kuruş
    payments: FinanceTransaction[]
}

export interface TransactionWithRefs extends FinanceTransaction {
    category: FinanceCategory | null
    tag: FinanceTag | null
}

// ──────────────────────────────────────────────
// Filter & Sort types
// ──────────────────────────────────────────────

export interface TransactionFilters {
    dateFrom?: string // ISO date string e.g. '2026-01-01'
    dateTo?: string   // ISO date string e.g. '2026-01-31'
    type?: FinanceTransactionType | 'all'
    categoryIds?: string[]
    tagIds?: string[]
    amountMinKurus?: number
    amountMaxKurus?: number
    sortOrder?: 'asc' | 'desc'
    includeArchived?: boolean
}

export type DashboardPeriod = 'month' | 'year' | 'custom'

export interface DashboardPeriodConfig {
    period: DashboardPeriod
    year: number
    month?: number // 0-indexed (0 = January)
    customFrom?: string
    customTo?: string
}

// ──────────────────────────────────────────────
// Dashboard aggregation (computed at runtime)
// ──────────────────────────────────────────────

export interface CategoryStat {
    category: FinanceCategory
    totalKurus: number
    count: number
    percentage: number
}

export interface DashboardStats {
    totalIncomeKurus: number
    totalExpenseKurus: number
    netKurus: number
    categoryBreakdown: CategoryStat[]
    top5Expenses: CategoryStat[]
    periodLabel: string
}

// ──────────────────────────────────────────────
// Form input types (UI → amounts in TL string)
// ──────────────────────────────────────────────

export interface TransactionFormInput {
    type: FinanceTransactionType
    amountTl: string      // '125.50' → converted to 12550 kuruş on submit
    currency: string
    category_id: string
    tag_id?: string
    obligation_id?: string
    occurred_at: string   // datetime-local input value
    note?: string
    receiptFile?: File | null
}

export interface ObligationFormInput {
    type: ObligationType
    amountTl: string      // '60000.00' → 6000000 kuruş
    currency: string
    description: string
    counterparty?: string
    start_date: string    // date input value
    deadline?: string
    reminder_days: number
}

export interface RecurringTemplateFormInput {
    type: FinanceTransactionType
    amountTl: string
    currency: string
    category_id?: string
    tag_id?: string
    name: string
    note?: string
    frequency: RecurringFrequency
    next_occurrence: string // date input value
}

// ──────────────────────────────────────────────
// Currency helpers
// ──────────────────────────────────────────────

/** Convert TL string from UI input to integer kuruş */
export function tlToKurus(tl: string): number {
    const raw = tl.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(raw)
    if (isNaN(parsed)) return 0
    return Math.round(parsed * 100)
}

/** Format raw user input into smart decimal string with thousands separator */
export function formatInputAmountTl(value: string): string {
    const raw = value.replace(/[^0-9.,]/g, '')
    const parts = raw.replace(/\./g, '').split(',')
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')

    if (parts.length > 1) {
        return `${intPart},${parts[1].slice(0, 2)}`
    }

    return intPart
}

/** Convert integer kuruş to display string in TL */
export function kurusToTl(kurus: number): string {
    return (kurus / 100).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

/** Format with currency symbol for display */
export function formatCurrency(kurus: number, currency = 'TRY'): string {
    const symbol = currency === 'TRY' ? '₺' : currency
    const formatted = kurusToTl(kurus)
    return `${symbol}${formatted}`
}
