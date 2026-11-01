import { useEffect, useRef, useCallback, useMemo } from 'react'
import { parseMarkdown } from '../lib/markdown'
import { highlightCodeBlocks } from '../lib/highlight'
import { renderMermaidDiagrams } from '../lib/mermaid'
import { getDesktop, isDesktop } from '../lib/platform'

interface PreviewPaneProps {
  content: string
  currentFilePath?: string | null
  onNavigate?: (href: string) => void
  onError: (error: unknown) => void
}

export default function PreviewPane({ content, currentFilePath, onNavigate, onError }: PreviewPaneProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const html = useMemo(() => parseMarkdown(content), [content])

  useEffect(() => {
    const container = previewRef.current
    if (!container) return
    highlightCodeBlocks(container)

    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
    let revision = 0
    const render = () => {
      const current = ++revision
      void renderMermaidDiagrams(container, colorScheme.matches, () => current !== revision)
    }
    render()
    colorScheme.addEventListener('change', render)
    return () => {
      revision++
      colorScheme.removeEventListener('change', render)
    }
  }, [html])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('a')
    const href = anchor?.getAttribute('href')
    if (!href) return
    if (href.startsWith('#')) return

    if (/^(https?:|mailto:)/i.test(href)) {
      if (isDesktop) {
        e.preventDefault()
        void getDesktop().then(api => api.openExternal(href)).catch(onError)
      } else {
        anchor?.setAttribute('target', '_blank')
        anchor?.setAttribute('rel', 'noopener noreferrer')
      }
      return
    }

    // Never navigate the privileged desktop webview away from the app.
    e.preventDefault()
    let pathname: string
    try { pathname = decodeURIComponent(href.split(/[?#]/)[0]) } catch { return }
    if (!/\.(md|markdown)$/i.test(pathname)) return
    if (currentFilePath && onNavigate && isDesktop) onNavigate(href)
  }, [currentFilePath, onNavigate, onError])

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
