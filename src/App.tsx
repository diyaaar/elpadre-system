import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { WorkspacesProvider } from './contexts/WorkspacesContext'
import { TasksProvider } from './contexts/TasksContext'
import { TagsProvider } from './contexts/TagsContext'
import { AttachmentsProvider } from './contexts/AttachmentsContext'
import { ToastProvider } from './contexts/ToastContext'
import { UndoSnackbarProvider } from './contexts/UndoSnackbarContext'
import { CalendarProvider } from './contexts/CalendarContext'
import { FinanceProvider } from './contexts/FinanceContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { ConfigError } from './components/ConfigError'
import { initializationError } from './lib/supabase'

function App() {
  // WebView: clear OAuth back-stack after successful Google Calendar connection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('clearHistory') === '1') {
      const rnWebView = (window as any).ReactNativeWebView
      if (rnWebView) {
        rnWebView.postMessage(JSON.stringify({ type: 'CLEAR_HISTORY' }))
      }
      ;(window as any).AndroidBridge?.clearHistory()
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // WebView: notify shell on every back navigation so it can intercept the back button
  useEffect(() => {
    const handlePopState = () => {
      const rnWebView = (window as any).ReactNativeWebView
      if (rnWebView) {
        rnWebView.postMessage(JSON.stringify({ type: 'NAVIGATED_BACK' }))
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Show config error if initialization failed
  if (initializationError) {
    return <ConfigError />
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <UndoSnackbarProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <WorkspacesProvider>
                      <TagsProvider>
                        <AttachmentsProvider>
                          <TasksProvider>
                            <CalendarProvider>
                              <FinanceProvider>
                                <Layout>
                                  <HomePage />
                                </Layout>
                              </FinanceProvider>
                            </CalendarProvider>
                          </TasksProvider>
                        </AttachmentsProvider>
                      </TagsProvider>
                    </WorkspacesProvider>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </UndoSnackbarProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
