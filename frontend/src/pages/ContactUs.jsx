import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Mail, Phone, ChevronDown } from 'lucide-react'

export default function ContactUs() {
  const navigate = useNavigate()
  const [openFaqIndex, setOpenFaqIndex] = useState(null)
  const [ssoLoading, setSsoLoading] = useState(false)

  const handleLaunchHelpDesk = async () => {
    setSsoLoading(true)
    const helpDeskCid = '6a109a0b9b460cc67d078468'
    const token = localStorage.getItem('access_token')

    try {
      if (token) {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
          const payload = JSON.parse(payloadJson)

          if (payload.email) {
            const res = await fetch(`/ai/${helpDeskCid}/logined`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ company_id: helpDeskCid, email: payload.email })
            })

            if (res.ok) {
              const data = await res.json()
              // Extract relative path from absolute dynamic redirect url if present
              let dest = data.redirect_url
              if (dest.includes('/ai/')) {
                const relativeIdx = dest.indexOf('/ai/')
                dest = dest.substring(relativeIdx)
              }
              navigate(dest)
              return
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to automatically authenticate with help desk:', e)
    } finally {
      setSsoLoading(false)
    }

    // Fallback if not logged in or SSO handshake fails
    navigate(`/ai/${helpDeskCid}/login`)
  }

  const faqs = [
    {
      q: 'How quickly do you respond to inquiries?',
      a: 'Our support team typically responds within 2 hours during business hours (Mon–Fri, 9am–6pm PST). For critical issues, we offer priority support with even faster response times.'
    },
    {
      q: 'Do you offer enterprise support plans?',
      a: 'Yes! Our enterprise plan includes a dedicated account manager, SLA guarantees, phone support, and custom onboarding. Contact our sales team to learn more.'
    },
    {
      q: 'Can I request a product demo?',
      a: 'Absolutely. Mention you\'d like a demo in your message and our team will schedule a personalized walkthrough within 48 hours.'
    },
    {
      q: 'Where can I find documentation and guides?',
      a: 'Our help center has over 500 articles, video tutorials, and API references. Most answers can be found there instantly without needing to contact us.'
    },
    {
      q: 'How do I report a security vulnerability?',
      a: 'Please email us directly at saraswatnilesh3@gmail.com. Do not disclose vulnerabilities publicly. We take all security reports seriously and will respond within 24 hours with next steps.'
    },
    {
      q: 'Can I become a partner or reseller?',
      a: 'We\'d love to explore partnership opportunities! Send us a message with details about your company and goals. Our partnerships team will reach out within 3 business days.'
    }
  ]

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-12 relative z-10">

      {/* Header */}
      <div className="text-center mb-12">
        <span className="text-[10px] tracking-[0.2em] text-[#4f7cff] font-['IBM_Plex_Mono'] font-bold block mb-2 uppercase">GET IN TOUCH</span>
        <h1 className="font-['Syne'] text-3xl md:text-4xl font-extrabold text-white tracking-tight">Connect with <span className="bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] bg-clip-text text-transparent">Our Team</span></h1>
        <p className="mt-2 text-xs md:text-[13px] text-[#64748b] leading-relaxed max-w-[500px] mx-auto">
          Have questions about the BASS AI platform or need specialized assistance? Choose a support channel below.
        </p>
      </div>

      {/* Grid of options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

        {/* Support Chatbot Card */}
        <div className="glass-card rounded-2xl p-6 border border-[#6382b4]/12 flex flex-col justify-between hover:border-[#6382b4]/28 hover:scale-[1.02] transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#4f7cff]/10 border border-[#4f7cff]/20 flex items-center justify-center mb-4">
              <MessageSquare size={18} className="text-[#4f7cff]" />
            </div>
            <h3 className="font-['Syne'] text-sm font-bold text-white block mb-2">BASS AI Assistant</h3>
            <p className="text-[11px] text-[#64748b] leading-relaxed mb-4">
              Get immediate answers using our specialized Help Desk retrieval model trained on our knowledge bases.
            </p>
          </div>

          <button
            onClick={handleLaunchHelpDesk}
            disabled={ssoLoading}
            className="w-full py-2 bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] text-white text-xs font-semibold rounded-lg shadow-[0_4px_12px_rgba(79,124,255,0.2)] hover:shadow-[0_4px_18px_rgba(79,124,255,0.35)] transition-all cursor-pointer font-mono"
          >
            {ssoLoading ? 'Authenticating...' : 'Launch Help Desk'}
          </button>
        </div>

        {/* Email support */}
        <div className="glass-card rounded-2xl p-6 border border-[#6382b4]/12 flex flex-col justify-between hover:border-[#6382b4]/28 hover:scale-[1.02] transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center mb-4">
              <Mail size={18} className="text-[#7c3aed]" />
            </div>
            <h3 className="font-['Syne'] text-sm font-bold text-white block mb-2">Direct Email</h3>
            <p className="text-[11px] text-[#64748b] leading-relaxed mb-4">
              Prefer writing detailed requests? Drop us an email and our support queue engineers will review your request.
            </p>
          </div>

          <a
            href="mailto:saraswatnilesh3@gmail.com"
            className="w-full py-2 bg-white/5 border border-[#6382b4]/20 hover:bg-[#6382b4]/10 text-white text-xs font-semibold rounded-lg transition-all text-center block no-underline font-mono"
          >
            saraswatnilesh3@gmail.com
          </a>
        </div>

        {/* Sales / Enterprise Phone */}
        <div className="glass-card rounded-2xl p-6 border border-[#6382b4]/12 flex flex-col justify-between hover:border-[#6382b4]/28 hover:scale-[1.02] transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-[#6382b4]/20 flex items-center justify-center mb-4">
              <Phone size={18} className="text-[#94a3b8]" />
            </div>
            <h3 className="font-['Syne'] text-sm font-bold text-white block mb-2">Enterprise Sales</h3>
            <p className="text-[11px] text-[#64748b] leading-relaxed mb-4">
              Talk to our product specialists directly for volume licensing, SLA setups, and custom deployments.
            </p>
          </div>

          <a
            href="tel:+18005550199"
            className="w-full py-2 bg-white/5 border border-[#6382b4]/20 hover:bg-[#6382b4]/10 text-white text-xs font-semibold rounded-lg transition-all text-center block no-underline font-mono"
          >
            +1 (800) 555-0199
          </a>
        </div>

      </div>

      {/* FAQ Accordion */}
      <div className="glass-card rounded-2xl p-6 md:p-8 border border-[#6382b4]/12">
        <div className="text-center mb-8">
          <h2 className="font-['Syne'] text-lg font-bold text-white tracking-tight">Frequently Asked Questions</h2>
          <p className="text-[11px] text-[#64748b] font-mono mt-1 uppercase tracking-wider">Quick answers to common questions before reaching out</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx
            return (
              <div
                key={idx}
                onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                className={`border rounded-xl p-4 cursor-pointer transition-all ${isOpen
                    ? 'bg-[#16213a]/40 border-[#6382b4]/28'
                    : 'bg-white/[0.01] border-[#6382b4]/12 hover:border-[#6382b4]/20'
                  }`}
              >
                <div className="flex justify-between items-center gap-3">
                  <span className="text-xs font-semibold text-white tracking-tight leading-snug">{faq.q}</span>
                  <ChevronDown
                    size={14}
                    className={`text-[#64748b] transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`}
                  />
                </div>
                {isOpen && (
                  <p className="mt-2.5 text-[11px] text-[#64748b] leading-relaxed border-t border-[#6382b4]/8 pt-2.5">
                    {faq.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[10px] text-[#64748b] font-mono mt-12 py-4 border-t border-[#6382b4]/12">
        © 2026 Nova Inc. · <a href="#" className="hover:text-white transition-colors">Terms & Conditions</a> · Built with ❤️ by Team BASS
      </footer>
    </div>
  )
}
