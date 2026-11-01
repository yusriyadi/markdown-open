export interface DiagramView {
  zoom: number
  left: number
  top: number
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 5
const ZOOM_STEP = 0.25

export function getDiagramView(output: HTMLElement | null): DiagramView {
  const viewport = output?.querySelector<HTMLElement>('.mermaid-viewport')
  return {
    zoom: Number(output?.dataset.zoom) || 1,
    left: viewport?.scrollLeft || 0,
    top: viewport?.scrollTop || 0,
  }
}

export function createMermaidViewer(svg: string, dark: boolean, view?: DiagramView): HTMLElement {
  const output = document.createElement('div')
  output.className = dark ? 'mermaid-output mermaid-output-dark' : 'mermaid-output'

  const toolbar = document.createElement('div')
  toolbar.className = 'mermaid-toolbar'
  toolbar.setAttribute('role', 'group')
  toolbar.setAttribute('aria-label', 'Mermaid diagram zoom controls')

  const viewport = document.createElement('div')
  viewport.className = 'mermaid-viewport'
  viewport.tabIndex = 0
  viewport.setAttribute('role', 'region')
  viewport.setAttribute('aria-label', 'Mermaid diagram. Scroll to explore; use +, -, or 0 to zoom or fit.')

  const canvas = document.createElement('div')
  canvas.className = 'mermaid-canvas'
  canvas.innerHTML = svg
  const image = canvas.querySelector('svg')
  const width = Number(image?.getAttribute('viewBox')?.trim().split(/[\s,]+/)[2])
  // Mermaid emits a viewBox for its diagrams. Keep a usable fit-width fallback.
  output.style.setProperty('--mermaid-width', width > 0 && Number.isFinite(width) ? `${width}px` : '100%')
  viewport.append(canvas)

  function button(label: string, text: string, action: () => void) {
    const element = document.createElement('button')
    element.type = 'button'
    element.textContent = text
    element.setAttribute('aria-label', label)
    element.title = label
    element.addEventListener('click', action)
    return element
  }

  const zoomOut = button('Zoom out diagram', '−', () => setZoom(zoom - ZOOM_STEP))
  const percentage = document.createElement('output')
  percentage.className = 'mermaid-zoom-value'
  percentage.setAttribute('aria-live', 'polite')
  percentage.title = 'Zoom relative to the fitted diagram size'
  const zoomIn = button('Zoom in diagram', '+', () => setZoom(zoom + ZOOM_STEP))
  const fit = button('Fit diagram', 'Fit', () => setZoom(1, true))
  let zoom = 1

  function setZoom(value: number, reset = false) {
    const previous = zoom
    const centerX = viewport.scrollLeft + viewport.clientWidth / 2
    const centerY = viewport.scrollTop + viewport.clientHeight / 2
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(value) ? value : 1))
    output.dataset.zoom = String(zoom)
    output.style.setProperty('--mermaid-zoom', String(zoom))
    percentage.textContent = `${Math.round(zoom * 100)}%`
    zoomOut.disabled = zoom <= MIN_ZOOM
    zoomIn.disabled = zoom >= MAX_ZOOM
    viewport.scrollLeft = reset ? 0 : Math.max(0, centerX * zoom / previous - viewport.clientWidth / 2)
    viewport.scrollTop = reset ? 0 : Math.max(0, centerY * zoom / previous - viewport.clientHeight / 2)
  }

  viewport.addEventListener('keydown', event => {
    // Leave browser/page zoom shortcuts and interactive SVG links alone.
    if (event.target !== viewport || event.metaKey || event.ctrlKey || event.altKey) return
    if (['+', '=', '-', '0'].includes(event.key)) {
      event.preventDefault()
      if (event.key === '0') setZoom(1, true)
      else setZoom(zoom + (event.key === '-' ? -ZOOM_STEP : ZOOM_STEP))
    }
  })

  toolbar.append(zoomOut, percentage, zoomIn, fit)
  output.append(toolbar, viewport)
  setZoom(view?.zoom ?? 1)
  return output
}

// Restore scroll only after insertion; detached elements have no scrollable area.
export function restoreDiagramScroll(output: HTMLElement, view: DiagramView) {
  const viewport = output.querySelector<HTMLElement>('.mermaid-viewport')!
  viewport.scrollLeft = view.left
  viewport.scrollTop = view.top
}
