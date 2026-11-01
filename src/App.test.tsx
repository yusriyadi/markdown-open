// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { File } from 'node:buffer'
import { afterEach, beforeEach, expect, it } from 'vitest'
import App from './App'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(async () => {
  // Browser mode must not require any Tauri globals or IPC mocks.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(<App />))
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

async function choose(content: string, name: string) {
  const input = host.querySelector<HTMLInputElement>('input[type=file]')!
  Object.defineProperty(input, 'files', { configurable: true, value: [new File([content], name)] })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

it('opens browser files without Tauri and preserves empty documents and errors', async () => {
  expect(host.textContent).not.toContain('Open Folder')
  expect(host.querySelector<HTMLButtonElement>('.btn-pdf')?.disabled).toBe(true)
  await choose('# Browser document\n\nRead locally.', 'browser.md')
  expect(host.querySelector('.markdown-body h1')?.textContent).toBe('Browser document')
  expect(document.title).toBe('browser.md — Markdown Open')
  expect(host.querySelector<HTMLButtonElement>('.btn-pdf')?.disabled).toBe(false)
  await choose('', 'empty.md')
  expect(host.querySelector('.markdown-body')).not.toBeNull()
  expect(host.querySelector('.dropzone')).toBeNull()
  expect(host.querySelector('.header-filename')?.textContent).toBe('empty.md')
  await choose('not markdown', 'invalid.txt')
  expect(host.querySelector('[role=alert]')?.textContent).toContain('Choose a Markdown file')
  expect(host.querySelector('.header-filename')?.textContent).toBe('empty.md')
})
