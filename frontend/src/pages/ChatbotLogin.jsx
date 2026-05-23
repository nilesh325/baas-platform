import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'

export default function ChatbotLogin() {
  const { company_id } = useParams()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [companyName, setCompanyName] = useState('Workspace')

  useEffect(() => {
    // Dynamically retrieve the company name to show on the greeting banner
    async function loadCompanyName() {
      if (!company_id) return
      try {
        const res = await fetch(`/companyname/${company_id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.company) {
            setCompanyName(data.company)
          }
        }
      } catch (err) {
        console.warn('Failed to retrieve company name:', err)
      }
    }
    loadCompanyName()
  }, [company_id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!company_id) {
      setErrorMsg('Invalid workspace URL')
      return
    }

    if (!email.trim()) {
      setErrorMsg('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/ai/${company_id}/logined`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id, email: email.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.detail || 'Server authentication failed')
        setLoading(false)
        return
      }

      localStorage.setItem('user_email', email.trim())
      
      // Extract relative path from absolute redirect url
      let dest = data.redirect_url
      if (dest.includes('/ai/')) {
        const relativeIdx = dest.indexOf('/ai/')
        dest = dest.substring(relativeIdx)
      }
      navigate(dest)

    } catch (err) {
      console.error(err)
      setErrorMsg('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative">
      <div className="grid-overlay"></div>

      <div className="w-full max-w-[400px] rounded-2xl glass-card border border-[#6382b4]/12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative z-10 p-8 backdrop-blur-2xl text-center">
        
        {/* Logo Icon */}
        <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-[#4f7cff] to-[#7c3aed] items-center justify-center shadow-[0_8px_20px_rgba(79,124,255,0.3)] mb-5">
          <ShieldCheck size={22} className="text-white" />
        </div>

        {/* Title */}
        <h2 className="font-['Syne'] text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">Welcome to the Assistant</h2>
        <p className="text-xs text-[#64748b] leading-relaxed mt-2">
          Enter your email to authenticate and start a secure support session with <strong>{companyName}</strong>.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-6 text-left">
          <div className="space-y-1.5">
            <label className="text-[10px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Work Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748b] pointer-events-none">
                <Mail size={14} />
              </span>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-[#0d1426]/60 border rounded-lg py-2.5 pl-10 pr-4 text-xs text-[#f0f4fc] placeholder-[#64748b] font-mono focus:outline-none transition-all ${
                  errorMsg ? 'border-red-500 bg-red-950/5' : 'border-[#6382b4]/12 focus:border-[#4f7cff]'
                }`}
              />
            </div>
            {errorMsg && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-red-400 mt-1">
                <AlertCircle size={12} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] text-white text-xs font-semibold shadow-[0_4px_12px_rgba(79,124,255,0.2)] hover:opacity-95 hover:shadow-[0_4px_18px_rgba(79,124,255,0.35)] transition-all disabled:opacity-50 cursor-pointer font-mono"
          >
            {loading ? 'Please wait...' : 'Continue'}
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>

        <p className="text-[10px] text-[#64748b] font-mono mt-6 leading-relaxed">
          🔒 Your email is used only to securely identify your company workspace session.
        </p>
      </div>
    </div>
  )
}
