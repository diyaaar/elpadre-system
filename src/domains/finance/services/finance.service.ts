// ============================================================
// FINANCE DOMAIN — SERVICE LAYER
// All Supabase queries live here. Components never call DB directly.
// Amounts stored/retrieved as integers (kuruş). No stored computed values.
// ============================================================

import { getSupabaseClient } from '../../../lib/supabase'
import type {
    FinanceCategory,
    FinanceTag,
    FinanceTransaction,
    FinanceObligation,
    ObligationWithDerived,
    RecurringTemplate,
    TransactionFilters,
    DashboardStats,
    DashboardPeriodConfig,
    CategoryStat,
} from '../types/finance.types'

const getSupabase = () => getSupabaseClient()

// ──────────────────────────────────────────────
// CATEGORIES
// ──────────────────────────────────────────────

export async function getCategories(userId: string): Promise<FinanceCategory[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('finance_categories')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name', { ascending: true })

    if (error) throw error
    return data || []
}

export async function createCategory(
    userId: string,
    input: { type: 'income' | 'expense'; name: string; color: string; icon?: string }
): Promise<FinanceCategory> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('finance_categories')
        .insert({
            user_id: userId,
            type: input.type,
            name: input.name.trim(),
            color: input.color,
            icon: input.icon || null,
            is_active: true,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function updateCategory(
    userId: string,
    id: string,
    updates: Partial<Pick<FinanceCategory, 'name' | 'color' | 'icon'>>
): Promise<FinanceCategory> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('finance_categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteCategory(userId: string, id: string): Promise<void> {
    // Soft delete — keeps historical transaction data intact
    const supabase = getSupabase()
    const { error } = await supabase
        .from('finance_categories')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)

    if (error) throw error
}

// ──────────────────────────────────────────────
// TAGS
// ──────────────────────────────────────────────

export async function getTags(userId: string, categoryId?: string): Promise<FinanceTag[]> {
    const supabase = getSupabase()
    let query = supabase
        .from('finance_tags')
        .select('*')
        .eq('user_id', userId)

    if (categoryId) {
        query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query.order('name', { ascending: true })
    if (error) throw error
    return data || []
}

export async function createTag(
    userId: string,
    input: { category_id?: string; name: string; color: string }
): Promise<FinanceTag> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('finance_tags')
        .insert({
            user_id: userId,
            category_id: input.category_id || null,
            name: input.name.trim(),
            color: input.color,
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteTag(userId: string, id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase
        .from('finance_tags')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

    if (error) throw error
}

// ──────────────────────────────────────────────
// TRANSACTIONS
// ──────────────────────────────────────────────

export async function getTransactions(
    userId: string,
    filters: TransactionFilters = {}
): Promise<FinanceTransaction[]> {
    const supabase = getSupabase()

    let query = supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', userId)

    if (!filters.includeArchived) {
        query = query.eq('is_archived', false)
    }

    if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
    }

    if (filters.dateFrom) {
        query = query.gte('occurred_at', filters.dateFrom)
    }

    if (filters.dateTo) {
        // End of the selected day
        const endOfDay = filters.dateTo.includes('T')
            ? filters.dateTo
            : `${filters.dateTo}T23:59:59.999Z`
        query = query.lte('occurred_at', endOfDay)
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
        query = query.in('category_id', filters.categoryIds)
    }

    if (filters.tagIds && filters.tagIds.length > 0) {
        query = query.in('tag_id', filters.tagIds)
    }

    if (filters.amountMinKurus !== undefined) {
        query = query.gte('amount', filters.amountMinKurus)
    }

    if (filters.amountMaxKurus !== undefined) {
        query = query.lte('amount', filters.amountMaxKurus)
    }

    const sortAsc = filters.sortOrder === 'asc'
    const { data, error } = await query.order('occurred_at', { ascending: sortAsc })

    if (error) throw error
    return data || []
}

export async function createTransaction(
    userId: string,
    input: {
        type: 'income' | 'expense'
        amount: number // kuruş — caller must convert from TL first
        currency?: string
        category_id?: string
        tag_id?: string
        obligation_id?: string
        occurred_at: string
        note?: string
        receipt_path?: string
    }
): Promise<FinanceTransaction> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new Error('amount must be a positive integer (kuruş)')
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('finance_transactions')
        .insert({
            user_id: userId,
            type: input.type,
            amount: input.amount,
            currency: input.currency || 'TRY',
            category_id: input.category_id || null,
            tag_id: input.tag_id || null,
            obligation_id: input.obligation_id || null,
            occurred_at: input.occurred_at,
            note: input.note || null,
            receipt_path: input.receipt_path || null,
            is_archived: false,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function updateTransaction(
    userId: string,
    id: string,
    updates: Partial<Pick<FinanceTransaction, 'type' | 'amount' | 'category_id' | 'tag_id' | 'occurred_at' | 'note' | 'receipt_path'>>
): Promise<FinanceTransaction> {
    if (updates.amount !== undefined && (!Number.isInteger(updates.amount) || updates.amount <= 0)) {
        throw new Error('amount must be a positive integer (kuruş)')
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('finance_transactions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function archiveTransaction(userId: string, id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase
        .from('finance_transactions')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)

    if (error) throw error
}

export async function deleteTransaction(userId: string, id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

    if (error) throw error
}

// ──────────────────────────────────────────────
// DASHBOARD AGGREGATION
// All computed at runtime — no stored balances
// ──────────────────────────────────────────────

export async function getDashboardStats(
    userId: string,
    config: DashboardPeriodConfig,
    categories: FinanceCategory[]
): Promise<DashboardStats> {
    const supabase = getSupabase()

    // Determine date range
    let dateFrom: string
    let dateTo: string
    let periodLabel: string

    const now = new Date()

    if (config.period === 'month') {
        const year = config.year
        const month = config.month ?? now.getMonth()
        const start = new Date(year, month, 1)
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
        dateFrom = start.toISOString()
        dateTo = end.toISOString()
        periodLabel = start.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })
    } else if (config.period === 'year') {
        const year = config.year
        dateFrom = new Date(year, 0, 1).toISOString()
        dateTo = new Date(year, 11, 31, 23, 59, 59, 999).toISOString()
        periodLabel = `${year}`
    } else {
        dateFrom = config.customFrom!
        dateTo = config.customTo!
        periodLabel = `${config.customFrom} – ${config.customTo}`
    }

    const { data, error } = await supabase
        .from('finance_transactions')
        .select('type, amount, category_id')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .gte('occurred_at', dateFrom)
        .lte('occurred_at', dateTo)

    if (error) throw error

    const txns = data || []

    // Aggregate in JS (Supabase JS v2 doesn't expose GROUP BY)
    const totalIncomeKurus = txns
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenseKurus = txns
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

    // Category breakdown for expenses
    const catMap = new Map<string, { totalKurus: number; count: number }>()
    txns
        .filter((t) => t.type === 'expense' && t.category_id)
        .forEach((t) => {
            const existing = catMap.get(t.category_id!) || { totalKurus: 0, count: 0 }
            catMap.set(t.category_id!, {
                totalKurus: existing.totalKurus + t.amount,
                count: existing.count + 1,
            })
        })

    const categoryBreakdown: CategoryStat[] = []
    catMap.forEach((stat, catId) => {
        const category = categories.find((c) => c.id === catId)
        if (category) {
            categoryBreakdown.push({
                category,
                totalKurus: stat.totalKurus,
                count: stat.count,
                percentage: totalExpenseKurus > 0 ? Math.round((stat.totalKurus / totalExpenseKurus) * 100) : 0,
            })
        }
    })

    categoryBreakdown.sort((a, b) => b.totalKurus - a.totalKurus)
    const top5Expenses = categoryBreakdown.slice(0, 5)

    return {
        totalIncomeKurus,
        totalExpenseKurus,
        netKurus: totalIncomeKurus - totalExpenseKurus,
        categoryBreakdown,
        top5Expenses,
        periodLabel,
    }
}

// ──────────────────────────────────────────────
// OBLIGATIONS
// remaining_amount is always derived from transactions — never stored
// ──────────────────────────────────────────────

export async function getObligations(userId: string): Promise<FinanceObligation[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('finance_obligations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

export async function getObligationDetail(
    userId: string,
    obligationId: string
): Promise<ObligationWithDerived | null> {
    const supabase = getSupabase()

    const [{ data: obligation, error: obErr }, { data: payments, error: payErr }] = await Promise.all([
        supabase
            .from('finance_obligations')
            .select('*')
            .eq('id', obligationId)
            .eq('user_id', userId)
            .single(),
        supabase
            .from('finance_transactions')
            .select('*')
            .eq('obligation_id', obligationId)
            .eq('user_id', userId)
            .eq('is_archived', false)
            .order('occurred_at', { ascending: false }),
    ])

    if (obErr) throw obErr
    if (payErr) throw payErr
    if (!obligation) return null

    // Derive remaining_amount — NEVER stored in DB
    const paid = (payments || []).reduce((sum, t) => sum + t.amount, 0)
    const remaining_amount = Math.max(0, obligation.total_amount - paid)

    return {
        ...obligation,
        remaining_amount,
        payments: payments || [],
    }
}

export async function createObligation(
    userId: string,
    input: {
        type: 'payable' | 'receivable'
        total_amount: number // kuruş
        currency?: string
        description: string
        counterparty?: string
        start_date?: string
        deadline?: string
        reminder_days?: number
    }
): Promise<FinanceObligation> {
    if (!Number.isInteger(input.total_amount) || input.total_amount <= 0) {
        throw new Error('total_amount must be a positive integer (kuruş)')
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('finance_obligations')
        .insert({
            user_id: userId,
            type: input.type,
            total_amount: input.total_amount,
            currency: input.currency || 'TRY',
            description: input.description.trim(),
            counterparty: input.counterparty || null,
            start_date: input.start_date || new Date().toISOString().slice(0, 10),
            deadline: input.deadline || null,
            reminder_days: input.reminder_days ?? 7,
            is_closed: false,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (error) throw error
    return data
    // NOTE: Creating an obligation does NOT create a transaction. (Core architecture rule)
}

export async function updateObligation(
    userId: string,
    id: string,
    updates: Partial<Pick<FinanceObligation, 'description' | 'counterparty' | 'deadline' | 'reminder_days' | 'total_amount'>>
): Promise<FinanceObligation> {
    if (updates.total_amount !== undefined && (!Number.isInteger(updates.total_amount) || updates.total_amount <= 0)) {
        throw new Error('total_amount must be a positive integer (kuruş)')
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('finance_obligations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function closeObligation(userId: string, id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase
        .from('finance_obligations')
        .update({ is_closed: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)

    if (error) throw error
}

export async function deleteObligation(userId: string, id: string): Promise<void> {
    // Deleting unlinks child transactions (obligation_id set to null via ON DELETE SET NULL in schema)
    const supabase = getSupabase()
    const { error } = await supabase
        .from('finance_obligations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

    if (error) throw error
}

// ──────────────────────────────────────────────
// RECURRING TEMPLATES
// V1: manual trigger only — no cron jobs
// ──────────────────────────────────────────────

export async function getRecurringTemplates(userId: string): Promise<RecurringTemplate[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('finance_recurring_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('next_occurrence', { ascending: true })

    if (error) throw error
    return data || []
}

export async function createRecurringTemplate(
    userId: string,
    input: {
        type: 'income' | 'expense'
        amount: number // kuruş
        currency?: string
        category_id?: string
        tag_id?: string
        name: string
        note?: string
        frequency: 'monthly' | 'yearly'
        next_occurrence: string // ISO date
    }
): Promise<RecurringTemplate> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new Error('amount must be a positive integer (kuruş)')
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('finance_recurring_templates')
        .insert({
            user_id: userId,
            type: input.type,
            amount: input.amount,
            currency: input.currency || 'TRY',
            category_id: input.category_id || null,
            tag_id: input.tag_id || null,
            name: input.name.trim(),
            note: input.note || null,
            frequency: input.frequency,
            next_occurrence: input.next_occurrence,
            is_active: true,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function generateTransactionFromTemplate(
    userId: string,
    templateId: string
): Promise<FinanceTransaction> {
    const supabase = getSupabase()

    // Fetch template first
    const { data: template, error: templateErr } = await supabase
        .from('finance_recurring_templates')
        .select('*')
        .eq('id', templateId)
        .eq('user_id', userId)
        .single()

    if (templateErr) throw templateErr
    if (!template) throw new Error('Template not found')

    // Insert the transaction
    const { data: txn, error: txnErr } = await supabase
        .from('finance_transactions')
        .insert({
            user_id: userId,
            type: template.type,
            amount: template.amount,
            currency: template.currency,
            category_id: template.category_id,
            tag_id: template.tag_id,
            occurred_at: new Date().toISOString(),
            note: template.note || null,
            is_archived: false,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (txnErr) throw txnErr

    // Advance next_occurrence
    const currentDate = new Date(template.next_occurrence)
    const nextDate = new Date(currentDate)
    if (template.frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1)
    } else {
        nextDate.setFullYear(nextDate.getFullYear() + 1)
    }

    const { error: updateErr } = await supabase
        .from('finance_recurring_templates')
        .update({
            next_occurrence: nextDate.toISOString().slice(0, 10),
            updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .eq('user_id', userId)

    if (updateErr) throw updateErr

    return txn
}

export async function deleteRecurringTemplate(userId: string, id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase
        .from('finance_recurring_templates')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

    if (error) throw error
}
