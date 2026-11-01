import { expect, it } from 'vitest'
import { parseMarkdown } from './markdown'

it('keeps Mermaid source as escaped text and does not enable raw HTML', () => {
  const html = parseMarkdown('```mermaid\nflowchart LR\nA[<script>alert(1)</script>] --> B\n```\n\n<script>alert(2)</script>')
  expect(html).toContain('class="mermaid-diagram"')
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  expect(html).not.toContain('<script>')
})

it('preserves ordinary code fences, headings, and tables', () => {
  const html = parseMarkdown('# Hello\n\n```typescript\nconst value = 1\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |')
  expect(html).toContain('<h1>Hello</h1>')
  expect(html).toContain('class="language-typescript"')
  expect(html).not.toContain('mermaid-diagram')
  expect(html).toContain('<table>')
})
