import React from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { MessageSquare, Library, HelpCircle, User, LogOut } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const companyId = localStorage.getItem('company_id')

  const handleLogout = () => {
    localStorage.clear()
    navigate('/')
  }

  const handleChatbotRedirect = () => {
    if (!companyId) {
      alert('No company ID found. Please login again.')
      return
    }
    navigate(`/ai/${companyId}/login`)
  }

  // Do not render navbar on public chatbot pages
  const isChatbotRoute = location.pathname.startsWith('/ai/')
  if (isChatbotRoute) return null

  return (
    <nav className="sticky top-0 z-50 bg-[#050811]/80 backdrop-blur-xl border-b border-[#6382b4]/12">
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2.5 no-underline group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4f7cff] to-[#7c3aed] flex items-center justify-center shadow-[0_4px_12px_rgba(79,124,255,0.25)] group-hover:scale-105 transition-transform">
            <span className="font-['Syne'] font-extrabold text-white text-base">B</span>
          </div>
          <span className="font-['Syne'] text-lg font-bold text-white tracking-tight">
            BASS
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-7">
          <NavLink 
            to="/home" 
            className={({ isActive }) => 
              `text-xs font-semibold tracking-wide transition-colors ${isActive ? 'text-[#4f7cff]' : 'text-[#64748b] hover:text-[#f0f4fc]'}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink 
            to="/tickets" 
            className={({ isActive }) => 
              `text-xs font-semibold tracking-wide transition-colors ${isActive ? 'text-[#4f7cff]' : 'text-[#64748b] hover:text-[#f0f4fc]'}`
            }
          >
            Tickets
          </NavLink>
          <NavLink 
            to="/profile" 
            className={({ isActive }) => 
              `text-xs font-semibold tracking-wide transition-colors ${isActive ? 'text-[#4f7cff]' : 'text-[#64748b] hover:text-[#f0f4fc]'}`
            }
          >
            Profile
          </NavLink>
          <NavLink 
            to="/contactus" 
            className={({ isActive }) => 
              `text-xs font-semibold tracking-wide transition-colors ${isActive ? 'text-[#4f7cff]' : 'text-[#64748b] hover:text-[#f0f4fc]'}`
            }
          >
            Help Desk
          </NavLink>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleChatbotRedirect}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#6382b4]/28 hover:bg-[#4f7cff]/10 text-[#4f7cff] font-['IBM_Plex_Mono'] text-[11px] tracking-wider transition-colors cursor-pointer"
          >
            <MessageSquare size={13} />
            Chatbot
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] text-white text-xs font-semibold shadow-[0_4px_12px_rgba(79,124,255,0.25)] hover:opacity-90 hover:shadow-[0_4px_18px_rgba(79,124,255,0.4)] transition-all cursor-pointer"
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
