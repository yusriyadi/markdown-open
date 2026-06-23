import { useState, useRef, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import FileDropZone from './components/FileDropZone'
import PreviewPane from './components/PreviewPane'
import { exportToPdf } from './lib/export-pdf'

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
}

export default function App() {
  const [content, setContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
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

  async function handleOpenFolder() {
    const api = window.electronAPI
    if (!api) return
    const folderPath = await api.openFolder()
    if (!folderPath) return

    const tree = await api.scanDirectory(folderPath)
    setFileTree(tree)
    setWorkspacePath(folderPath)
    document.title = `${folderPath.split('/').pop() || folderPath} — Markdown Open`
  }

  async function handleSelectFile(filePath: string) {
    const api = window.electronAPI
    if (!api) return
    const result = await api.readFile(filePath)
    if ('content' in result) {
      handleFileLoad(result.content, result.fileName)
      setActiveFilePath(filePath)
    }
  }

  // Electron: listen for file-open events (Finder "Open With" / double-click)
  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    api.onFileOpen(async (filePath: string) => {
      const result = await api.readFile(filePath)
      if ('content' in result) {
        handleFileLoad(result.content, result.fileName)
        setActiveFilePath(filePath)
      }
    })
  }, [])

  const showSidebar = fileTree.length > 0

  return (
    <div className="app">
      <Header
        fileName={fileName}
        onOpenFile={handleOpenFile}
        onExportPdf={handleExportPdf}
        onOpenFolder={window.electronAPI ? handleOpenFolder : undefined}
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

      <div className="app-body">
        {showSidebar && (
          <Sidebar
            tree={fileTree}
            activePath={activeFilePath}
            onSelectFile={handleSelectFile}
            workspacePath={workspacePath}
          />
        )}
        <main className="main">
          {content ? (
            <PreviewPane
              content={content}
              currentFilePath={activeFilePath}
              onNavigate={handleSelectFile}
            />
          ) : (
            <FileDropZone onFileLoad={handleFileLoad} />
          )}
        </main>
      </div>
    </div>
  )
}
