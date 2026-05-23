import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, ShieldAlert, Key, AlertOctagon, RefreshCw, CheckCircle, Trash2 } from 'lucide-react'

export default function Profile() {
  const navigate = useNavigate()
  
  // Profile Info States
  const [companyName, setCompanyName] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [isGoogleLinked, setIsGoogleLinked] = useState(false)
  const [avatarInitials, setAvatarInitials] = useState('??')
  const [loading, setLoading] = useState(true)

  // Edit Name States
  const [newName, setNewName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)

  // Edit Email States
  const [newEmail, setNewEmail] = useState('')
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  // Edit Password States
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword1, setNewPassword1] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [passwordScore, setPasswordScore] = useState(0)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const companyId = localStorage.getItem('company_id')
  const accessToken = localStorage.getItem('access_token')

  useEffect(() => {
    if (!accessToken || !companyId) {
      navigate('/')
    } else {
      loadProfileData()
    }
  }, [accessToken, companyId, navigate])

  // Google GSI link button injector
  useEffect(() => {
    async function initGoogleOAuthLink() {
      if (isGoogleLinked) return // Don't show button if already linked
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
          callback: handleGoogleLinkResponse
        })

        const linkBtn = document.getElementById('google-link-btn-container')
        if (linkBtn) {
          window.google.accounts.id.renderButton(linkBtn, {
            theme: 'outline',
            size: 'medium',
            type: 'standard',
            shape: 'rectangular',
            text: 'signin_with',
            logo_alignment: 'left'
          })
        }
      } catch (e) {
        console.error('Failed to initialize Google link OAuth:', e)
      }
    }

    if (!loading) {
      initGoogleOAuthLink()
    }
  }, [loading, isGoogleLinked])

  const loadProfileData = async () => {
    try {
      const res = await fetch(`/company/${companyId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (!res.ok) throw new Error('Failed to load profile')
      const data = await res.json()

      const name = data.company || ''
      const email = data.email || ''
      const isGoogle = data.is_google || false

      setCompanyName(name)
      setNewName(name)
      setCompanyEmail(email)
      setIsGoogleLinked(isGoogle)

      // Set avatar initials
      const parts = name.trim().split(/\s+/)
      const initials = parts.length >= 2
        ? parts[0][0] + parts[1][0]
        : parts[0].slice(0, 2)
      setAvatarInitials(initials.toUpperCase())

    } catch (err) {
      console.error(err)
      alert('Could not load profile data')
    } finally {
      setLoading(false)
    }
  }

  // Update Name Action
  const handleUpdateName = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return alert('Company name cannot be empty')
    setNameLoading(true)

    try {
      const res = await fetch(`/updatename/${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ company: newName.trim() })
      })

      if (res.ok) {
        alert('Company name updated successfully! 🎉')
        loadProfileData()
      } else {
        const err = await res.json()
        alert(err.detail || 'Update failed')
      }
    } catch {
      alert('Server connection error')
    } finally {
      setNameLoading(false)
    }
  }

  // Update Email Action
  const handleUpdateEmail = async (e) => {
    e.preventDefault()
    if (!newEmail.trim() || !emailConfirmPassword) return alert('All fields are required')
    setEmailLoading(true)

    try {
      const res = await fetch(`/updateemail/${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ email: newEmail.trim(), password: emailConfirmPassword })
      })

      if (res.ok) {
        alert('Email updated successfully! 🎉')
        setNewEmail('')
        setEmailConfirmPassword('')
        loadProfileData()
      } else {
        const err = await res.json()
        alert(err.detail || 'Email update failed')
      }
    } catch {
      alert('Connection error occurred')
    } finally {
      setEmailLoading(false)
    }
  }

  // Update Password Action
  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!currentPassword || !newPassword1 || !newPassword2) return alert('All fields are required')
    setPasswordLoading(true)

    try {
      const res = await fetch(`/updatepassword/${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          password1: newPassword1,
          password2: newPassword2,
          current_password: currentPassword
        })
      })

      if (res.ok) {
        alert('Password updated successfully! 🎉')
        setCurrentPassword('')
        setNewPassword1('')
        setNewPassword2('')
        setPasswordScore(0)
      } else {
        const err = await res.json()
        alert(err.detail || 'Error updating password')
      }
    } catch {
      alert('Connection error occurred')
    } finally {
      setPasswordLoading(false)
    }
  }

  const checkPasswordStrength = (val) => {
    let score = 0
    if (val.length >= 8) score++
    if (/[A-Z]/.test(val)) score++
    if (/[0-9]/.test(val)) score++
    if (/[^A-Za-z0-9]/.test(val)) score++
    setPasswordScore(score)
  }

  // Google Link Call
  const handleGoogleLinkResponse = async (response) => {
    const idToken = response.credential
    try {
      const res = await fetch('/link-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ token: idToken })
      })

      const data = await res.json()
      if (res.ok) {
        alert('Google account linked successfully! 🎉')
        loadProfileData()
      } else {
        alert('Failed to link Google account: ' + (data.detail || 'Unknown error'))
      }
    } catch {
      alert('Connection error')
    }
  }

  // Google Unlink Call
  const unlinkGoogleAccount = async () => {
    if (!confirm('Are you sure you want to unlink your Google account?')) return

    try {
      const res = await fetch('/unlink-google', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      const data = await res.json()
      if (res.ok) {
        alert('Google account unlinked successfully!')
        loadProfileData()
      } else {
        alert(data.detail || 'Failed to unlink Google account')
      }
    } catch {
      alert('Connection error')
    }
  }

  // Deactivate Account
  const deactivateAccount = async () => {
    if (!confirm('Are you sure you want to temporarily deactivate your account? You can reactivate anytime by logging in again.')) return

    try {
      const res = await fetch(`/deactivate/${companyId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      if (res.ok) {
        alert('Account deactivated. You will be logged out.')
        localStorage.clear()
        navigate('/')
      } else {
        const data = await res.json()
        alert(data.detail || 'Error occurred during deactivation')
      }
    } catch {
      alert('Server error')
    }
  }

  // Permanent Delete
  const deleteAccountPermanently = async () => {
    const confirm1 = confirm('⚠️ DANGER ZONE: Are you absolutely sure you want to permanently delete your account?\n\nThis will destroy all your company database configurations, vector segments, uploaded PDFs, raised tickets, and active chatbot conversations.\n\nThis action is completely irreversible!')
    if (!confirm1) return

    const confirm2 = prompt('To confirm deletion, type your company name below:')
    if (confirm2 !== companyName) {
      alert('Deletion cancelled. Company name mismatch.')
      return
    }

    try {
      const res = await fetch(`/delete-account/${companyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      if (res.ok) {
        alert('Your account and all associated data have been permanently deleted. Goodbye!')
        localStorage.clear()
        navigate('/')
      } else {
        const data = await res.json()
        alert(data.detail || 'Error occurred during deletion')
      }
    } catch {
      alert('Server connection error')
    }
  }

  const fills = ['rgba(255,255,255,0.08)', '#ef4444', '#f97316', '#eab308', '#22c55e']

  return (
    <div className="max-w-[760px] mx-auto px-4 md:px-6 py-12 relative z-10">
      
      {/* Banner Card */}
      <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6 mb-8 border border-[#6382b4]/12 shadow-lg">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4f7cff] to-[#7c3aed] flex items-center justify-center font-['Syne'] font-extrabold text-white text-2xl shadow-[0_6px_20px_rgba(79,124,255,0.3)] select-none">
          {avatarInitials}
        </div>
        
        {/* Profile info */}
        <div className="text-center sm:text-left flex-1">
          <h2 className="font-['Syne'] text-xl font-bold text-white tracking-tight leading-tight">{companyName || 'Loading...'}</h2>
          <p className="text-xs text-[#64748b] font-mono mt-1">{companyEmail}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs font-['IBM_Plex_Mono'] text-[#64748b]">
          <RefreshCw className="animate-spin inline-block mr-2" size={14} />
          Loading settings...
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Section: Company Details */}
          <div className="glass-card rounded-2xl p-6 md:p-8 border border-[#6382b4]/12">
            <div className="flex items-center gap-2 mb-6 border-b border-[#6382b4]/12 pb-3">
              <User size={16} className="text-[#4f7cff]" />
              <h3 className="font-['Syne'] text-sm font-bold text-white tracking-tight">Account Details</h3>
            </div>
            
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Company Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#0d1426]/60 border border-[#6382b4]/12 rounded-lg py-2 px-3 text-xs text-[#f0f4fc] focus:outline-none focus:border-[#4f7cff] transition-all"
                />
              </div>
              
              <button
                type="submit"
                disabled={nameLoading}
                className="px-4 py-2 bg-[#4f7cff]/10 hover:bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {nameLoading ? 'Saving...' : 'Save Name'}
              </button>
            </form>
          </div>

          {/* Section: Connected Accounts (Google Link) */}
          <div className="glass-card rounded-2xl p-6 md:p-8 border border-[#6382b4]/12">
            <div className="flex items-center gap-2 mb-6 border-b border-[#6382b4]/12 pb-3">
              <ShieldAlert size={16} className="text-[#4f7cff]" />
              <h3 className="font-['Syne'] text-sm font-bold text-white tracking-tight">Connected Accounts</h3>
            </div>
            
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-3">
                {/* Custom Google logo */}
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-[#6382b4]/12">
                  <svg width="15" height="15" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <span className="font-['Syne'] text-xs font-semibold text-white block">Google OAuth</span>
                  <span className="text-[10px] text-[#64748b] block mt-0.5">Link social authentication profiles</span>
                </div>
              </div>

              {isGoogleLinked ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#10b981] font-mono border border-[#10b981]/20 bg-[#10b981]/5 px-2 py-0.5 rounded-full">
                    <CheckCircle size={10} />
                    Linked
                  </span>
                  <button
                    onClick={unlinkGoogleAccount}
                    className="px-3 py-1.5 border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg text-[10px] font-semibold tracking-wider font-mono cursor-pointer transition-colors"
                  >
                    Unlink
                  </button>
                </div>
              ) : (
                <div id="google-link-btn-container" className="shadow-sm rounded overflow-hidden" />
              )}
            </div>
          </div>

          {/* Section: Change Email */}
          <div className="glass-card rounded-2xl p-6 md:p-8 border border-[#6382b4]/12">
            <div className="flex items-center gap-2 mb-6 border-b border-[#6382b4]/12 pb-3">
              <Mail size={16} className="text-[#4f7cff]" />
              <h3 className="font-['Syne'] text-sm font-bold text-white tracking-tight">Change Email</h3>
            </div>
            
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">New Email</label>
                  <input
                    type="email"
                    required
                    placeholder="new-email@company.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-[#0d1426]/60 border border-[#6382b4]/12 rounded-lg py-2 px-3 text-xs text-[#f0f4fc] focus:outline-none focus:border-[#4f7cff] transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Confirm local password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={emailConfirmPassword}
                    onChange={(e) => setEmailConfirmPassword(e.target.value)}
                    className="w-full bg-[#0d1426]/60 border border-[#6382b4]/12 rounded-lg py-2 px-3 text-xs text-[#f0f4fc] focus:outline-none focus:border-[#4f7cff] transition-all"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={emailLoading}
                className="px-4 py-2 bg-[#4f7cff]/10 hover:bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {emailLoading ? 'Updating...' : 'Change Email'}
              </button>
            </form>
          </div>

          {/* Section: Security / Password */}
          <div className="glass-card rounded-2xl p-6 md:p-8 border border-[#6382b4]/12">
            <div className="flex items-center gap-2 mb-6 border-b border-[#6382b4]/12 pb-3">
              <Key size={16} className="text-[#4f7cff]" />
              <h3 className="font-['Syne'] text-sm font-bold text-white tracking-tight">Security Credentials</h3>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-[#0d1426]/60 border border-[#6382b4]/12 rounded-lg py-2 px-3 text-xs text-[#f0f4fc] focus:outline-none focus:border-[#4f7cff] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min. 8 characters"
                    value={newPassword1}
                    onChange={(e) => {
                      setNewPassword1(e.target.value)
                      checkPasswordStrength(e.target.value)
                    }}
                    className="w-full bg-[#0d1426]/60 border border-[#6382b4]/12 rounded-lg py-2 px-3 text-xs text-[#f0f4fc] focus:outline-none focus:border-[#4f7cff] transition-all"
                  />
                  
                  {/* Strength Bar */}
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor: i <= passwordScore ? fills[passwordScore] : fills[0]
                        }}
                        className="flex-1 h-[3px] rounded-sm transition-all duration-200"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                    className="w-full bg-[#0d1426]/60 border border-[#6382b4]/12 rounded-lg py-2 px-3 text-xs text-[#f0f4fc] focus:outline-none focus:border-[#4f7cff] transition-all"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-4 py-2 bg-[#4f7cff]/10 hover:bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {passwordLoading ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Section: Danger Zone */}
          <div className="border border-red-500/20 bg-red-950/10 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6 border-b border-red-500/20 pb-3">
              <AlertOctagon size={16} className="text-[#ef4444]" />
              <h3 className="font-['Syne'] text-sm font-bold text-red-300 tracking-tight">Danger Zone</h3>
            </div>
            
            <div className="space-y-6">
              {/* Deactivate */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="font-['Syne'] text-xs font-semibold text-red-200 block">Deactivate account</span>
                  <span className="text-[10px] text-[#64748b] block mt-0.5 leading-relaxed">Temporarily disable your company account — reactivate anytime by logging back in</span>
                </div>
                <button
                  onClick={deactivateAccount}
                  className="px-3.5 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-[10px] font-semibold tracking-wider font-mono cursor-pointer transition-colors sm:self-center self-start"
                >
                  Deactivate
                </button>
              </div>

              <div className="h-[1px] bg-red-500/10" />

              {/* Delete Permanently */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="font-['Syne'] text-xs font-semibold text-red-200 block">Delete account permanently</span>
                  <span className="text-[10px] text-[#64748b] block mt-0.5 leading-relaxed">Irreversibly delete all PDF vector indexes, support chat histories, and platform profile records</span>
                </div>
                <button
                  onClick={deleteAccountPermanently}
                  className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg text-[10px] font-semibold tracking-wider font-mono shadow-[0_4px_10px_rgba(239,68,68,0.2)] hover:opacity-95 cursor-pointer transition-all sm:self-center self-start flex items-center gap-1.5"
                >
                  <Trash2 size={11} />
                  Delete account
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
