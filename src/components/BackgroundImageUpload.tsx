import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Image as ImageIcon, Link as LinkIcon, Eye, Trash2, Search, Loader2 } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { uploadTaskImage, isValidImageUrl, deleteTaskImage } from '../lib/storage'
import { BackgroundImageDisplayMode } from '../types/attachment'

interface BackgroundImageUploadProps {
  currentImageUrl: string | null
  displayMode: BackgroundImageDisplayMode
  onSave: (imageUrl: string | null, displayMode: BackgroundImageDisplayMode) => Promise<void>
  userId: string
  taskId: string
  onClose: () => void
}

export function BackgroundImageUpload({
  currentImageUrl,
  displayMode,
  onSave,
  userId,
  taskId,
  onClose,
}: BackgroundImageUploadProps) {
  const { showToast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState(currentImageUrl || '')
  const [urlInput, setUrlInput] = useState('')
  const [selectedMode, setSelectedMode] = useState<BackgroundImageDisplayMode>(displayMode || 'thumbnail')
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'url' | 'search'>('upload')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ image: string, thumbnail: string, title: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (currentImageUrl) {
      setImageUrl(currentImageUrl)
      setPreviewUrl(currentImageUrl)
    } else {
      setImageUrl('')
      setPreviewUrl(null)
    }
    setSelectedMode(displayMode || 'thumbnail')
  }, [currentImageUrl, displayMode])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadTaskImage(file, userId, taskId, true)
      if (result.error) {
        showToast(result.error, 'error', 3000)
      } else {
        setImageUrl(result.url)
        setPreviewUrl(result.url)
        showToast('Resim başarıyla yüklendi', 'success', 2000)
      }
    } catch (err) {
      console.error('Upload error:', err)
      showToast('Resim yüklenemedi', 'error', 3000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      showToast('Lütfen geçerli bir URL girin', 'error', 2000)
      return
    }

    if (!isValidImageUrl(urlInput)) {
      showToast('Geçersiz URL formatı', 'error', 2000)
      return
    }

    setImageUrl(urlInput)
    setPreviewUrl(urlInput)
    setUrlInput('')
    showToast('Resim bağlantısı eklendi', 'success', 2000)
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/api/ai/parse-task?action=image-search&q=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()
      setSearchResults(data.results || [])
      if (data.results?.length === 0) {
        showToast('Resim bulunamadı', 'info', 2000)
      }
    } catch (err) {
      console.error('Search error:', err)
      showToast('Resim arama başarısız oldu', 'error', 3000)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectSearchResult = (image: string) => {
    setImageUrl(image)
    setPreviewUrl(image)
    showToast('Resim seçildi', 'success', 2000)
  }

  const handleRemove = async () => {
    if (currentImageUrl && currentImageUrl.includes('/storage/v1/object/public/')) {
      // Extract storage path from URL
      const urlParts = currentImageUrl.split('/storage/v1/object/public/task-images/')
      if (urlParts.length > 1) {
        const storagePath = urlParts[1]
        await deleteTaskImage(storagePath)
      }
    }
    setImageUrl('')
    setPreviewUrl(null)
    showToast('Arka plan resmi kaldırıldı', 'success', 2000)
  }

  const handleSave = async () => {
    if (!previewUrl) {
      // Remove background image
      await onSave(null, null)
    } else {
      await onSave(imageUrl, selectedMode)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Arka Plan Resmi Ayarla</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-background-tertiary rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-text-tertiary" />
            </button>
          </div>

          {/* Upload Method Selection */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setUploadMethod('upload')}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${uploadMethod === 'upload'
                ? 'bg-primary text-white border-primary'
                : 'bg-background-tertiary border-background-tertiary text-text-secondary hover:border-primary/50'
                }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Dosya Yükle
            </button>
            <button
              onClick={() => setUploadMethod('url')}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${uploadMethod === 'url'
                ? 'bg-primary text-white border-primary'
                : 'bg-background-tertiary border-background-tertiary text-text-secondary hover:border-primary/50'
                }`}
            >
              <LinkIcon className="w-4 h-4 inline mr-2" />
              Bağlantı
            </button>
            <button
              onClick={() => setUploadMethod('search')}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${uploadMethod === 'search'
                ? 'bg-primary text-white border-primary'
                : 'bg-background-tertiary border-background-tertiary text-text-secondary hover:border-primary/50'
                }`}
            >
              <Search className="w-4 h-4 inline mr-2" />
              Ara
            </button>
          </div>

          {/* Upload Method Content */}
          <AnimatePresence mode="wait">
            {uploadMethod === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="background-image-upload"
                />
                <label
                  htmlFor="background-image-upload"
                  className={`
                  flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg
                  cursor-pointer transition-colors
                  ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
                  ${previewUrl ? 'border-primary/50' : 'border-background-tertiary'}
                `}
                >
                  {uploading ? (
                    <>
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                      <span className="text-text-secondary">Yükleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-text-tertiary mb-3" />
                      <span className="text-text-secondary mb-1">Yüklemek için tıklayın veya sürükleyip bırakın</span>
                      <span className="text-xs text-text-tertiary">Maks. 10MB (JPEG, PNG, GIF, WebP)</span>
                    </>
                  )}
                </label>
              </motion.div>
            )}
            {uploadMethod === 'url' && (
              <motion.div
                key="url"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6"
              >
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-4 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleUrlSubmit}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                  >
                    Bağlantı Ekle
                  </button>
                </div>
              </motion.div>
            )}
            {uploadMethod === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 flex flex-col h-64"
              >
                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Resim arayın (örn. doğa, minimalist)"
                    className="flex-1 px-4 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors flex items-center justify-center min-w-[100px] disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ara'}
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto min-h-0 bg-background-tertiary/30 rounded-lg p-2 border border-background-tertiary">
                  {searchResults.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {searchResults.map((result, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSearchResult(result.image)}
                          className="relative aspect-video rounded-md overflow-hidden border-2 border-transparent hover:border-primary focus:outline-none focus:border-primary transition-colors group bg-background-tertiary"
                        >
                          <img
                            src={result.thumbnail}
                            alt={result.title || 'Search result'}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-text-tertiary p-4 text-center">
                      <Search className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">İnternette arka plan resmi ara</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview */}
          {previewUrl && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-text-tertiary" />
                <span className="text-sm text-text-secondary">Önizleme</span>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-background-tertiary">
                <img
                  src={previewUrl}
                  alt="Background preview"
                  className="w-full h-48 object-cover"
                  onError={() => {
                    setPreviewUrl(null)
                    showToast('Resim yüklenemedi', 'error', 2000)
                  }}
                />
                <button
                  onClick={handleRemove}
                  className="absolute top-2 right-2 p-2 bg-danger hover:bg-danger/90 text-white rounded-full transition-colors"
                  aria-label="Remove image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Display Mode Selection */}
          {previewUrl && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Görünüm Stili
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedMode('thumbnail')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${selectedMode === 'thumbnail'
                    ? 'border-primary bg-primary/10'
                    : 'border-background-tertiary hover:border-primary/50'
                    }`}
                >
                  <ImageIcon className="w-6 h-6 mx-auto mb-2 text-text-tertiary" />
                  <span className="text-sm text-text-secondary">Tam Genişlik</span>
                  <span className="text-xs text-text-tertiary block mt-1">Görevin üzerinde</span>
                </button>
                <button
                  onClick={() => setSelectedMode('icon')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${selectedMode === 'icon'
                    ? 'border-primary bg-primary/10'
                    : 'border-background-tertiary hover:border-primary/50'
                    }`}
                >
                  <ImageIcon className="w-6 h-6 mx-auto mb-2 text-text-tertiary" />
                  <span className="text-sm text-text-secondary">İkon</span>
                  <span className="text-xs text-text-tertiary block mt-1">Görevin sağında</span>
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={uploading}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Kaydet
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
