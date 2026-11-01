import { useState } from 'react'
import { isDesktop } from '../lib/platform'

interface FileDropZoneProps {
  onOpenFile: () => void
  onFileDrop: (file: File) => void
}

export default function FileDropZone({ onOpenFile, onFileDrop }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  return (
    <div className={`dropzone ${isDragging ? 'dropzone-active' : ''}`}
      role="button" tabIndex={0} onClick={onOpenFile}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenFile() } }}
      onDrop={event => {
        event.preventDefault()
        setIsDragging(false)
        // Desktop drops are received and authorized by Rust, including when a
        // document is already open. Browser mode uses the regular File API.
        if (!isDesktop && event.dataTransfer.files[0]) onFileDrop(event.dataTransfer.files[0])
      }}
      onDragOver={event => { event.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}>
      <p className="dropzone-icon">📥</p>
      <p className="dropzone-text">Drop a <code>.md</code> file here, or click to browse</p>
    </div>
  )
}
