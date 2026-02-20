import { useState } from 'react'
import { SlidersHorizontal, X, Search } from 'lucide-react'
import { useTasks } from '../contexts/TasksContext'
import { motion, AnimatePresence } from 'framer-motion'
import { TagInput, TagOption } from './TagInput'
import { useTags } from '../contexts/TagsContext'
import { TaskFilter } from '../types/task'

export function TaskFilters() {
  const {
    filter: filterStatus,
    setFilter: setFilterStatus,
    searchQuery,
    setSearchQuery,
    selectedTagIds,
    setSelectedTagIds,
  } = useTasks()

  const { tags } = useTags() // Available tags
  const [showFilters, setShowFilters] = useState(false)

  // Map tag IDs to Tag objects for TagInput compatibility
  const selectedTagObjects: TagOption[] = selectedTagIds.map(tagId => {
    const existing = tags.find(t => t.id === tagId)
    return existing ? { ...existing, id: existing.id, name: existing.name, color: existing.color } : { id: tagId, name: 'Unknown', color: '#666' }
  })

  // Clear all filters handler
  const clearFilters = () => {
    setFilterStatus('all')
    setSearchQuery('')
    setSelectedTagIds([])
  }

  const hasActiveFilters = filterStatus !== 'all' || searchQuery || selectedTagIds.length > 0

  return (
    <div className="space-y-4">
      <div className="flex gap-2 w-full">
        {/* Search Input */}
        <div className="relative flex-1 group min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-text-tertiary group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-2.5 bg-background-elevated/50 border border-white/5 rounded-xl text-sm placeholder:text-text-tertiary/50 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm text-text-primary h-full"
            placeholder="Görevlerde ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
            ${showFilters
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-background-elevated/50 text-text-secondary hover:text-text-primary hover:bg-background-tertiary border border-white/5'
            }
          `}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtreler</span>
          <span className="sm:hidden">Filtre</span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary-light ml-0.5 animate-pulse" />
          )}
        </button>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-background-elevated/30 border border-white/5 rounded-xl space-y-4 shadow-inner mt-2">
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Durum</label>
                  <div className="flex bg-background-tertiary/50 p-1 rounded-lg border border-white/5">
                    {(['all', 'active', 'completed'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status as TaskFilter)}
                        className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium capitalize transition-all ${filterStatus === status ? 'bg-background-elevated text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
                      >
                        {status === 'all' ? 'Hepsi' : status === 'active' ? 'Aktif' : 'Tamamlanan'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-[2] min-w-[250px]">
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Etiketler</label>
                  <TagInput
                    selectedTags={selectedTagObjects}
                    onTagsChange={(newTags: TagOption[]) => setSelectedTagIds(newTags.map((t: TagOption) => t.id))}
                    onCreateTag={async () => null} // Disable creation
                    placeholder="Etiketlere göre filtrele..."
                    className="bg-background-tertiary/50 border-white/5 w-full"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex justify-end pt-2 border-t border-white/5">
                  <button
                    onClick={clearFilters}
                    className="text-xs text-text-tertiary hover:text-danger transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Tüm filtreleri temizle
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
