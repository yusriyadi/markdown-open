import hljs from 'highlight.js'

export function highlightCodeBlocks(container: HTMLElement): void {
  container.querySelectorAll('pre code').forEach((block) => {
    if (block.closest('.mermaid-source')) return
    hljs.highlightElement(block as HTMLElement)
  })
}
