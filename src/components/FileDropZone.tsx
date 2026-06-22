import { useRef, useState, type DragEvent } from 'react'

interface FileDropZoneProps {
  onFileLoad: (content: string, fileName: string) => void
}

export default function FileDropZone({ onFileLoad }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
      alert('Please drop a Markdown file (.md or .markdown)')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      onFileLoad(content, file.name)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleClick() {
    fileInputRef.current?.click()
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div
      className={`dropzone ${isDragging ? 'dropzone-active' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown"
        onChange={handleInputChange}
        className="dropzone-input"
      />
      <p className="dropzone-icon">📥</p>
      <p className="dropzone-text">
        Drop a <code>.md</code> file here, or click to browse
      </p>
    </div>
  )
}
