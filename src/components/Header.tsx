interface HeaderProps {
  fileName: string | null
  onOpenFile: () => void
  onExportPdf: () => void
}

export default function Header({ fileName, onOpenFile, onExportPdf }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="header-title">📝 Markdown Open</h1>
      <div className="header-actions">
        {fileName && <span className="header-filename">{fileName}</span>}
        <button className="btn btn-open" onClick={onOpenFile}>
          📂 Open File
        </button>
        <button className="btn btn-pdf" onClick={onExportPdf} disabled={!fileName}>
          📄 Export PDF
        </button>
      </div>
    </header>
  )
}
