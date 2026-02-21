import { useState, useEffect, useRef } from 'react'
import { LogOut, User, Camera, Pencil, Check, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { AvatarUploadModal } from './AvatarUploadModal'
import { useToast } from '../contexts/ToastContext'

export function Header() {
  const { user, signOut, avatarUrl, displayName, updateDisplayName } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Inline name editing state
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Reset error when avatar URL changes
  useEffect(() => {
    setImageError(false)
  }, [avatarUrl])

  // Sync nameValue when displayName changes externally
  useEffect(() => {
    if (!editingName) {
      setNameValue(displayName || '')
    }
  }, [displayName, editingName])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const startEditingName = () => {
    setNameValue(displayName || '')
    setEditingName(true)
    // Focus input on next tick
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }

  const cancelEditingName = () => {
    setEditingName(false)
    setNameValue(displayName || '')
  }

  const saveName = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === displayName) {
      setEditingName(false)
      return
    }
    setSavingName(true)
    try {
      await updateDisplayName(trimmed)
      showToast('İsim güncellendi', 'success', 2000)
      setEditingName(false)
    } catch {
      showToast('İsim güncellenemedi', 'error', 3000)
    } finally {
      setSavingName(false)
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') saveName()
    if (e.key === 'Escape') cancelEditingName()
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-xl bg-background/60 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Yönetim Sistemi
                </h1>
                <p className="text-[10px] text-text-tertiary font-medium tracking-wider uppercase hidden sm:block">
                  by Ali Diyar DURAN
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              {user && (
                <div className="flex items-center gap-4">
                  {/* Display Name + Email — desktop only */}
                  <div className="hidden md:flex flex-col items-end gap-0.5">
                    {editingName ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={nameInputRef}
                          type="text"
                          value={nameValue}
                          onChange={(e) => setNameValue(e.target.value)}
                          onKeyDown={handleNameKeyDown}
                          disabled={savingName}
                          className="text-sm font-medium text-text-primary bg-background-secondary border border-primary/40 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary w-36"
                          maxLength={40}
                        />
                        <button
                          onClick={saveName}
                          disabled={savingName}
                          className="text-primary hover:text-primary-light transition-colors"
                          title="Kaydet"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={cancelEditingName}
                          disabled={savingName}
                          className="text-text-tertiary hover:text-text-primary transition-colors"
                          title="İptal"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={startEditingName}
                        className="group flex items-center gap-1 text-sm font-medium text-text-primary hover:text-white transition-colors"
                        title="İsmi düzenle"
                      >
                        <span>{displayName || 'Kullanıcı'}</span>
                        <Pencil className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                    {/* Email — no truncation, full display */}
                    <span className="text-xs text-text-tertiary">{user.email}</span>
                  </div>

                  {/* Avatar */}
                  <div className="relative group">
                    <button
                      onClick={() => setShowAvatarModal(true)}
                      className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 hover:border-primary/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background shadow-lg shadow-black/20 bg-background-elevated"
                      title="Profil fotoğrafını değiştir"
                      aria-label="Profil fotoğrafını değiştir"
                    >
                      {avatarUrl && !imageError ? (
                        <img
                          src={avatarUrl}
                          alt="Profil"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center group-hover:bg-background-tertiary transition-colors">
                          <User className="w-5 h-5 text-text-tertiary group-hover:text-primary transition-colors" />
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                        <Camera className="w-4 h-4 text-white scale-75 group-hover:scale-100 transition-transform duration-300" />
                      </div>
                    </button>

                    {/* Status Dot */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background shadow-sm" />
                  </div>

                  <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200 border border-white/5 hover:border-white/10"
                    title="Çıkış yap"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Çıkış</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16 sm:h-20" />

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <AvatarUploadModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          currentAvatarUrl={avatarUrl}
        />
      )}
    </>
  )
}
