import { useState, useRef, useEffect, useCallback } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import FileDropZone from './components/FileDropZone'
import PreviewPane from './components/PreviewPane'
import { exportToPdf } from './lib/export-pdf'
import { errorMessage, getDesktop, isDesktop } from './lib/platform'
import { LatestTask } from './lib/latest-task'
import type { DocumentData, FileTreeNode } from './lib/types'

export default function App() {
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const documentTask = useRef(new LatestTask())
  const workspaceTask = useRef(new LatestTask())
  const reportError = useCallback((error: unknown) => setError(errorMessage(error)), [])

  const loadDocument = useCallback((operation: () => Promise<DocumentData | null>) => {
    setError(null)
    return documentTask.current.run(operation, setDocument, reportError)
  }, [reportError])

  const handleSelectFile = useCallback((path: string) => {
    void loadDocument(async () => (await getDesktop()).readDocument(path))
  }, [loadDocument])

  function handleOpenFile() {
    if (isDesktop) void loadDocument(async () => (await getDesktop()).pickDocument())
    else fileInputRef.current?.click()
  }

  function handleBrowserFile(file: File) {
    void loadDocument(async () => {
      if (!/\.(md|markdown)$/i.test(file.name)) throw new Error('Choose a Markdown file (.md or .markdown).')
      return { content: await file.text(), fileName: file.name, path: null }
    })
  }

  const handleExportPdf = useCallback(async () => {
    setExporting(true)
    setError(null)
    try { await exportToPdf() } catch (error) { reportError(error) }
    finally { setExporting(false) }
  }, [reportError])

  useEffect(() => {
    const handlePrint = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p' && document !== null) {
        event.preventDefault()
        if (!exporting) void handleExportPdf()
      }
    }
    window.addEventListener('keydown', handlePrint)
    return () => window.removeEventListener('keydown', handlePrint)
  }, [document, exporting, handleExportPdf])

  function handleOpenFolder() {
    setError(null)
    void workspaceTask.current.run(async () => {
      const api = await getDesktop()
      const path = await api.pickWorkspace()
      if (path === null) return null
      return { path, ...await api.scanWorkspace(path) }
    }, result => {
      setFileTree(result.nodes)
      setWorkspacePath(result.path)
      if (result.warnings.length) setError(`Some folders could not be read: ${result.warnings.join('; ')}`)
    }, reportError)
  }

  useEffect(() => {
    if (!isDesktop) return
    let disposed = false
    let unsubscribe: (() => void) | undefined
    void getDesktop().then(api => {
      if (disposed) return
      unsubscribe = api.subscribeToFiles(request => {
        if (request.type === 'document') handleSelectFile(request.path)
        else reportError(request.message)
      })
    }).catch(reportError)
    return () => { disposed = true; unsubscribe?.() }
  }, [handleSelectFile, reportError])

  useEffect(() => {
    window.document.title = document ? `${document.fileName} — Markdown Open` : 'Markdown Open'
  }, [document])

  return (
    <div className="app">
      <Header
        fileName={document?.fileName ?? null}
        onOpenFile={handleOpenFile}
        onExportPdf={handleExportPdf}
        exporting={exporting}
        onOpenFolder={isDesktop ? handleOpenFolder : undefined}
      />
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss message">×</button>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept=".md,.markdown" style={{ display: 'none' }}
        onChange={event => {
          const file = event.target.files?.[0]
          if (file) handleBrowserFile(file)
          event.target.value = ''
        }} />
      <div className="app-body">
        {workspacePath !== null && (
          <Sidebar tree={fileTree} activePath={document?.path ?? null}
            onSelectFile={handleSelectFile} workspacePath={workspacePath} />
        )}
        <main className="main">
          {document !== null ? (
            <PreviewPane content={document.content} currentFilePath={document.path}
              onNavigate={href => {
                const current = document.path
                if (!current) return
                void loadDocument(async () => {
                  const api = await getDesktop()
                  const path = await api.resolveDocumentLink(current, href)
                  return api.readDocument(path)
                })
              }} onError={reportError} />
          ) : (
            <FileDropZone onOpenFile={handleOpenFile} onFileDrop={handleBrowserFile} />
          )}
        </main>
      </div>
    </div>
  )
}
