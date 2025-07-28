import { useState, useEffect } from 'react'
import { Upload, X, Copy, Loader2, Save, RotateCcw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Trash2, History } from 'lucide-react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Textarea } from './components/ui/textarea'
import { cn } from './lib/utils'
import './App.css'

const DEFAULT_PROMPT = `Analyze these UI screenshots in sequence. For each screenshot, provide:
1. A brief, objective description of what's shown (UI elements, layout, content)
2. The apparent purpose or function of this screen
3. Any notable UI/UX patterns or components used

After analyzing individual screens, provide an overall flow analysis that describes:
- The user journey or workflow represented
- How the screens connect or relate to each other
- The overall purpose of this application or feature set

Be descriptive and objective, focusing on what is visible rather than making subjective judgments about quality.`

function App() {
  const [images, setImages] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [prompt, setPrompt] = useState(() => {
    return localStorage.getItem('analyzerPrompt') || DEFAULT_PROMPT
  })
  const [showPrompt, setShowPrompt] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('analyzerHistory')
    return saved ? JSON.parse(saved) : []
  })
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const [viewingHistory, setViewingHistory] = useState(false)

  useEffect(() => {
    // Load saved API key on mount
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.apiKey) {
          setApiKey(data.apiKey)
        }
      })
      .catch(err => console.error('Failed to load config:', err))
  }, [])

  useEffect(() => {
    // Save history to localStorage whenever it changes
    localStorage.setItem('analyzerHistory', JSON.stringify(history))
  }, [history])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (files) => {
    const newImages = []
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          newImages.push({
            id: Date.now() + i,
            name: files[i].name,
            dataUrl: e.target.result,
            file: files[i]
          })
          if (newImages.length === files.length || newImages.length === Array.from(files).filter(f => f.type.startsWith('image/')).length) {
            setImages(prev => [...prev, ...newImages])
          }
        }
        reader.readAsDataURL(files[i])
      }
    }
  }

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }

  const analyzeScreenshots = async () => {
    if (!apiKey || images.length === 0) return
    
    setAnalyzing(true)
    setResults(null)

    try {
      const messages = images.map((img, index) => ({
        type: "image",
        source: {
          type: "base64",
          media_type: img.file.type,
          data: img.dataUrl.split(',')[1]
        }
      }))

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          images: messages,
          prompt
        })
      })

      const data = await response.json()
      setResults(data)
      
      // Save to history
      if (!data.error) {
        const submission = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          images: images.map(img => ({
            name: img.name,
            dataUrl: img.dataUrl
          })),
          prompt: prompt,
          analysis: data.analysis
        }
        
        setHistory(prev => [submission, ...prev].slice(0, 50)) // Keep last 50 submissions
        setCurrentHistoryIndex(0)
        setViewingHistory(false)
      }
    } catch (error) {
      console.error('Error analyzing screenshots:', error)
      setResults({ error: 'Failed to analyze screenshots. Please check your API key and try again.' })
    } finally {
      setAnalyzing(false)
    }
  }

  const copyToClipboard = () => {
    if (results && results.analysis) {
      navigator.clipboard.writeText(results.analysis)
    }
  }

  const savePrompt = () => {
    localStorage.setItem('analyzerPrompt', prompt)
    setSaveStatus('Prompt saved!')
    setTimeout(() => setSaveStatus(''), 2000)
  }

  const resetPrompt = () => {
    setPrompt(DEFAULT_PROMPT)
    localStorage.setItem('analyzerPrompt', DEFAULT_PROMPT)
    setSaveStatus('Prompt reset to default!')
    setTimeout(() => setSaveStatus(''), 2000)
  }

  const saveApiKey = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey })
      })
      
      if (response.ok) {
        setSaveStatus('API key saved!')
        setTimeout(() => setSaveStatus(''), 2000)
      } else {
        setSaveStatus('Failed to save API key')
        setTimeout(() => setSaveStatus(''), 2000)
      }
    } catch (error) {
      console.error('Error saving API key:', error)
      setSaveStatus('Error saving API key')
      setTimeout(() => setSaveStatus(''), 2000)
    }
  }

  const loadFromHistory = (index) => {
    if (history[index]) {
      const submission = history[index]
      setImages(submission.images.map((img, i) => ({
        ...img,
        id: Date.now() + i,
        file: { type: 'image/png' } // Placeholder since we can't restore the actual file
      })))
      setPrompt(submission.prompt)
      setResults({ analysis: submission.analysis })
      setCurrentHistoryIndex(index)
      setViewingHistory(true)
    }
  }

  const navigateHistory = (direction) => {
    const newIndex = currentHistoryIndex + direction
    if (newIndex >= 0 && newIndex < history.length) {
      loadFromHistory(newIndex)
    }
  }

  const deleteFromHistory = (id) => {
    setHistory(prev => prev.filter(item => item.id !== id))
    if (viewingHistory && history[currentHistoryIndex]?.id === id) {
      setCurrentHistoryIndex(-1)
      setViewingHistory(false)
      setResults(null)
      setImages([])
    }
  }

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      setHistory([])
      setCurrentHistoryIndex(-1)
      setViewingHistory(false)
      setSaveStatus('History cleared!')
      setTimeout(() => setSaveStatus(''), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Screen Flow Analyzer</CardTitle>
            <CardDescription>
              Upload screenshots to get AI-powered UI/UX flow descriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Claude API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Claude API key"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={saveApiKey}
                    variant="outline"
                    size="default"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">
                    Analysis Prompt
                  </label>
                  <Button
                    onClick={() => setShowPrompt(!showPrompt)}
                    variant="ghost"
                    size="sm"
                  >
                    {showPrompt ? (
                      <><ChevronUp className="h-4 w-4 mr-1" /> Hide</>
                    ) : (
                      <><ChevronDown className="h-4 w-4 mr-1" /> Show</>
                    )}
                  </Button>
                </div>
                
                {showPrompt && (
                  <div className="space-y-2">
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                      placeholder="Enter your analysis prompt..."
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={savePrompt}
                        variant="outline"
                        size="sm"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Prompt
                      </Button>
                      <Button
                        onClick={resetPrompt}
                        variant="outline"
                        size="sm"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Default
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {saveStatus && (
                <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                  {saveStatus}
                </div>
              )}

              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300",
                  !viewingHistory && "cursor-pointer hover:border-gray-400",
                  images.length > 0 && "border-solid bg-gray-50",
                  viewingHistory && "opacity-50 cursor-not-allowed"
                )}
                onDragEnter={!viewingHistory ? handleDrag : undefined}
                onDragLeave={!viewingHistory ? handleDrag : undefined}
                onDragOver={!viewingHistory ? handleDrag : undefined}
                onDrop={!viewingHistory ? handleDrop : undefined}
                onClick={() => !viewingHistory && document.getElementById('file-upload').click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleChange}
                  className="hidden"
                />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">
                  Drag and drop screenshots here, or click to select
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Supports multiple images (PNG, JPG, etc.)
                </p>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                  {images.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.dataUrl}
                        alt={image.name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      {!viewingHistory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeImage(image.id)
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <p className="mt-1 text-xs text-gray-600 truncate">
                        {image.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                {viewingHistory && (
                  <Button
                    onClick={() => {
                      setViewingHistory(false)
                      setCurrentHistoryIndex(-1)
                      setImages([])
                      setResults(null)
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    New Analysis
                  </Button>
                )}
                <Button
                  onClick={analyzeScreenshots}
                  disabled={!apiKey || images.length === 0 || analyzing || viewingHistory}
                  className="flex-1"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing screenshots...
                    </>
                  ) : (
                    'Analyze Screenshots'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {history.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  History ({history.length})
                </CardTitle>
                <Button
                  onClick={clearHistory}
                  variant="outline"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {viewingHistory && currentHistoryIndex >= 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    Viewing submission from {new Date(history[currentHistoryIndex].timestamp).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigateHistory(-1)}
                      disabled={currentHistoryIndex === 0}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm py-1 px-2">
                      {currentHistoryIndex + 1} / {history.length}
                    </span>
                    <Button
                      onClick={() => navigateHistory(1)}
                      disabled={currentHistoryIndex === history.length - 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors",
                      viewingHistory && currentHistoryIndex === index && "border-blue-500 bg-blue-50"
                    )}
                    onClick={() => loadFromHistory(index)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {item.images.length} screenshot{item.images.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteFromHistory(item.id)
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {results && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Analysis Results</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {results.error ? (
                <p className="text-red-600">{results.error}</p>
              ) : (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded-lg text-sm">
                    {results.analysis}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App
