import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, Trash2, Library, CheckCircle2, MessageSquare, AlertCircle, ArrowUpRight } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(true)

  // Drag and Drop States
  const [dragActive, setDragActive] = useState(false)

  // Upload Progress States
  const [uploading, setUploading] = useState(false)
  const [uploadFilename, setUploadFilename] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [activeStep, setActiveStep] = useState('upload') // upload, extract, chunk, embed

  const companyId = localStorage.getItem('company_id')
  const accessToken = localStorage.getItem('access_token')

  // Redirect if not logged in
  useEffect(() => {
    if (!accessToken || !companyId) {
      navigate('/')
    } else {
      loadPreviousPDFs()
    }
  }, [accessToken, companyId, navigate])

  const loadPreviousPDFs = async () => {
    try {
      const res = await fetch(`/get-pdfs?company_id=${companyId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (!res.ok) throw new Error('Failed to fetch PDFs')
      const data = await res.json()
      setPdfs(data.pdfs || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Drag and drop listeners
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed ❌')
      return
    }
    uploadFile(file)
  }

  const uploadFile = async (file) => {
    setUploading(true)
    setUploadFilename(file.name)
    setProgressPct(0)
    setActiveStep('upload')

    // Simulate pipeline step visual progress since embedding is async/sync hybrid
    const uploadTimer = setTimeout(() => { setProgressPct(25); setActiveStep('extract') }, 600)
    const extractTimer = setTimeout(() => { setProgressPct(55); setActiveStep('chunk') }, 1400)
    const chunkTimer = setTimeout(() => { setProgressPct(80); setActiveStep('embed') }, 2200)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('company_id', companyId)

    try {
      const res = await fetch('/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.detail || 'Upload failed')

      clearTimeout(uploadTimer)
      clearTimeout(extractTimer)
      clearTimeout(chunkTimer)

      setProgressPct(100)
      setActiveStep('done')
      
      // Keep visible for a second before closing progress drawer
      setTimeout(() => {
        setUploading(false)
        loadPreviousPDFs()
      }, 1000)

    } catch (err) {
      clearTimeout(uploadTimer)
      clearTimeout(extractTimer)
      clearTimeout(chunkTimer)
      
      console.error(err)
      alert(err.message || 'Error occurred uploading the PDF')
      setUploading(false)
    }
  }

  const deletePDF = async (pdfId, filename) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return

    try {
      const res = await fetch('/delete-pdf', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ company_id: companyId, pdf_id: pdfId })
      })

      if (res.ok) {
        loadPreviousPDFs()
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.detail || 'Delete failed ❌')
      }
    } catch (err) {
      console.error(err)
      alert('Server error during delete ❌')
    }
  }

  const handleChatbotRedirect = () => {
    if (!companyId) return alert('No company ID found. Please login again.')
    navigate(`/ai/${companyId}/login`)
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 md:px-6 py-12 relative z-10">
      {/* Bot Shortcut Row */}
      <div className="mb-6 flex justify-start">
        <button
          onClick={handleChatbotRedirect}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#6382b4]/28 hover:bg-[#4f7cff]/10 text-[#4f7cff] font-['IBM_Plex_Mono'] text-xs tracking-wide transition-all cursor-pointer"
        >
          <MessageSquare size={14} />
          Launch Support Bot Window
          <ArrowUpRight size={12} className="opacity-60" />
        </button>
      </div>

      {/* Header */}
      <div className="mb-9">
        <span className="text-[10px] tracking-[0.15em] text-[#64748b] font-['IBM_Plex_Mono'] block mb-2 uppercase">KNOWLEDGE BASE / UPLOAD</span>
        <h1 className="font-['Syne'] text-3xl font-extrabold text-[#f0f4fc] tracking-tight leading-tight">PDF Documents</h1>
        <p className="mt-2 text-xs md:text-[13px] text-[#64748b] leading-relaxed">
          PDFs are dynamically parsed, split into ~500-word segments, and vectorized for semantic AI search retrieval. Raw files are never stored — only clean text chunks and embeddings.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        id="drop-area"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileElem').click()}
        className={`w-full border border-dashed rounded-2xl py-12 px-6 flex flex-col items-center justify-center gap-4 cursor-pointer backdrop-blur-xl transition-all relative overflow-hidden ${
          dragActive 
            ? 'border-[#4f7cff] bg-[#16213a]/80 shadow-[0_0_20px_rgba(79,124,255,0.15)]' 
            : 'border-[#6382b4]/28 bg-[#0d1426]/60 hover:border-[#4f7cff] hover:bg-[#16213a]/50'
        }`}
      >
        <input 
          id="fileElem" 
          type="file" 
          accept=".pdf" 
          onChange={handleFileInput}
          className="hidden" 
        />
        
        {/* Glow ambient inside dropzone */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(79,124,255,0.04),transparent_60%)] pointer-events-none" />

        <div className="w-12 h-12 border border-[#6382b4]/28 rounded-xl bg-[#050811]/60 flex items-center justify-center transition-colors">
          <FileUp size={22} className="text-[#64748b]" />
        </div>
        
        <div className="text-center">
          <span className="font-['Syne'] text-sm font-semibold text-white block">Drop a PDF here</span>
          <span className="text-[10px] text-[#64748b] font-['IBM_Plex_Mono'] mt-1 block">or click to browse — PDF only</span>
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); document.getElementById('fileElem').click() }}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] text-white font-['IBM_Plex_Mono'] text-[10px] font-semibold tracking-wider hover:opacity-95 shadow-[0_4px_10px_rgba(79,124,255,0.25)] transition-all cursor-pointer"
        >
          Choose file
        </button>
      </div>

      {/* Progress Box */}
      {uploading && (
        <div className="mt-5 bg-[#0d1426]/60 border border-[#6382b4]/20 rounded-xl p-4 flex flex-col gap-2.5 backdrop-blur-xl">
          <div className="flex justify-between items-center text-xs">
            <span className="font-['Syne'] font-semibold text-[#f0f4fc] truncate max-w-[80%]">{uploadFilename}</span>
            <span className="font-['IBM_Plex_Mono'] text-[#64748b]">{progressPct}%</span>
          </div>

          {/* Progress bar track */}
          <div className="w-full h-1 bg-white/5 rounded-sm overflow-hidden">
            <div 
              style={{ width: `${progressPct}%` }}
              className="h-full bg-gradient-to-r from-[#4f7cff] to-[#7c3aed] rounded-sm transition-all duration-300"
            />
          </div>

          {/* Progress Steps Indicators */}
          <div className="flex gap-4 mt-1">
            {[
              { id: 'upload', label: 'Uploading' },
              { id: 'extract', label: 'Extracting' },
              { id: 'chunk', label: 'Chunking' },
              { id: 'embed', label: 'Embedding' }
            ].map((step, idx) => {
              const stepIndex = ['upload', 'extract', 'chunk', 'embed', 'done'].indexOf(activeStep)
              const isDone = idx < stepIndex
              const isActive = activeStep === step.id

              return (
                <div 
                  key={step.id} 
                  className={`flex items-center gap-1.5 font-['IBM_Plex_Mono'] text-[10px] ${
                    isDone 
                      ? 'text-[#10b981]' 
                      : isActive 
                        ? 'text-[#4f7cff]' 
                        : 'text-[#64748b]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'animate-pulse' : ''}`} style={{ backgroundColor: 'currentColor' }} />
                  {step.label}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 my-8">
        <div className="flex-1 h-[1px] bg-[#6382b4]/12" />
        <span className="text-[10px] font-['IBM_Plex_Mono'] font-medium text-[#64748b] tracking-widest uppercase">INDEXED DOCUMENTS</span>
        <div className="flex-1 h-[1px] bg-[#6382b4]/12" />
      </div>

      {/* PDF List Table */}
      <div className="overflow-x-auto rounded-xl border border-[#6382b4]/12 bg-[#0d1426]/60 backdrop-blur-xl">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#050811]/40 border-b border-[#6382b4]/12">
              <th className="py-3 px-4 font-['IBM_Plex_Mono'] text-[9px] font-semibold text-[#64748b] text-left tracking-wider uppercase">Name</th>
              <th className="py-3 px-4 font-['IBM_Plex_Mono'] text-[9px] font-semibold text-[#64748b] text-right tracking-wider uppercase">Size</th>
              <th className="py-3 px-4 font-['IBM_Plex_Mono'] text-[9px] font-semibold text-[#64748b] text-center tracking-wider uppercase">Chunks</th>
              <th className="py-3 px-4 font-['IBM_Plex_Mono'] text-[9px] font-semibold text-[#64748b] text-center tracking-wider uppercase">Status</th>
              <th className="py-3 px-4 font-['IBM_Plex_Mono'] text-[9px] font-semibold text-[#64748b] text-right tracking-wider uppercase">Delete</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="py-12 text-center text-xs font-['IBM_Plex_Mono'] text-[#64748b]">
                  Loading knowledge files...
                </td>
              </tr>
            ) : pdfs.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-12 text-center">
                  <div className="text-xs text-[#64748b] font-['IBM_Plex_Mono'] leading-relaxed">
                    No documents indexed yet.<br />Drag a PDF file above to get started.
                  </div>
                </td>
              </tr>
            ) : (
              pdfs.map((pdf) => (
                <tr key={pdf.id} className="border-b border-[#6382b4]/12 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 text-xs font-medium text-[#f0f4fc] max-w-[240px] truncate" title={pdf.filename}>
                    {pdf.filename}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-['IBM_Plex_Mono'] text-[#64748b] text-right">
                    {(pdf.size / 1024).toFixed(2)} KB
                  </td>
                  <td className="py-3.5 px-4 text-xs font-['IBM_Plex_Mono'] text-[#64748b] text-center">
                    {pdf.chunk_count ?? '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span 
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold font-['IBM_Plex_Mono'] uppercase tracking-wider ${
                        pdf.status === 'processed'
                          ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20'
                          : 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20'
                      }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-current" />
                      {pdf.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => deletePDF(pdf.id, pdf.filename)}
                      className="p-1.5 rounded-md text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all cursor-pointer"
                      title={`Delete ${pdf.filename}`}
                    >
                      <Trash2 size={13.5} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
