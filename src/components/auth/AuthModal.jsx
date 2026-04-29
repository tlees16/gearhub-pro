'use client'

import { useState } from 'react'
import { X, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import {
  signInWithGoogle, signInWithApple,
  signInWithEmail, signUpWithEmail, resetPassword,
} from '../../services/auth'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

export default function AuthModal({ onClose, hint }) {
  const [tab, setTab] = useState('signin') // signin | signup | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(null) // 'google' | 'apple' | 'email'
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handle = (provider, fn) => async (e) => {
    e?.preventDefault()
    setError(null)
    setLoading(provider)
    try {
      await fn()
      if (provider === 'email' && tab === 'signup') {
        setSuccess('Check your email to confirm your account.')
      } else if (provider === 'email' && tab === 'reset') {
        setSuccess('Password reset link sent — check your email.')
      } else {
        onClose()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — bottom sheet on mobile, centered dialog on desktop */}
      <div className="relative w-full max-w-sm max-h-[85dvh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-xl shadow-2xl p-6 mb-14 sm:mb-0">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Logo */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold">
            GearHub<span className="text-indigo-400">Pro</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {tab === 'signin' && 'Sign in to your account'}
            {tab === 'signup' && 'Create your account'}
            {tab === 'reset' && 'Reset your password'}
          </p>
        </div>

        {/* Hint */}
        {hint && !error && !success && (
          <div className="mb-4 p-3 bg-indigo-950/40 border border-indigo-900/50 rounded-lg text-xs text-indigo-300">
            {hint}
          </div>
        )}

        {/* Error / Success */}
        {error && (
          <div className="flex items-start gap-2 mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-400">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-xs text-emerald-400">
            {success}
          </div>
        )}

        {tab !== 'reset' && (
          <>
            {/* OAuth buttons */}
            <div className="space-y-2.5 mb-5">
              <button
                onClick={handle('google', signInWithGoogle)}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                {loading === 'google' ? <Loader2 size={14} className="animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </button>
              <button
                onClick={handle('apple', signInWithApple)}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-slate-800 text-slate-100 text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {loading === 'apple' ? <Loader2 size={14} className="animate-spin" /> : <AppleIcon />}
                Continue with Apple
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-600">or</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
          </>
        )}

        {/* Email form */}
        <form onSubmit={handle('email', () =>
          tab === 'signin' ? signInWithEmail(email, password)
          : tab === 'signup' ? signUpWithEmail(email, password)
          : resetPassword(email)
        )}>
          <div className="space-y-3">
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {tab !== 'reset' && (
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={!!loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'email' && <Loader2 size={14} className="animate-spin" />}
              {tab === 'signin' && 'Sign in'}
              {tab === 'signup' && 'Create account'}
              {tab === 'reset' && 'Send reset link'}
            </button>
          </div>
        </form>

        {/* Tab switcher */}
        <div className="mt-4 text-center text-xs text-slate-500 space-y-1.5">
          {tab === 'signin' && (
            <>
              <p>
                No account?{' '}
                <button onClick={() => { setTab('signup'); setError(null) }} className="text-indigo-400 hover:text-indigo-300">
                  Sign up
                </button>
              </p>
              <p>
                <button onClick={() => { setTab('reset'); setError(null) }} className="text-slate-500 hover:text-slate-400">
                  Forgot password?
                </button>
              </p>
            </>
          )}
          {tab === 'signup' && (
            <p>
              Already have an account?{' '}
              <button onClick={() => { setTab('signin'); setError(null) }} className="text-indigo-400 hover:text-indigo-300">
                Sign in
              </button>
            </p>
          )}
          {tab === 'reset' && (
            <p>
              <button onClick={() => { setTab('signin'); setError(null) }} className="text-indigo-400 hover:text-indigo-300">
                Back to sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
