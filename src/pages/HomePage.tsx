import { useState } from 'react'
import { Plus, Camera, Calendar, List, Wallet } from 'lucide-react'
import { useTasks } from '../contexts/TasksContext'
import { useWorkspaces } from '../contexts/WorkspacesContext'
import { useUndoSnackbar } from '../contexts/UndoSnackbarContext'
import { TaskList } from '../components/TaskList'
import { TaskFilters } from '../components/TaskFilters'
import { TaskForm } from '../components/TaskForm'
import { NaturalLanguageInput } from '../components/NaturalLanguageInput'
import { TaskListSkeleton } from '../components/SkeletonLoader'
import { WorkspaceNavigation } from '../components/WorkspaceNavigation'
import { PhotoTaskRecognition } from '../components/PhotoTaskRecognition'
import { UndoSnackbar } from '../components/UndoSnackbar'
import { CalendarPage } from './CalendarPage'
import { FinancePage } from '../domains/finance/FinancePage'
import { motion, AnimatePresence } from 'framer-motion'

type ViewMode = 'tasks' | 'calendar' | 'finance'

export function HomePage() {
  const { loading, error, filteredAndSortedTasks } = useTasks()
  const { workspaces, currentWorkspaceId } = useWorkspaces()
  const { currentAction, isOpen, closeSnackbar } = useUndoSnackbar()
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [showPhotoRecognition, setShowPhotoRecognition] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('tasks')

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId)

  return (
    <div className="relative min-h-[calc(100vh-5rem)]">
      {/* Dynamic Ambient Background */}
      {currentWorkspace && (
        <>
          <motion.div
            key={`bg-${currentWorkspaceId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 pointer-events-none z-[-1]"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${currentWorkspace.color}15 0%, transparent 60%)`,
            }}
          />
          <motion.div
            className="fixed inset-0 pointer-events-none z-[-1] opacity-30"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}
          />
        </>
      )}

      {/* Main Container */}
      <div className="max-w-5xl mx-auto space-y-8 pb-20">

        {/* Workspace Navigation & View Toggle */}
        <div className="space-y-6">
          {viewMode === 'tasks' && <WorkspaceNavigation />}

          {/* View Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-background-elevated/50 backdrop-blur-md border border-white/5 rounded-xl shadow-lg">
              <button
                onClick={() => setViewMode('tasks')}
                className={`
                  relative flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300
                  ${viewMode === 'tasks' ? 'text-white' : 'text-text-tertiary hover:text-text-primary'}
                `}
              >
                {viewMode === 'tasks' && (
                  <motion.div
                    layoutId="viewModeBg"
                    className="absolute inset-0 bg-primary/20 border border-primary/20 rounded-lg shadow-glow-primary"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <List className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Görevler</span>
              </button>

              <button
                onClick={() => setViewMode('calendar')}
                className={`
                  relative flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300
                  ${viewMode === 'calendar' ? 'text-white' : 'text-text-tertiary hover:text-text-primary'}
                `}
              >
                {viewMode === 'calendar' && (
                  <motion.div
                    layoutId="viewModeBg"
                    className="absolute inset-0 bg-primary/20 border border-primary/20 rounded-lg shadow-glow-primary"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Calendar className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Takvim</span>
              </button>

              <button
                onClick={() => setViewMode('finance')}
                className={`
                  relative flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300
                  ${viewMode === 'finance' ? 'text-white' : 'text-text-tertiary hover:text-text-primary'}
                `}
              >
                {viewMode === 'finance' && (
                  <motion.div
                    layoutId="viewModeBg"
                    className="absolute inset-0 bg-primary/20 border border-primary/20 rounded-lg shadow-glow-primary"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Wallet className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Finans</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Content */}
        <AnimatePresence mode="wait">
          {viewMode === 'tasks' ? (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                    {currentWorkspace?.name || 'Tüm Görevler'}
                    {currentWorkspace && (
                      <span
                        className="w-2.5 h-2.5 rounded-full ring-2 ring-background ring-offset-2 ring-offset-current"
                        style={{ color: currentWorkspace.color, '--tw-ring-offset-color': currentWorkspace.color } as any}
                      />
                    )}
                  </h2>
                </div>

                <div className="flex items-stretch gap-2 w-full sm:w-auto">
                  {/* Left Column: Secondary Actions (Stacked on mobile) */}
                  <div className="flex flex-col sm:flex-row gap-2 flex-auto sm:flex-none">
                    <button
                      onClick={() => setShowPhotoRecognition(true)}
                      className="flex items-center justify-center sm:justify-start gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-background-elevated hover:bg-background-tertiary text-text-secondary hover:text-white rounded-xl border border-white/5 transition-all duration-200 text-xs sm:text-sm font-medium whitespace-nowrap w-full h-full"
                    >
                      <Camera className="w-4 h-4 shrink-0" />
                      <span>El Yazısı Tara</span>
                    </button>

                    <NaturalLanguageInput />
                  </div>

                  {/* Right Column: Primary Action */}
                  <button
                    onClick={() => setShowNewTaskForm(!showNewTaskForm)}
                    className="flex items-center justify-center sm:justify-start flex-1 sm:flex-none gap-1.5 px-3 sm:px-5 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 text-sm font-medium whitespace-nowrap"
                  >
                    <Plus className="w-5 h-5 shrink-0" />
                    <span>Yeni Görev</span>
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-danger/10 border border-danger/20 text-danger-light px-4 py-3 rounded-xl text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Input Area */}
              <div className="space-y-4">
                <AnimatePresence>
                  {showNewTaskForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="overflow-hidden"
                    >
                      <TaskForm
                        onCancel={() => setShowNewTaskForm(false)}
                        onSave={() => setShowNewTaskForm(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Filters & List */}
              <div className="space-y-4">
                <TaskFilters />

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentWorkspaceId || 'no-workspace'}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    {loading && filteredAndSortedTasks.length === 0 ? (
                      <TaskListSkeleton />
                    ) : (
                      <div className="min-h-[300px]">
                        <TaskList />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          ) : viewMode === 'calendar' ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-background-secondary/50 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm"
            >
              <CalendarPage />
            </motion.div>
          ) : (
            <motion.div
              key="finance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-background-secondary/50 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm"
            >
              <FinancePage />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Photo Recognition Modal */}
      <PhotoTaskRecognition
        isOpen={showPhotoRecognition}
        onClose={() => setShowPhotoRecognition(false)}
        onTasksCreated={() => {
          setShowPhotoRecognition(false)
        }}
      />

      {/* Global Undo Snackbar */}
      {currentAction && (
        <UndoSnackbar
          isOpen={isOpen}
          onUndo={currentAction.onUndo}
          onClose={closeSnackbar}
          message={currentAction.message}
        />
      )}
    </div>
  )
}

