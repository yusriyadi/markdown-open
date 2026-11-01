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


it('hides the shared header on downward reading scroll and restores it without reacting to nested scrolling', async () => {
  const main = host.querySelector<HTMLElement>('.main')!
  Object.defineProperties(main, {
    clientHeight: { configurable: true, value: 500 },
    scrollHeight: { configurable: true, value: 2000 },
  })
  await choose('# Long document', 'long.md')
  const shell = host.querySelector<HTMLElement>('.header-shell')!
  const scroll = async (top: number) => {
    main.scrollTop = top
    await act(async () => main.dispatchEvent(new Event('scroll')))
  }

  await scroll(12)
  expect(shell.getAttribute('aria-hidden')).toBe('false')
  await scroll(40)
  expect(shell.getAttribute('aria-hidden')).toBe('true')

  // Layout changes when the header collapses must not look like an upward gesture.
  Object.defineProperty(main, 'clientHeight', { configurable: true, value: 570 })
  await scroll(25)
  expect(shell.getAttribute('aria-hidden')).toBe('true')
  await scroll(3)
  expect(shell.getAttribute('aria-hidden')).toBe('false')

  const nested = host.querySelector<HTMLElement>('.markdown-body')!
  await act(async () => nested.dispatchEvent(new Event('scroll', { bubbles: true })))
  expect(shell.getAttribute('aria-hidden')).toBe('false')

  await scroll(100)
  expect(shell.getAttribute('aria-hidden')).toBe('true')
  await scroll(75)
  expect(shell.getAttribute('aria-hidden')).toBe('false')
  await scroll(110)
  expect(shell.getAttribute('aria-hidden')).toBe('true')
  await act(async () => main.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })))
  expect(shell.getAttribute('aria-hidden')).toBe('false')

  await scroll(150)
  expect(shell.getAttribute('aria-hidden')).toBe('true')
  await choose('# Next document', 'next.md')
  expect(shell.getAttribute('aria-hidden')).toBe('false')
  expect(main.scrollTop).toBe(0)
})
