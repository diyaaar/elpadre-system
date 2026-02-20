// ============================================================
// CATEGORY MANAGER — Create/delete Finance categories and tags
// ============================================================

import { useState } from 'react'
import { Plus, Trash2, X, Tag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinance } from '../../../contexts/FinanceContext'

const PRESET_COLORS = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#64748b',
]

export function CategoryManager() {
    const { categories, tags, createCategory, deleteCategory, createTag, deleteTag } = useFinance()

    const [activeType, setActiveType] = useState<'income' | 'expense'>('expense')
    const [showCatForm, setShowCatForm] = useState(false)
    const [showTagForm, setShowTagForm] = useState<string | null>(null) // holds category_id

    // Category form
    const [catName, setCatName] = useState('')
    const [catColor, setCatColor] = useState(PRESET_COLORS[0])
    const [catSubmitting, setCatSubmitting] = useState(false)

    // Tag form
    const [tagName, setTagName] = useState('')
    const [tagColor, setTagColor] = useState(PRESET_COLORS[2])
    const [tagSubmitting, setTagSubmitting] = useState(false)

    const filteredCats = categories.filter((c) => c.type === activeType)

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!catName.trim()) return
        setCatSubmitting(true)
        const result = await createCategory({ type: activeType, name: catName.trim(), color: catColor })
        if (result) {
            setShowCatForm(false)
            setCatName('')
            setCatColor(PRESET_COLORS[0])
        }
        setCatSubmitting(false)
    }

    const handleCreateTag = async (e: React.FormEvent, catId: string) => {
        e.preventDefault()
        if (!tagName.trim()) return
        setTagSubmitting(true)
        const result = await createTag({ category_id: catId, name: tagName.trim(), color: tagColor })
        if (result) {
            setShowTagForm(null)
            setTagName('')
        }
        setTagSubmitting(false)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Kategoriler</h3>
                <button onClick={() => setShowCatForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/25 transition-all text-sm font-medium">
                    <Plus className="w-4 h-4" />
                    Yeni Kategori
                </button>
            </div>

            {/* Type tabs */}
            <div className="flex gap-1 p-1 bg-background-elevated rounded-xl w-fit">
                {(['income', 'expense'] as const).map((t) => (
                    <button key={t} onClick={() => setActiveType(t)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeType === t ? 'bg-primary/20 text-white border border-primary/30' : 'text-text-tertiary hover:text-white'}`}>
                        {t === 'income' ? 'Gelir' : 'Gider'}
                    </button>
                ))}
            </div>

            {/* Category List */}
            {filteredCats.length === 0 ? (
                <p className="text-center text-text-tertiary text-sm py-6">Kategori yok. Yeni bir tane oluşturun.</p>
            ) : (
                <div className="space-y-2">
                    {filteredCats.map((cat) => {
                        const catTags = tags.filter((t) => t.category_id === cat.id)
                        return (
                            <motion.div key={cat.id} layout className="p-4 bg-background-elevated rounded-xl border border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <span className="text-sm font-medium text-white">{cat.name}</span>
                                        <span className="text-xs text-text-tertiary">({catTags.length} etiket)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setShowTagForm(cat.id); setTagName(''); setTagColor(PRESET_COLORS[2]) }}
                                            className="flex items-center gap-1 text-xs text-text-tertiary hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10">
                                            <Tag className="w-3 h-3" />
                                            Etiket Ekle
                                        </button>
                                        <button onClick={() => deleteCategory(cat.id)}
                                            className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 transition-all">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Tags for this category */}
                                {catTags.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {catTags.map((tag) => (
                                            <div key={tag.id} className="group flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs"
                                                style={{ backgroundColor: `${tag.color}20`, border: `1px solid ${tag.color}30`, color: tag.color }}>
                                                {tag.name}
                                                <button onClick={() => deleteTag(tag.id)}
                                                    className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Tag form inline */}
                                <AnimatePresence>
                                    {showTagForm === cat.id && (
                                        <motion.form
                                            onSubmit={(e) => handleCreateTag(e, cat.id)}
                                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                            className="mt-3 flex gap-2 overflow-hidden"
                                        >
                                            <input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="Etiket adı..."
                                                className="flex-1 px-3 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
                                            <button type="submit" disabled={tagSubmitting}
                                                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50">
                                                {tagSubmitting ? '...' : 'Ekle'}
                                            </button>
                                            <button type="button" onClick={() => setShowTagForm(null)}
                                                className="px-2 py-1.5 text-text-tertiary hover:text-white rounded-lg text-xs">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </motion.form>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* Create Category Modal */}
            <AnimatePresence>
                {showCatForm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowCatForm(false)}>
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.form onSubmit={handleCreateCategory}
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-sm bg-background-secondary border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                <h2 className="text-base font-semibold text-white">Yeni Kategori</h2>
                                <button type="button" onClick={() => setShowCatForm(false)} className="p-1.5 rounded-lg text-text-tertiary hover:text-white hover:bg-white/10 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Type */}
                                <div className="flex gap-2 p-1 bg-background-elevated rounded-xl">
                                    {(['income', 'expense'] as const).map((t) => (
                                        <button key={t} type="button" onClick={() => setActiveType(t)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeType === t ? 'bg-primary/20 text-white border border-primary/30' : 'text-text-tertiary hover:text-white'}`}>
                                            {t === 'income' ? 'Gelir' : 'Gider'}
                                        </button>
                                    ))}
                                </div>
                                <div>
                                    <label className="text-xs text-text-tertiary mb-1 block">İsim *</label>
                                    <input value={catName} onChange={(e) => setCatName(e.target.value)} required placeholder="Kira, Market, Maaş..."
                                        className="w-full px-3 py-2.5 bg-background-elevated border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                                </div>
                                <div>
                                    <label className="text-xs text-text-tertiary mb-1.5 block">Renk</label>
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_COLORS.map((color) => (
                                            <button key={color} type="button" onClick={() => setCatColor(color)}
                                                className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${catColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-background-elevated scale-110' : ''}`}
                                                style={{ backgroundColor: color }} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setShowCatForm(false)} className="flex-1 py-2.5 bg-background-elevated text-text-secondary rounded-xl border border-white/5 text-sm">İptal</button>
                                    <button type="submit" disabled={catSubmitting} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-60">
                                        {catSubmitting ? '...' : 'Kaydet'}
                                    </button>
                                </div>
                            </div>
                        </motion.form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
