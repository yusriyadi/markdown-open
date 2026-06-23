import { useEffect, useRef, useCallback } from 'react'
import { parseMarkdown } from '../lib/markdown'
import { highlightCodeBlocks } from '../lib/highlight'

interface PreviewPaneProps {
  content: string
  currentFilePath?: string | null
  onNavigate?: (filePath: string) => void
}

export default function PreviewPane({ content, currentFilePath, onNavigate }: PreviewPaneProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const html = parseMarkdown(content)

  useEffect(() => {
    if (previewRef.current) {
      highlightCodeBlocks(previewRef.current)
    }
  }, [html])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const anchor = target.closest('a')
    if (!anchor) return

    const href = anchor.getAttribute('href')
    if (!href) return

    // Only handle local .md links (not http/https/mailto/anchors)
    if (/^(https?:|mailto:|#)/.test(href)) return

    // Check if it's a markdown file link
    if (!/\.(md|markdown)$/i.test(href.split('?')[0].split('#')[0])) return

    e.preventDefault()

    if (currentFilePath && onNavigate && window.electronAPI) {
      // Resolve relative path against current file's directory
      const dir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'))
      const resolved = dir + '/' + href.replace(/^\.\//, '')
      onNavigate(resolved)
    }
  }, [currentFilePath, onNavigate])

  return (
    <div className="preview-pane">
      <div
        ref={previewRef}
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handleClick}
      />
    </div>
  )
}
