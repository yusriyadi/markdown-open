import { waitForMermaid } from './mermaid'
import { getDesktop, isDesktop } from './platform'

export async function exportToPdf(): Promise<void> {
  await waitForMermaid()
  await document.fonts.ready
  if (isDesktop) await (await getDesktop()).printDocument()
  else window.print()
}
