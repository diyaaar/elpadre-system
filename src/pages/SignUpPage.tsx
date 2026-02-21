import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthForm } from '../components/AuthForm'
import { useAuth } from '../contexts/AuthContext'
import { Mail } from 'lucide-react'

export function SignUpPage() {
  const { signUp, user } = useAuth()
  const navigate = useNavigate()
  const [emailSent, setEmailSent] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const handleSignUp = async (email: string, password: string) => {
    const result = await signUp(email, password)
    if (!result.error) {
      // Supabase email confirm mode — user won't be logged in immediately
      setEmailSent(email)
    }
    return result
  }

  const handleToggleMode = () => {
    navigate('/login')
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">E-postanızı Doğrulayın</h1>
            <p className="text-text-tertiary text-sm leading-relaxed">
              <span className="text-text-secondary font-medium">{emailSent}</span> adresine bir doğrulama bağlantısı gönderdik.
              Bağlantıya tıkladıktan sonra giriş yapabilirsiniz.
            </p>
          </div>
          <div className="bg-background-secondary/60 border border-white/10 rounded-xl p-4 text-xs text-text-tertiary text-left space-y-1">
            <p>• Spam/Gereksiz klasörünüzü kontrol edin</p>
            <p>• Bağlantı 24 saat geçerlidir</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <AuthForm mode="signup" onSubmit={handleSignUp} onToggleMode={handleToggleMode} />
      </div>
    </div>
  )
}
