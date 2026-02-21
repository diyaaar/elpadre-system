import { useState, useEffect, useRef } from 'react'
import { X, Plus, Tag, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTags } from '../contexts/TagsContext'

export interface TagOption {
    id: string
    name: string
    color: string
}

interface TagInputProps {
    selectedTags: TagOption[]
    onTagsChange: (tags: TagOption[]) => void
    onCreateTag?: (name: string, color: string) => Promise<any>
    placeholder?: string
    className?: string
    maxTags?: number
}

export function TagInput({
    selectedTags,
    onTagsChange,
    onCreateTag,
    placeholder = "Add tags...",
    className = "",
    maxTags
}: TagInputProps) {
    const { tags: availableTags, loading: loadingTags } = useTags()
    const [inputValue, setInputValue] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close dropdown when complying outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredTags = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedTags.some(selected => selected.id === tag.id)
    )

    const handleSelectTag = (tag: any) => {
        if (maxTags && selectedTags.length >= maxTags) return
        onTagsChange([...selectedTags, { id: tag.id, name: tag.name, color: tag.color }])
        setInputValue('')
        setIsOpen(false)
        inputRef.current?.focus()
    }

    const handleRemoveTag = (tagId: string) => {
        onTagsChange(selectedTags.filter(t => t.id !== tagId))
    }

    const handleCreateTag = async () => {
        if (!onCreateTag || !inputValue.trim() || isCreating) return

        setIsCreating(true)
        try {
            // Generate a random color for new tag
            const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
            const randomColor = colors[Math.floor(Math.random() * colors.length)]

            const newTag = await onCreateTag(inputValue.trim(), randomColor)
            if (newTag) {
                handleSelectTag(newTag)
            }
        } catch (err) {
            console.error('Failed to create tag', err)
        } finally {
            setIsCreating(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (filteredTags.length > 0) {
                handleSelectTag(filteredTags[0])
            } else if (onCreateTag && inputValue.trim()) {
                handleCreateTag()
            }
        } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
            handleRemoveTag(selectedTags[selectedTags.length - 1].id)
        }
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white/[0.03] border border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/30 transition-all cursor-text min-h-[42px]"
                onClick={() => {
                    if (isOpen) {
                        setIsOpen(false)
                        inputRef.current?.blur()
                    } else {
                        setIsOpen(true)
                        inputRef.current?.focus()
                    }
                }}
            >
                <AnimatePresence>
                    {selectedTags.map(tag => (
                        <motion.span
                            key={tag.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-background-tertiary border border-white/5 group"
                            style={{ color: tag.color }}
                        >
                            <Tag className="w-3 h-3" />
                            {tag.name}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag.id); }}
                                className="hover:bg-white/10 rounded-full p-0.5 ml-0.5 transition-colors"
                            >
                                <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                            </button>
                        </motion.span>
                    ))}
                </AnimatePresence>

                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); setIsOpen(true); }}
                    onFocus={() => {
                        setIsOpen(true)
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsOpen(true)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedTags.length === 0 ? placeholder : ""}
                    className="flex-1 bg-transparent border-none p-1 text-sm text-text-primary placeholder:text-text-tertiary focus:ring-0 min-w-[80px]"
                    disabled={maxTags ? selectedTags.length >= maxTags : false}
                />
            </div>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (inputValue || filteredTags.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute z-50 -left-2 -right-2 sm:-left-4 sm:-right-4 mt-2 bg-background-elevated border border-white/10 rounded-xl shadow-glass-lg overflow-hidden max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                    >
                        {loadingTags ? (
                            <div className="p-3 text-center text-xs text-text-tertiary">Loading tags...</div>
                        ) : (
                            <>
                                {filteredTags.map(tag => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => handleSelectTag(tag)}
                                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: tag.color }} />
                                            <span className="text-text-secondary group-hover:text-white font-medium">{tag.name}</span>
                                        </div>
                                        {/* Check indicator if already selected (though we filter them out, keeping structure robust) */}
                                        {selectedTags.some(t => t.id === tag.id) && <Check className="w-4 h-4 text-primary" />}
                                    </button>
                                ))}

                                {onCreateTag && inputValue.trim() && !filteredTags.find(t => t.name.toLowerCase() === inputValue.toLowerCase()) && (
                                    <button
                                        type="button"
                                        onClick={handleCreateTag}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors text-primary border-t border-white/5"
                                    >
                                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Create "{inputValue}"
                                    </button>
                                )}

                                {filteredTags.length === 0 && !inputValue && (
                                    <div className="p-3 text-center text-xs text-text-tertiary">Type to verify existing tags</div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
