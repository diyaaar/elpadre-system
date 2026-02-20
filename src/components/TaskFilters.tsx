import { useState } from 'react'
import { SlidersHorizontal, ArrowUpDown, X, Search } from 'lucide-react'
import { useTasks } from '../contexts/TasksContext'
import { motion, AnimatePresence } from 'framer-motion'
import { TagInput, TagOption } from './TagInput'
import { useTags } from '../contexts/TagsContext'
import { TaskSort, TaskFilter } from '../types/task'

export function TaskFilters() {
  const {
    filter: filterStatus,
    setFilter: setFilterStatus,
    sort: sortBy,
    setSort: setSortBy,
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
    // Fallback if tag not found in available tags (should rare)
    return existing ? { ...existing, id: existing.id, name: existing.name, color: existing.color } : { id: tagId, name: 'Unknown', color: '#666' }
  })

  // Clear all filters handler
  const clearFilters = () => {
    setFilterStatus('all')
    setSortBy('created')
    setSearchQuery('')
    setSelectedTagIds([])
  }

  const hasActiveFilters = filterStatus !== 'all' || searchQuery || selectedTagIds.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-text-tertiary group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-2.5 bg-background-elevated/50 border border-white/5 rounded-xl text-sm placeholder:text-text-tertiary/50 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm text-text-primary"
            placeholder="Search tasks..."
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

        {/* Filter Toggle (Mobile) & Desktop Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              sm:hidden flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
              ${showFilters
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-background-elevated/50 text-text-secondary hover:text-text-primary hover:bg-background-tertiary border border-white/5'
              }
            `}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary-light ml-0.5 animate-pulse" />
            )}
          </button>

          {/* Desktop Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
              ${showFilters
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-background-elevated/50 text-text-secondary hover:text-text-primary hover:bg-background-tertiary border border-white/5'
              }
            `}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary-light ml-0.5 animate-pulse" />
            )}
          </button>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TaskSort)}
              className="appearance-none pl-9 pr-8 py-2.5 bg-background-elevated/50 border border-white/5 rounded-xl text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer hover:bg-background-tertiary transition-colors min-w-[160px]"
            >
              <option value="created">Newest First</option>
              <option value="deadline">Due Soonest</option>
              <option value="priority">Highest Priority</option>
              <option value="alphabetical">A-Z</option>
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ArrowUpDown className="w-4 h-4 text-text-tertiary opacity-70" />
            </div>
            {/* Custom arrow for select */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-l border-white/10 pl-2">
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-text-tertiary" />
            </div>
          </div>
        </div>
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
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Status</label>
                  <div className="flex bg-background-tertiary/50 p-1 rounded-lg border border-white/5">
                    {(['all', 'active', 'completed'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status as TaskFilter)}
                        className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium capitalize transition-all ${filterStatus === status ? 'bg-background-elevated text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-[2] min-w-[250px]">
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Tags</label>
                  <TagInput
                    selectedTags={selectedTagObjects}
                    onTagsChange={(newTags: TagOption[]) => setSelectedTagIds(newTags.map((t: TagOption) => t.id))}
                    onCreateTag={async () => null} // Disable creation
                    placeholder="Filter by tags..."
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
                    Clear all filters
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
