import { useState, useEffect } from 'react'
import { Upload, X, Copy, Loader2, Save, RotateCcw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Trash2, History, FileText, Plus, GripVertical, Tag, Folder } from 'lucide-react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Textarea } from './components/ui/textarea'
import { cn } from './lib/utils'
import { PROMPT_TEMPLATES, DEFAULT_PROMPT } from './promptTemplates'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableImage } from './components/SortableImage'
import './App.css'


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
  const [savedPrompts, setSavedPrompts] = useState(() => {
    const saved = localStorage.getItem('savedPrompts')
    return saved ? JSON.parse(saved) : []
  })
  const [showPromptLibrary, setShowPromptLibrary] = useState(false)
  const [currentProject, setCurrentProject] = useState('')
  const [currentTags, setCurrentTags] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  useEffect(() => {
    // Save custom prompts
    localStorage.setItem('savedPrompts', JSON.stringify(savedPrompts))
  }, [savedPrompts])

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

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
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
          analysis: data.analysis,
          project: currentProject,
          tags: currentTags
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
      setCurrentProject(submission.project || '')
      setCurrentTags(submission.tags || [])
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

  const saveCurrentPrompt = () => {
    const name = window.prompt('Enter a name for this prompt:')
    if (name) {
      const newPrompt = {
        id: Date.now(),
        name,
        prompt: prompt,
        createdAt: new Date().toISOString()
      }
      setSavedPrompts(prev => [...prev, newPrompt])
      setSaveStatus('Prompt saved to library!')
      setTimeout(() => setSaveStatus(''), 2000)
    }
  }

  const loadPromptTemplate = (template) => {
    setPrompt(template.prompt)
    setShowPromptLibrary(false)
    setSaveStatus(`Loaded "${template.name}" template`)
    setTimeout(() => setSaveStatus(''), 2000)
  }

  const deleteCustomPrompt = (id) => {
    setSavedPrompts(prev => prev.filter(p => p.id !== id))
  }

  const addTag = (tag) => {
    if (tag && !currentTags.includes(tag)) {
      setCurrentTags(prev => [...prev, tag])
    }
  }

  const removeTag = (tag) => {
    setCurrentTags(prev => prev.filter(t => t !== tag))
  }

  const getAllProjects = () => {
    const projects = new Set()
    history.forEach(item => {
      if (item.project) projects.add(item.project)
    })
    return Array.from(projects)
  }

  const getAllTags = () => {
    const tags = new Set()
    history.forEach(item => {
      if (item.tags) item.tags.forEach(tag => tags.add(tag))
    })
    return Array.from(tags)
  }

  const filteredHistory = history.filter(item => {
    const matchesSearch = !searchQuery || 
      item.analysis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.project?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesProject = !filterProject || item.project === filterProject
    
    return matchesSearch && matchesProject
  })

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Project
                  </label>
                  <input
                    type="text"
                    value={currentProject}
                    onChange={(e) => setCurrentProject(e.target.value)}
                    placeholder="Enter project name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={viewingHistory}
                  />
                  {getAllProjects().length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {getAllProjects().map(project => (
                        <button
                          key={project}
                          onClick={() => setCurrentProject(project)}
                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          {project}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add tags..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={viewingHistory}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(e.target.value)
                          e.target.value = ''
                        }
                      }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {currentTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                      >
                        {tag}
                        {!viewingHistory && (
                          <button
                            onClick={() => removeTag(tag)}
                            className="hover:text-blue-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
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
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowPromptLibrary(!showPromptLibrary)}
                      variant="ghost"
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Library
                    </Button>
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
                </div>
                
                {showPromptLibrary && (
                  <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Prompt Templates</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {PROMPT_TEMPLATES.map(template => (
                        <div
                          key={template.id}
                          className="p-3 border rounded-lg hover:bg-white cursor-pointer transition-colors"
                          onClick={() => loadPromptTemplate(template)}
                        >
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-gray-500">{template.description}</div>
                        </div>
                      ))}
                      
                      {savedPrompts.length > 0 && (
                        <>
                          <div className="text-xs text-gray-500 font-medium mt-4 mb-2">Custom Prompts</div>
                          {savedPrompts.map(customPrompt => (
                            <div
                              key={customPrompt.id}
                              className="p-3 border rounded-lg hover:bg-white cursor-pointer transition-colors flex justify-between items-start"
                            >
                              <div
                                className="flex-1"
                                onClick={() => loadPromptTemplate(customPrompt)}
                              >
                                <div className="font-medium text-sm">{customPrompt.name}</div>
                                <div className="text-xs text-gray-500">
                                  Created {new Date(customPrompt.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteCustomPrompt(customPrompt.id)
                                }}
                                variant="ghost"
                                size="sm"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
                
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
                        Save Changes
                      </Button>
                      <Button
                        onClick={saveCurrentPrompt}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Save to Library
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
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">
                      {images.length} screenshot{images.length !== 1 ? 's' : ''} • Drag to reorder
                    </p>
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={images.map(img => img.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((image, index) => (
                          <SortableImage
                            key={image.id}
                            image={image}
                            index={index}
                            onRemove={removeImage}
                            disabled={viewingHistory}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
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
                      setCurrentProject('')
                      setCurrentTags([])
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
                  History ({filteredHistory.length} of {history.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowFilters(!showFilters)}
                    variant="outline"
                    size="sm"
                  >
                    {showFilters ? 'Hide' : 'Show'} Filters
                  </Button>
                  <Button
                    onClick={clearHistory}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showFilters && (
                <div className="mb-4 space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <input
                      type="text"
                      placeholder="Search analyses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Project:</label>
                    <select
                      value={filterProject}
                      onChange={(e) => setFilterProject(e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All Projects</option>
                      {getAllProjects().map(project => (
                        <option key={project} value={project}>{project}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
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
                {filteredHistory.map((item, index) => {
                  const actualIndex = history.findIndex(h => h.id === item.id)
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors",
                        viewingHistory && currentHistoryIndex === actualIndex && "border-blue-500 bg-blue-50"
                      )}
                      onClick={() => loadFromHistory(actualIndex)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-sm">
                            {item.images.length} screenshot{item.images.length !== 1 ? 's' : ''}
                          </div>
                          {item.project && (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                              <Folder className="inline h-3 w-3 mr-1" />
                              {item.project}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {item.tags.map(tag => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                <Tag className="inline h-3 w-3 mr-0.5" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
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
                  )
                })}
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
