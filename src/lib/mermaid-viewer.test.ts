// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { createMermaidViewer, getDiagramView, restoreDiagramScroll } from './mermaid-viewer'

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><text>Diagram</text></svg>'
const control = (viewer: HTMLElement, label: string) => viewer.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
const percentage = (viewer: HTMLElement) => viewer.querySelector('output')!.textContent

afterEach(() => document.body.replaceChildren())

it('zooms each diagram independently and disables controls at safe limits', () => {
  const first = createMermaidViewer(svg, false)
  const second = createMermaidViewer(svg, false)
  document.body.append(first, second)
  expect(percentage(first)).toBe('100%')
  control(first, 'Zoom in diagram').click()
  expect(percentage(first)).toBe('125%')
  expect(percentage(second)).toBe('100%')
  for (let i = 0; i < 20; i++) control(first, 'Zoom in diagram').click()
  expect(percentage(first)).toBe('500%')
  expect(control(first, 'Zoom in diagram').disabled).toBe(true)
  for (let i = 0; i < 20; i++) control(first, 'Zoom out diagram').click()
  expect(percentage(first)).toBe('50%')
  expect(control(first, 'Zoom out diagram').disabled).toBe(true)
})

it('restores zoom and scroll after a theme re-render, and Fit resets both axes', () => {
  const first = createMermaidViewer(svg, false, { zoom: 2, left: 0, top: 0 })
  document.body.append(first)
  const viewport = first.querySelector<HTMLElement>('[role=region]')!
  viewport.scrollLeft = 240
  viewport.scrollTop = 160
  const state = getDiagramView(first)
  const dark = createMermaidViewer(svg, true, state)
  first.replaceWith(dark)
  restoreDiagramScroll(dark, state)
  expect(getDiagramView(dark)).toEqual({ zoom: 2, left: 240, top: 160 })
  expect(percentage(dark)).toBe('200%')
  control(dark, 'Fit diagram').click()
  expect(getDiagramView(dark)).toEqual({ zoom: 1, left: 0, top: 0 })
  expect(percentage(dark)).toBe('100%')
})

it('supports focused keyboard zoom without intercepting page zoom or SVG link input', () => {
  const viewer = createMermaidViewer(svg, false)
  document.body.append(viewer)
  const viewport = viewer.querySelector<HTMLElement>('[role=region]')!
  expect(viewport.tabIndex).toBe(0)
  viewport.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true, cancelable: true }))
  expect(percentage(viewer)).toBe('125%')
  const pageZoom = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true })
  viewport.dispatchEvent(pageZoom)
  expect(pageZoom.defaultPrevented).toBe(false)
  expect(percentage(viewer)).toBe('125%')
  viewer.querySelector('svg')!.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }))
  expect(percentage(viewer)).toBe('125%')
  viewport.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }))
  expect(percentage(viewer)).toBe('100%')
})
