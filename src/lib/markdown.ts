import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
})

const defaultFence = md.renderer.rules.fence!
md.renderer.rules.fence = (tokens, index, options, env, renderer) => {
  const token = tokens[index]
  if (token.info.trim().split(/\s+/)[0].toLowerCase() === 'mermaid') {
    return `<div class="mermaid-diagram"><pre class="mermaid-source"><code>${md.utils.escapeHtml(token.content)}</code></pre></div>\n`
  }
  return defaultFence(tokens, index, options, env, renderer)
}

export function parseMarkdown(content: string): string {
  return md.render(content)
}
