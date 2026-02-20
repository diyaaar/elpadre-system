import { useState, useRef, useEffect } from 'react'
import { Sparkles, Loader2, ArrowUp, X } from 'lucide-react'
import { parseNaturalLanguageTask } from '../lib/openai'
import { useTasks } from '../contexts/TasksContext'
import { useTags } from '../contexts/TagsContext'
import { useWorkspaces } from '../contexts/WorkspacesContext'
import { useToast } from '../contexts/ToastContext'
import { motion, AnimatePresence } from 'framer-motion'



export function NaturalLanguageInput() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { createTask } = useTasks()
  const { createTag, addTagToTask } = useTags()
  const { currentWorkspaceId } = useWorkspaces()
  const { showToast } = useToast()

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return

    setIsProcessing(true)
    let parsedTask: any = null
    let rawMode = false

    try {
      try {
        parsedTask = await parseNaturalLanguageTask(input.trim())
      } catch (err) {
        console.warn('AI parsing failed, falling back to raw input:', err)
        rawMode = true
        parsedTask = {
          title: input.trim(),
          description: null,
          priority: null,
          deadline: null,
          tags: []
        }
      }

      if (!parsedTask || !parsedTask.title) {
        parsedTask = {
          title: input.trim(),
          description: null,
          priority: null,
          deadline: null,
          tags: []
        }
        rawMode = true
      }

      const newTask = await createTask({
        title: parsedTask.title,
        description: parsedTask.description || null,
        priority: parsedTask.priority || null,
        deadline: parsedTask.deadline || null,
        workspace_id: currentWorkspaceId,
        completed: false
      })

      if (!newTask) throw new Error('Failed to create task')

      if (parsedTask.tags && parsedTask.tags.length > 0) {
        for (const tagName of parsedTask.tags) {
          try {
            const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
            const randomColor = colors[Math.floor(Math.random() * colors.length)]
            const tag = await createTag({ name: tagName, color: randomColor })
            if (tag) {
              await addTagToTask(newTask.id, tag.id)
            }
          } catch (ignore) {
            console.warn('Tag creation/linking failed for', tagName, ignore)
          }
        }
      }

      setInput('')
      setIsOpen(false)
      showToast(rawMode ? 'Görev oluşturuldu' : 'Görev AI ile oluşturuldu', 'success')
    } catch (err) {
      console.error('Error processing task:', err)
      showToast('Görev oluşturulamadı', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-background-elevated hover:bg-background-tertiary text-text-secondary hover:text-white rounded-xl border border-white/5 transition-all duration-200 text-sm font-medium"
      >
        <Sparkles className="w-4 h-4 text-primary" />
        <span>AI'ya Sor</span>
      </button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-background-elevated border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-medium">AI ile Oluştur</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/5 rounded-lg text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Görevinizi doğal bir dille tanımlayın... (örn. 'Yarın sabah 10'da web sitesi banner'ını güncelle öncelik yüksek #tasarım')"
                  className="w-full bg-transparent border-none p-0 text-lg resize-none focus:ring-0 text-text-primary placeholder:text-text-tertiary/50 min-h-[100px]"
                />
              </div>

              <div className="p-4 bg-background-tertiary/30 border-t border-white/5 flex items-center justify-between">
                <div className="text-xs text-text-tertiary">
                  Oluşturmak için <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-sans mx-1">Enter</kbd>'a basın
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isProcessing}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                    ${!input.trim() || isProcessing
                      ? 'bg-white/5 text-text-tertiary cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20'
                    }
                  `}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Oluşturuluyor...</span>
                    </>
                  ) : (
                    <>
                      <ArrowUp className="w-4 h-4" />
                      <span>Görev Oluştur</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
