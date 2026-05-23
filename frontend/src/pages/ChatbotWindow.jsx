import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Ticket, X, Check, ArrowRight, Bot, User, AlertCircle, HelpCircle } from 'lucide-react'

export default function ChatbotWindow() {
  const { company_id, session_id } = useParams()
  const navigate = useNavigate()
  
  const [messages, setMessages] = useState([
    { text: 'Hi! How can I assist you today? 👋', isUser: false }
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [companyName, setCompanyName] = useState('Assistant')

  // Raise Ticket Form States
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [ticketEmail, setTicketEmail] = useState('')
  const [ticketQuery, setTicketQuery] = useState('')
  const [ticketSuccess, setTicketSuccess] = useState(false)
  const [ticketSubmitting, setTicketSubmitting] = useState(false)

  const messagesEndRef = useRef(null)

  useEffect(() => {
    // Dynamically retrieve company name for the header title
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
        console.warn('Failed to load company name:', err)
      }
    }
    loadCompanyName()
  }, [company_id])

  // Scroll to bottom whenever messages or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    const question = inputText.trim()
    if (!question) return

    setMessages(prev => [...prev, { text: question, isUser: true }])
    setInputText('')
    setIsTyping(true)

    try {
      const formData = new FormData()
      formData.append('company_id', company_id)
      formData.append('question', question)

      const res = await fetch('/ask', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      setIsTyping(false)

      if (!res.ok) {
        setMessages(prev => [...prev, { text: data.detail || 'Error getting response from assistant', isUser: false }])
        return
      }

      setMessages(prev => [...prev, { text: data.answer, isUser: false }])

    } catch (err) {
      console.error(err)
      setIsTyping(false)
      setMessages(prev => [...prev, { text: 'Connection lost. Please check server and try again.', isUser: false }])
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleOpenTicketForm = () => {
    setTicketEmail(localStorage.getItem('user_email') || '')
    setTicketQuery('')
    setTicketSuccess(false)
    setTicketModalOpen(true)
  }

  const handleSubmitTicket = async (e) => {
    e.preventDefault()
    if (!ticketEmail.trim() || !ticketQuery.trim()) {
      return alert('All fields are required')
    }
    setTicketSubmitting(true)

    try {
      const res = await fetch('/register_ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company_id,
          email: ticketEmail.trim(),
          session_id: session_id,
          query: ticketQuery.trim()
        })
      })

      if (res.ok) {
        setTicketSuccess(true)
        
        // Push ticket creation confirmation directly to the chat thread
        setMessages(prev => [
          ...prev, 
          { 
            text: `🎫 Ticket registered successfully! A support agent will review your query: "${ticketQuery.trim()}"`, 
            isUser: false 
          }
        ])

        // Auto-close modal after 2.5 seconds
        setTimeout(() => {
          setTicketModalOpen(false)
        }, 2500)
      } else {
        alert('Ticket registration failed.')
      }
    } catch (err) {
      console.error(err)
      alert('Error connecting to the server.')
    } finally {
      setTicketSubmitting(false)
    }
  }

  return (
    <div className="h-screen flex flex-col justify-between bg-[#050811] relative overflow-hidden font-sans">
      <div className="grid-overlay"></div>

      {/* Top Navigation / Status Cockpit */}
      <header className="z-10 bg-[#0d1426]/80 backdrop-blur-xl border-b border-[#6382b4]/12 py-3.5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4f7cff] to-[#7c3aed] flex items-center justify-center font-bold text-white text-xs select-none">
            ✦
          </div>
          <div>
            <span className="font-['Syne'] text-sm font-bold text-white block tracking-tight">{companyName}</span>
            <span className="text-[10px] text-[#10b981] font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              AI Support Live
            </span>
          </div>
        </div>

        <button
          onClick={handleOpenTicketForm}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6382b4]/28 hover:bg-[#4f7cff]/10 text-[#4f7cff] text-[10px] font-semibold tracking-wider font-mono transition-all cursor-pointer shadow-sm"
        >
          <Ticket size={12} />
          Raise Ticket
        </button>
      </header>

      {/* Dynamic Conversation Bubble List */}
      <main className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-[700px] w-full mx-auto relative z-10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar indicator */}
              <div className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-[10px] font-bold select-none flex-shrink-0 ${
                msg.isUser 
                  ? 'bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] text-white shadow-md' 
                  : 'bg-white/5 border border-[#6382b4]/20 text-[#4f7cff]'
              }`}>
                {msg.isUser ? <User size={12} /> : <Bot size={12} />}
              </div>

              {/* Chat bubble text */}
              <div className={`rounded-2xl px-4 py-3 text-xs md:text-[13px] leading-relaxed shadow-sm font-sans ${
                msg.isUser
                  ? 'bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] text-white rounded-tr-none'
                  : 'bg-[#16213a]/80 border border-[#6382b4]/12 text-[#f0f4fc] rounded-tl-none backdrop-blur-md whitespace-pre-wrap'
              }`}>
                {msg.text}
              </div>

            </div>
          </div>
        ))}

        {/* Real-time typing animation bubble */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-7.5 h-7.5 rounded-full bg-white/5 border border-[#6382b4]/20 flex items-center justify-center text-[#4f7cff] flex-shrink-0 select-none">
                <Bot size={12} />
              </div>
              <div className="bg-[#16213a]/80 border border-[#6382b4]/12 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1 text-[#64748b] text-[13px] font-mono">
                <span className="w-1.5 h-1.5 bg-[#4f7cff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#4f7cff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#4f7cff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input controls layout */}
      <footer className="z-10 bg-[#050811]/90 backdrop-blur-xl border-t border-[#6382b4]/12 py-4 px-6 relative">
        <form onSubmit={handleSendMessage} className="max-w-[700px] mx-auto flex items-center gap-2 relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a support question..."
            rows={1}
            className="w-full bg-[#0d1426]/60 border border-[#6382b4]/12 rounded-xl py-3 pl-4 pr-12 text-xs md:text-[13px] text-[#f0f4fc] placeholder-[#64748b] focus:outline-none focus:border-[#4f7cff] transition-all resize-none shadow-inner"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] text-white hover:opacity-95 shadow-[0_2px_8px_rgba(79,124,255,0.25)] transition-all cursor-pointer"
          >
            <Send size={13} />
          </button>
        </form>
        <p className="text-[10px] text-[#64748b] font-mono text-center mt-2 tracking-wide leading-relaxed">
          ℹ️ Powered by BASS semantic neural search vector chunks database.
        </p>
      </footer>

      {/* Raised Support Ticket Popup Form */}
      {ticketModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget && !ticketSubmitting) setTicketModalOpen(false) }}
          className="fixed inset-0 z-50 bg-[#020306]/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="w-full max-w-[420px] bg-[#16213a]/95 border border-[#6382b4]/28 rounded-2xl p-6 md:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.7)] relative overflow-hidden">
            
            {/* Form layout */}
            {!ticketSuccess ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-['Syne'] text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <div className="w-7 h-7 bg-[#4f7cff]/10 rounded-lg flex items-center justify-center text-[#4f7cff] border border-[#4f7cff]/20">
                      <Ticket size={14} />
                    </div>
                    Raise a Ticket
                  </h3>
                  <button 
                    onClick={() => setTicketModalOpen(false)}
                    disabled={ticketSubmitting}
                    className="p-1 rounded-full hover:bg-white/5 text-[#64748b] hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Your Email</label>
                    <input
                      type="email"
                      required
                      placeholder="you@company.com"
                      value={ticketEmail}
                      onChange={(e) => setTicketEmail(e.target.value)}
                      className="w-full bg-[#0d1426] border border-[#6382b4]/12 rounded-lg py-2 px-3 text-xs text-[#f0f4fc] font-mono focus:outline-none focus:border-[#4f7cff] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-wider uppercase">Your Query</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Describe your issue or question in detail..."
                      value={ticketQuery}
                      onChange={(e) => setTicketQuery(e.target.value)}
                      className="w-full bg-[#0d1426] border border-[#6382b4]/12 rounded-lg py-2 px-3 text-xs text-[#f0f4fc] focus:outline-none focus:border-[#4f7cff] transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ticketSubmitting}
                    className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] text-white text-xs font-semibold rounded-lg shadow-[0_4px_12px_rgba(79,124,255,0.25)] hover:opacity-95 transition-all cursor-pointer font-mono"
                  >
                    {ticketSubmitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-6 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#10b981]/12 border border-[#10b981]/25 text-[#10b981] flex items-center justify-center text-lg shadow-[0_4px_12px_rgba(16,185,129,0.15)] mb-2 animate-bounce">
                  <Check size={20} />
                </div>
                <h3 className="font-['Syne'] text-base font-bold text-white tracking-tight">Ticket Raised!</h3>
                <p className="text-[11px] text-[#64748b] max-w-[240px] mx-auto leading-relaxed">
                  We've received your query and will get back to you shortly. Feedback has been pushed to conversation stream.
                </p>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  )
}
