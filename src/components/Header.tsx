import { useState, useEffect } from 'react'
import { LogOut, User, Camera } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { AvatarUploadModal } from './AvatarUploadModal'


export function Header() {
  const { user, signOut, avatarUrl } = useAuth()
  const navigate = useNavigate()
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Reset error when avatar URL changes (e.g. after upload)
  useEffect(() => {
    setImageError(false)
  }, [avatarUrl])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
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
                  Modern Zihin Haritası
                </h1>
                <p className="text-[10px] text-text-tertiary font-medium tracking-wider uppercase hidden sm:block">
                  Akıllı Görev Yönetimi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              {user && (
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-medium text-text-primary">{user.user_metadata?.full_name || 'Kullanıcı'}</span>
                    <span className="text-xs text-text-tertiary truncate max-w-[150px]">{user.email}</span>
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
                          alt="Profile"
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

