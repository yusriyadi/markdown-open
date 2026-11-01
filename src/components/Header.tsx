interface HeaderProps {
  fileName: string | null
  onOpenFile: () => void
  onExportPdf: () => void
  exporting?: boolean
  onOpenFolder?: () => void
}

export default function Header({ fileName, onOpenFile, onExportPdf, onOpenFolder, exporting }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="header-title">📝 Markdown Open</h1>
      <div className="header-actions">
        {fileName && <span className="header-filename">{fileName}</span>}
        {onOpenFolder && (
          <button className="btn btn-folder" onClick={onOpenFolder}>
            📂 Open Folder
          </button>
        )}
        <button className="btn btn-open" onClick={onOpenFile}>
          📄 Open File
        </button>
        <button className="btn btn-pdf" onClick={onExportPdf} disabled={!fileName || exporting}>
          {exporting ? 'Preparing PDF…' : '📄 Export PDF'}
        </button>
      </div>
    </header>
  )
}
