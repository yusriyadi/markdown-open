let pendingRender: Promise<void> = Promise.resolve()
let diagramId = 0

// Serialize initialization and rendering so theme/file changes cannot overlap.
export function renderMermaidDiagrams(
  container: HTMLElement,
  dark: boolean,
  isCancelled: () => boolean,
): Promise<void> {
  const diagrams = Array.from(container.querySelectorAll<HTMLElement>('.mermaid-diagram'))
  if (diagrams.length === 0) return pendingRender

  const render = async () => {
    if (isCancelled()) return
    try {
      const { default: mermaid } = await import('mermaid')
      if (isCancelled()) return
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: dark ? 'dark' : 'default',
        suppressErrorRendering: true,
      })

      for (const diagram of diagrams) {
        if (isCancelled()) return
        const source = diagram.querySelector<HTMLElement>('.mermaid-source')!
        const code = source.textContent || ''
        try {
          const { svg } = await mermaid.render(`mermaid-${++diagramId}`, code)
          if (isCancelled()) return
          const output = document.createElement('div')
          output.className = dark ? 'mermaid-output mermaid-output-dark' : 'mermaid-output'
          output.innerHTML = svg
          diagram.querySelector('.mermaid-output')?.remove()
          diagram.querySelector('.mermaid-error')?.remove()
          diagram.append(output)
          source.hidden = true
        } catch {
          if (isCancelled()) return
          showError(diagram, source)
        }
      }
    } catch {
      if (isCancelled()) return
      for (const diagram of diagrams) {
        showError(diagram, diagram.querySelector<HTMLElement>('.mermaid-source')!)
      }
    }
  }

  pendingRender = pendingRender.then(render)
  return pendingRender
}

function showError(diagram: HTMLElement, source: HTMLElement) {
  diagram.querySelector('.mermaid-output')?.remove()
  diagram.querySelector('.mermaid-error')?.remove()
  const message = document.createElement('p')
  message.className = 'mermaid-error'
  message.setAttribute('role', 'status')
  message.textContent = 'Unable to render Mermaid diagram. Original code is shown below.'
  diagram.prepend(message)
  source.hidden = false
}

export async function waitForMermaid(): Promise<void> {
  // A new file or theme may enqueue another render while we are waiting.
  let current: Promise<void>
  do {
    current = pendingRender
    await current
  } while (current !== pendingRender)
}
