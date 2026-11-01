import { waitForMermaid } from './mermaid'

export async function exportToPdf(): Promise<void> {
  await waitForMermaid()
  window.print()
}
