import { useState, FormEvent } from 'react'
import { Mail, Lock, Loader2 } from 'lucide-react'

interface AuthFormProps {
  mode: 'login' | 'signup'
  onSubmit: (email: string, password: string) => Promise<{ error: any }>
  onToggleMode?: () => void
}

export function AuthForm({ mode, onSubmit, onToggleMode }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Basic validation
    if (!email || !password) {
      setError('Lütfen tüm alanları doldurun')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır')
      setLoading(false)
      return
    }

    const { error } = await onSubmit(email, password)

    if (error) {
      setError(error.message || 'Bir hata oluştu')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          {mode === 'login' ? 'Tekrar Hoş Geldiniz' : 'Hesap Oluştur'}
        </h1>
        <p className="text-text-tertiary">
          {mode === 'login'
            ? 'Görev listenize devam etmek için giriş yapın'
            : 'Yapay zeka ile görevlerinizi organize etmeye başlayın'}
        </p>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
            E-posta
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 min-h-[44px] bg-background-secondary border border-background-tertiary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
              placeholder="you@example.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
            Şifre
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 min-h-[44px] bg-background-secondary border border-background-tertiary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
              placeholder="••••••••"
              disabled={loading}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary-dark active:bg-primary-dark text-white font-semibold py-3.5 sm:py-3 px-4 min-h-[44px] rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {mode === 'login' ? 'Giriş yapılıyor...' : 'Hesap oluşturuluyor...'}
          </>
        ) : (
          mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'
        )}
      </button>

      {onToggleMode && mode === 'signup' && (
        <div className="text-center text-text-tertiary">
          <p>
            Zaten hesabınız var mı?{' '}
            <button
              type="button"
              onClick={onToggleMode}
              className="text-primary hover:text-primary-light font-medium"
            >
              Giriş yap
            </button>
          </p>
        </div>
      )}
    </form>
  )
}
