'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function HomePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((selectedFile: File) => {
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt']
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase()
    if (!validExtensions.includes(ext)) {
      setError('Please upload a PDF, DOCX, or TXT file.')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB.')
      return
    }
    setFile(selectedFile)
    setError(null)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) handleFileSelect(selectedFile)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleAnalyze = async () => {
    if (!file) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/score', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          // Free limit reached - redirect to results with upgrade prompt
          setError(data.message || 'Free scan limit reached. Please upgrade for unlimited access.')
          // Still store the error info
          sessionStorage.setItem('resumeAnalysis', JSON.stringify({ error: data.message, upgradeUrl: data.upgradeUrl }))
          router.push('/results?error=' + encodeURIComponent(data.message))
          return
        }
        throw new Error(data.error || 'Analysis failed. Please try again.')
      }

      // Store results and navigate to results page
      sessionStorage.setItem('resumeAnalysis', JSON.stringify(data))

      // Small delay for smooth transition
      setTimeout(() => {
        router.push('/results')
      }, 300)
    } catch (err: any) {
      console.error('Analysis error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: 'web_user' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Could not start checkout. Please try again.')
      }
    } catch {
      setError('Could not connect to payment system. Please try again later.')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
            AI-Powered Resume Analysis
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI Resume Scorer
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload your resume and get instant, detailed feedback to optimize it for ATS systems and land more interviews.
          </p>
        </motion.div>

        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Upload Your Resume
              </h2>
              <p className="text-gray-600">
                Upload your resume (PDF, DOCX, or TXT) for instant AI-powered analysis.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="space-y-3">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600 hover:text-blue-500">
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </div>
                <p className="text-xs text-gray-500">
                  PDF, DOCX, or TXT (max 10MB)
                </p>
              </div>
            </div>

            {/* Selected File */}
            {file && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <svg className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-blue-700 font-medium truncate">{file.name}</p>
                      <p className="text-blue-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    className="text-blue-400 hover:text-blue-600 ml-3 flex-shrink-0"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing}
              className={`w-full py-3.5 px-6 rounded-lg font-medium text-white transition-all ${
                !file || isAnalyzing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-lg hover:shadow-xl'
              }`}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing Resume...
                </span>
              ) : (
                'Analyze My Resume'
              )}
            </button>

            {/* Pricing hint */}
            <div className="text-center space-y-1">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-green-600">FREE</span> — 1 resume analysis
              </p>
              <button
                onClick={handleUpgrade}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Upgrade: $19 for 30 days unlimited →
              </button>
            </div>
          </div>
        </motion.div>

        {/* Social Proof */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Trusted by 10,000+ professionals to optimize their resumes</p>
          <div className="flex justify-center gap-6 mt-4 text-gray-400">
            <span>📄 PDF Support</span>
            <span>📝 DOCX Support</span>
            <span>🤖 AI Analysis</span>
            <span>🔒 Private & Secure</span>
          </div>
        </div>
      </div>
    </main>
  )
}