import { waitForMermaid } from './mermaid'
import { getNative, isNative } from './platform'

export async function exportToPdf(): Promise<void> {
  await waitForMermaid()
  await document.fonts.ready
  if (isNative) await (await getNative()).printDocument()
  else window.print()
}
