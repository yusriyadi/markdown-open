import { useState, useRef } from 'react'
import Header from './components/Header'
import FileDropZone from './components/FileDropZone'
import PreviewPane from './components/PreviewPane'
import { exportToPdf } from './lib/export-pdf'

export default function App() {
  const [content, setContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileLoad(content: string, fileName: string) {
    setContent(content)
    setFileName(fileName)
  }

  function handleOpenFile() {
    fileInputRef.current?.click()
  }

  function handleExportPdf() {
    exportToPdf()
  }

  return (
    <div className="app">
      <Header
        fileName={fileName}
        onOpenFile={handleOpenFile}
        onExportPdf={handleExportPdf}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              handleFileLoad(ev.target?.result as string, file.name)
            }
            reader.readAsText(file)
          }
        }}
      />

      <main className="main">
        {content ? (
          <PreviewPane content={content} />
        ) : (
          <FileDropZone onFileLoad={handleFileLoad} />
        )}
      </main>
    </div>
  )
}
