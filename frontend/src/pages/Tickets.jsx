import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw, Eye, CheckCircle2, Trash2, X, AlertCircle } from 'lucide-react'

export default function Tickets() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Modal States
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState(null)

  const companyId = localStorage.getItem('company_id')
  const accessToken = localStorage.getItem('access_token')

  useEffect(() => {
    if (!accessToken || !companyId) {
      navigate('/')
    } else {
      loadTickets()
    }
  }, [accessToken, companyId, navigate])

  const loadTickets = async () => {
    if (!companyId) return
    setRefreshing(true)
    try {
      const res = await fetch(`/tickets/${companyId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (!res.ok) throw new Error('Failed to fetch tickets')
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.tickets || [])
      setTickets(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Format local date
  const formatDate = (isoStr) => {
    if (!isoStr) return '—'
    try {
      const d = new Date(isoStr)
      if (isNaN(d.getTime())) return isoStr
      return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return isoStr
    }
  }

  const getInitials = (email) => {
    if (!email) return '??'
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  // Statistics calculation
  const totalCount = tickets.length
  const openCount = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length

  // Filtered tickets list
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = !searchQuery || 
      (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.query && t.query.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = !statusFilter || t.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Action: Update status
  const updateStatus = async (ticketId, newStatus) => {
    try {
      const res = await fetch(`/update_ticket/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error('Status update failed')

      setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, status: newStatus } : t))
      
      // If updating selected ticket, update modal content
      if (selectedTicket && selectedTicket.ticket_id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      console.error(err)
      alert('Failed to update ticket status')
    }
  }

  // Trigger delete confirmation modal
  const triggerDeleteConfirm = (ticket) => {
    setTicketToDelete(ticket)
    setDeleteConfirmOpen(true)
  }

  // Action: Delete ticket execute
  const executeDelete = async () => {
    if (!ticketToDelete) return
    try {
      const res = await fetch(`/delete_ticket/${ticketToDelete.ticket_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (!res.ok) throw new Error('Failed to delete ticket')
      setTickets(prev => prev.filter(t => t.ticket_id !== ticketToDelete.ticket_id))
      setDeleteConfirmOpen(false)
      setTicketToDelete(null)
    } catch (err) {
      console.error(err)
      alert('Failed to delete ticket')
    }
  }

  const openTicketDetails = (ticket) => {
    setSelectedTicket(ticket)
    setModalOpen(true)
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-12 relative z-10">
      
      {/* Hero Header */}
      <div className="text-center mb-10">
        <h1 className="font-['Syne'] text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Manage <span className="bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] bg-clip-text text-transparent">Customer Queries</span>
        </h1>
        <p className="font-['IBM_Plex_Mono'] text-xs text-[#64748b] mt-2 tracking-wide">
          Company ID: {companyId || 'Not logged in'}
        </p>
      </div>

      {/* Stats Cockpit */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-9 max-w-[800px] mx-auto">
        {/* Total */}
        <div className="glass-card rounded-2xl p-4 text-center hover:border-[#6382b4]/28 hover:scale-[1.02] transition-all">
          <div className="text-3xl font-extrabold text-white font-['Syne']">{totalCount}</div>
          <div className="text-[10px] text-[#64748b] font-['IBM_Plex_Mono'] mt-1.5 uppercase tracking-wider">Total</div>
        </div>
        {/* Open */}
        <div className="glass-card rounded-2xl p-4 text-center hover:border-[#6382b4]/28 hover:scale-[1.02] transition-all">
          <div className="text-3xl font-extrabold text-[#f59e0b] font-['Syne']">{openCount}</div>
          <div className="text-[10px] text-[#64748b] font-['IBM_Plex_Mono'] mt-1.5 uppercase tracking-wider">Open</div>
        </div>
        {/* In Progress */}
        <div className="glass-card rounded-2xl p-4 text-center hover:border-[#6382b4]/28 hover:scale-[1.02] transition-all">
          <div className="text-3xl font-extrabold text-[#4f7cff] font-['Syne']">{inProgressCount}</div>
          <div className="text-[10px] text-[#64748b] font-['IBM_Plex_Mono'] mt-1.5 uppercase tracking-wider">In Progress</div>
        </div>
        {/* Resolved */}
        <div className="glass-card rounded-2xl p-4 text-center hover:border-[#6382b4]/28 hover:scale-[1.02] transition-all">
          <div className="text-3xl font-extrabold text-[#10b981] font-['Syne']">{resolvedCount}</div>
          <div className="text-[10px] text-[#64748b] font-['IBM_Plex_Mono'] mt-1.5 uppercase tracking-wider">Resolved</div>
        </div>
      </div>

      {/* Toolbar Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748b] pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search by email or query text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1426]/40 border border-[#6382b4]/12 rounded-lg py-2.5 pl-10 pr-4 text-xs text-[#f0f4fc] placeholder-[#64748b] font-['IBM_Plex_Mono'] focus:outline-none focus:border-[#4f7cff] transition-all"
          />
        </div>

        {/* Filter Select */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto bg-[#0d1426]/40 border border-[#6382b4]/12 rounded-lg py-2.5 px-4 text-xs text-[#f0f4fc] font-['IBM_Plex_Mono'] focus:outline-none focus:border-[#4f7cff] cursor-pointer"
        >
          <option value="" className="bg-[#050811]">All Statuses</option>
          <option value="open" className="bg-[#050811]">Open</option>
          <option value="in_progress" className="bg-[#050811]">In Progress</option>
          <option value="resolved" className="bg-[#050811]">Resolved</option>
        </select>

        {/* Refresh button */}
        <button
          onClick={loadTickets}
          disabled={refreshing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#6382b4]/28 hover:bg-[#4f7cff]/10 text-[#4f7cff] font-['IBM_Plex_Mono'] text-xs font-semibold tracking-wide transition-all cursor-pointer"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tickets Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#6382b4]/12 bg-[#0d1426]/60 backdrop-blur-xl">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#050811]/50 border-b border-[#6382b4]/12">
              <th className="py-3.5 px-4 font-['IBM_Plex_Mono'] text-[9px] font-semibold text-[#64748b] text-left tracking-wider uppercase">User</th>
              <th className="py-3.5 px-4 font-['IBM_Plex_Mono'] text-[9px] font-semibold text-[#64748b] text-left tracking-wider uppercase">Email</th>
              <th className="py-3.5 px-4 font-['IBM_Plex_Mono'] text-[9px] font-semibold text-[#64748b] text-left tracking-wider uppercase">Query</th>
              <th className="py-3.5 px-4 font-['IBM_Plex_Mono'] text-[9px] font-semibold text-[#64748b] text-center tracking-wider uppercase">Status</th>
              <th className="py-3.5 px-4 font-['IBM_Plex_Mono'] text-[9px] font-semibold text-[#64748b] text-center tracking-wider uppercase">Actions</th>
              <th className="py-3.5 px-4 font-['IBM_Plex_Mono'] text-[9px] font-semibold text-[#64748b] text-right tracking-wider uppercase">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="py-16 text-center">
                  <div className="inline-flex items-center gap-2 text-xs font-['IBM_Plex_Mono'] text-[#64748b]">
                    <span className="w-4.5 h-4.5 border-2 border-[#6382b4]/12 border-t-[#4f7cff] rounded-full animate-spin" />
                    Loading support tickets...
                  </div>
                </td>
              </tr>
            ) : filteredTickets.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-16 text-center text-xs font-['IBM_Plex_Mono'] text-[#64748b]">
                  No tickets found matching current query filters.
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr key={ticket.ticket_id} className="border-b border-[#6382b4]/12 hover:bg-white/[0.015] transition-colors">
                  {/* User Initial Circle */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center font-bold text-white text-[11px] select-none flex-shrink-0 shadow-[0_2px_8px_rgba(99,102,241,0.2)]">
                        {getInitials(ticket.email)}
                      </div>
                      <span className="text-xs font-semibold text-[#94a3b8] font-mono">
                        {ticket.email ? ticket.email.split('@')[0] : '—'}
                      </span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="py-4 px-4 text-xs font-mono text-[#94a3b8]">
                    {ticket.email || '—'}
                  </td>

                  {/* Query */}
                  <td className="py-4 px-4 text-xs text-[#f0f4fc] max-w-[200px] truncate" title={ticket.query}>
                    {ticket.query || '—'}
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-4 px-4 text-center">
                    <select
                      value={ticket.status}
                      onChange={(e) => updateStatus(ticket.ticket_id, e.target.value)}
                      className={`text-[10px] font-semibold font-['IBM_Plex_Mono'] py-1 px-2.5 rounded-lg border focus:outline-none cursor-pointer uppercase ${
                        ticket.status === 'resolved'
                          ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20'
                          : ticket.status === 'in_progress'
                            ? 'bg-[#4f7cff]/10 text-[#4f7cff] border-[#4f7cff]/20'
                            : 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'
                      }`}
                    >
                      <option value="open" className="bg-[#050811]">Open</option>
                      <option value="in_progress" className="bg-[#050811]">In Progress</option>
                      <option value="resolved" className="bg-[#050811]">Resolved</option>
                    </select>
                  </td>

                  {/* Action buttons */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openTicketDetails(ticket)}
                        className="p-1 rounded bg-white/5 border border-[#6382b4]/12 text-[#94a3b8] hover:text-white hover:border-[#6382b4]/28 hover:scale-105 transition-all cursor-pointer"
                        title="View Details"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={() => updateStatus(ticket.ticket_id, 'resolved')}
                        className="p-1 rounded bg-white/5 border border-[#6382b4]/12 text-[#10b981] hover:bg-[#10b981]/10 hover:border-[#10b981]/20 hover:scale-105 transition-all cursor-pointer"
                        title="Mark Resolved"
                      >
                        <CheckCircle2 size={12} />
                      </button>
                      <button
                        onClick={() => triggerDeleteConfirm(ticket)}
                        className="p-1 rounded bg-white/5 border border-[#6382b4]/12 text-[#ef4444] hover:bg-[#ef4444]/10 hover:border-[#ef4444]/20 hover:scale-105 transition-all cursor-pointer"
                        title="Delete Ticket"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>

                  {/* Created Time */}
                  <td className="py-4 px-4 text-right text-[11px] font-mono text-[#64748b]">
                    {formatDate(ticket.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ticket Details View Modal */}
      {modalOpen && selectedTicket && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
          className="fixed inset-0 z-50 bg-[#020306]/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="w-full max-w-[480px] bg-[#16213a]/95 border border-[#6382b4]/28 rounded-2xl p-6 md:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.7)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-['Syne'] text-lg font-bold text-white tracking-tight">🎫 Ticket Details</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/5 text-[#64748b] hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider mb-1">Ticket ID</div>
                <div className="bg-white/[0.02] border border-[#6382b4]/12 rounded-lg p-2.5 font-mono text-xs text-[#f0f4fc] select-all">
                  {selectedTicket.ticket_id}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider mb-1">Client Email</div>
                <div className="bg-white/[0.02] border border-[#6382b4]/12 rounded-lg p-2.5 font-mono text-xs text-[#f0f4fc]">
                  {selectedTicket.email}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider mb-1">Support Request Query</div>
                <div className="bg-white/[0.02] border border-[#6382b4]/12 rounded-lg p-3 text-xs text-[#f0f4fc] whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.query}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider mb-1">Status</div>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => updateStatus(selectedTicket.ticket_id, e.target.value)}
                    className="w-full bg-[#0d1426] border border-[#6382b4]/12 rounded-lg p-2 text-xs text-[#f0f4fc] font-mono focus:outline-none cursor-pointer uppercase"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider mb-1">Created At</div>
                  <div className="bg-white/[0.02] border border-[#6382b4]/12 rounded-lg p-2.5 text-xs text-[#f0f4fc] font-mono truncate">
                    {formatDate(selectedTicket.created_at)}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(false)}
              className="mt-6 w-full py-2.5 bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] text-white text-xs font-semibold rounded-lg shadow-[0_4px_12px_rgba(79,124,255,0.25)] hover:shadow-[0_4px_18px_rgba(79,124,255,0.35)] transition-all cursor-pointer font-mono"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmOpen && ticketToDelete && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirmOpen(false) }}
          className="fixed inset-0 z-50 bg-[#020306]/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="w-full max-w-[400px] bg-[#16213a]/95 border border-[#ef4444]/28 rounded-2xl p-6 md:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.7)] text-center">
            <div className="w-12 h-12 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center mx-auto mb-4 text-[#ef4444]">
              <AlertCircle size={24} />
            </div>
            
            <h3 className="font-['Syne'] text-base font-bold text-white tracking-tight mb-2">Delete Support Ticket</h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed mb-6 font-mono">
              Are you sure you want to permanently delete the ticket from <span className="text-[#f59e0b] font-semibold">{ticketToDelete.email}</span>? This action cannot be undone.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="py-2.5 bg-white/5 border border-[#6382b4]/12 hover:bg-white/10 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer font-mono"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-[0_4px_12px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_18px_rgba(239,68,68,0.35)] transition-all cursor-pointer font-mono"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
