import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Building, ArrowRight, ShieldCheck } from 'lucide-react'

export default function Auth() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('login')
  
  // Login Form States
  const [logEmail, setLogEmail] = useState('')
  const [logPassword, setLogPassword] = useState('')
  const [logLoading, setLogLoading] = useState(false)

  // Register Form States
  const [regCompany, setRegCompany] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [passwordScore, setPasswordScore] = useState(0)
  const [regLoading, setRegLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (localStorage.getItem('access_token') && localStorage.getItem('company_id')) {
      navigate('/home')
    }
  }, [navigate])

  // Google GSI Sign In setup
  useEffect(() => {
    async function initGoogleOAuth() {
      try {
        const res = await fetch('/api/config')
        const config = await res.json()
        if (!config.google_client_id) return

        if (typeof google === 'undefined') {
          await new Promise((resolve) => {
            const script = document.createElement('script')
            script.src = 'https://accounts.google.com/gsi/client'
            script.async = true
            script.defer = true
            script.onload = resolve
            document.head.appendChild(script)
          })
        }

        window.google.accounts.id.initialize({
          client_id: config.google_client_id,
          callback: handleGoogleCredentialResponse
        })

        const googleBtn = document.getElementById('google-auth-btn-container')
        if (googleBtn) {
          window.google.accounts.id.renderButton(googleBtn, {
            theme: 'dark',
            size: 'large',
            width: 320,
            type: 'standard',
            shape: 'rectangular',
            text: 'continue_with',
            logo_alignment: 'left'
          })
        }
      } catch (e) {
        console.error('Failed to initialize Google OAuth:', e)
      }
    }
    
    // Re-initialize when activeTab changes because the button container is unmounted/remounted
    initGoogleOAuth()
  }, [activeTab])

  const handleGoogleCredentialResponse = async (response) => {
    const idToken = response.credential
    try {
      const res = await fetch('/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken })
      })
      
      const data = await res.json()
      if (!res.ok) {
        alert('Google Sign-In failed: ' + (data.detail || 'Unknown error'))
        return
      }
      
      if (data.company_id) localStorage.setItem('company_id', data.company_id)
      if (data.access_token) localStorage.setItem('access_token', data.access_token)
      navigate('/home')
    } catch (e) {
      console.error(e)
      alert('Google login failed due to network error.')
    }
  }

  // Password strength check
  const calculatePasswordStrength = (val) => {
    let score = 0
    if (val.length >= 8) score++
    if (/[A-Z]/.test(val)) score++
    if (/[0-9]/.test(val)) score++
    if (/[^A-Za-z0-9]/.test(val)) score++
    setPasswordScore(score)
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    if (!logEmail || !logPassword) return alert('Please enter both email and password.')
    setLogLoading(true)

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: logEmail, password: logPassword })
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        alert('Login failed: ' + (data?.detail || 'Unknown error'))
        setLogLoading(false)
        return
      }

      if (data.company_id) localStorage.setItem('company_id', data.company_id)
      if (data.access_token) localStorage.setItem('access_token', data.access_token)
      navigate('/home')
    } catch (err) {
      console.error(err)
      alert('Connection error occurred.')
      setLogLoading(false)
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    if (!regCompany || !regEmail || !regPassword) return alert('All fields are required.')
    setRegLoading(true)

    try {
      const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: regCompany, email: regEmail, password: regPassword })
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        alert(data?.detail || 'Registration failed')
        setRegLoading(false)
        return
      }

      if (data.company_id) localStorage.setItem('company_id', data.company_id)
      if (data.access_token) localStorage.setItem('access_token', data.access_token)
      navigate('/home')
    } catch (err) {
      console.error(err)
      alert('Connection error occurred.')
      setRegLoading(false)
    }
  }

  const fills = ['rgba(255,255,255,0.08)', '#ef4444', '#f97316', '#eab308', '#22c55e']

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative">
      <div className="grid-overlay"></div>
      
      {/* Container */}
      <div className="w-full max-w-[420px] rounded-2xl glass-card border border-[#6382b4]/12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative z-10 p-8 backdrop-blur-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-[#4f7cff] to-[#7c3aed] items-center justify-center shadow-[0_8px_20px_rgba(79,124,255,0.3)] mb-4">
            <span className="font-['Syne'] font-extrabold text-white text-xl">B</span>
          </div>
          <h2 className="font-['Syne'] text-2xl font-bold text-white tracking-tight">BASS Platform</h2>
          <p className="text-xs text-[#64748b] mt-1.5">Configure, deploy, and monitor your AI support assistant</p>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[#6382b4]/12 mb-6">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 pb-3 text-sm font-semibold tracking-wide transition-all border-b-2 cursor-pointer ${
              activeTab === 'login' 
                ? 'border-[#4f7cff] text-[#f0f4fc]' 
                : 'border-transparent text-[#64748b] hover:text-[#f0f4fc]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 pb-3 text-sm font-semibold tracking-wide transition-all border-b-2 cursor-pointer ${
              activeTab === 'register' 
                ? 'border-[#4f7cff] text-[#f0f4fc]' 
                : 'border-transparent text-[#64748b] hover:text-[#f0f4fc]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Panels */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Email address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748b] pointer-events-none">
                  <Mail size={14} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={logEmail}
                  onChange={(e) => setLogEmail(e.target.value)}
                  className="w-full bg-[#0d1426]/60 border border-[#6382b4]/12 rounded-lg py-2.5 pl-10 pr-4 text-xs text-[#f0f4fc] placeholder-[#64748b] focus:outline-none focus:border-[#4f7cff] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748b] pointer-events-none">
                  <Lock size={14} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={logPassword}
                  onChange={(e) => setLogPassword(e.target.value)}
                  className="w-full bg-[#0d1426]/60 border border-[#6382b4]/12 rounded-lg py-2.5 pl-10 pr-4 text-xs text-[#f0f4fc] placeholder-[#64748b] focus:outline-none focus:border-[#4f7cff] transition-all"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={logLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] text-white text-xs font-semibold shadow-[0_4px_12px_rgba(79,124,255,0.2)] hover:opacity-95 hover:shadow-[0_4px_18px_rgba(79,124,255,0.35)] transition-all disabled:opacity-50 cursor-pointer"
            >
              {logLoading ? 'Signing in...' : 'Sign in to platform'}
              <ArrowRight size={14} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Company Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748b] pointer-events-none">
                  <Building size={14} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={regCompany}
                  onChange={(e) => setRegCompany(e.target.value)}
                  className="w-full bg-[#0d1426]/60 border border-[#6382b4]/12 rounded-lg py-2.5 pl-10 pr-4 text-xs text-[#f0f4fc] placeholder-[#64748b] focus:outline-none focus:border-[#4f7cff] transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Email address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748b] pointer-events-none">
                  <Mail size={14} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-[#0d1426]/60 border border-[#6382b4]/12 rounded-lg py-2.5 pl-10 pr-4 text-xs text-[#f0f4fc] placeholder-[#64748b] focus:outline-none focus:border-[#4f7cff] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748b] pointer-events-none">
                  <Lock size={14} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="Min. 8 characters"
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value)
                    calculatePasswordStrength(e.target.value)
                  }}
                  className="w-full bg-[#0d1426]/60 border border-[#6382b4]/12 rounded-lg py-2.5 pl-10 pr-4 text-xs text-[#f0f4fc] placeholder-[#64748b] focus:outline-none focus:border-[#4f7cff] transition-all"
                />
              </div>
              
              {/* Strength Indicators */}
              <div className="flex gap-1.5 mt-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    style={{
                      backgroundColor: i <= passwordScore ? fills[passwordScore] : fills[0]
                    }}
                    className="flex-1 h-1 rounded-sm transition-colors duration-200"
                  />
                ))}
              </div>
            </div>

            <div className="text-[10px] text-[#64748b] leading-normal pt-1">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-[#4f7cff] hover:underline">Terms of Service</a> and{' '}
              <a href="#" className="text-[#4f7cff] hover:underline">Privacy Policy</a>.
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={regLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] text-white text-xs font-semibold shadow-[0_4px_12px_rgba(79,124,255,0.2)] hover:opacity-95 hover:shadow-[0_4px_18px_rgba(79,124,255,0.35)] transition-all disabled:opacity-50 cursor-pointer"
            >
              {regLoading ? 'Creating account...' : 'Create account'}
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-[1px] bg-[#6382b4]/12" />
          <span className="text-[9px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Or continue with</span>
          <div className="flex-1 h-[1px] bg-[#6382b4]/12" />
        </div>

        {/* Google OAuth Button */}
        <div className="flex justify-center">
          <div id="google-auth-btn-container" className="google-signin-container shadow-md rounded overflow-hidden" />
        </div>
      </div>
    </div>
  )
}
