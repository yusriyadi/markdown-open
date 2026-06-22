import { useEffect, useRef } from 'react'
import { parseMarkdown } from '../lib/markdown'
import { highlightCodeBlocks } from '../lib/highlight'

interface PreviewPaneProps {
  content: string
}

export default function PreviewPane({ content }: PreviewPaneProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const html = parseMarkdown(content)

  useEffect(() => {
    if (previewRef.current) {
      highlightCodeBlocks(previewRef.current)
    }
  }, [html])

  return (
    <div className="preview-pane">
      <div
        ref={previewRef}
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
