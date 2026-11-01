import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { createFileInbox } from './file-inbox'
import type { NativeBridge, OpenRequest } from './types'

const inbox = createFileInbox(
  async notify => listen('documents-available', notify),
  () => invoke<OpenRequest[]>('drain_open_files'),
)

export const native: NativeBridge = {
  pickDocument: () => invoke('pick_document'),
  readDocument: path => invoke('read_document', { path }),
  pickWorkspace: () => invoke('pick_workspace'),
  scanWorkspace: path => invoke('scan_workspace', { path }),
  resolveDocumentLink: (current, href) => invoke('resolve_document_link', { current, href }),
  subscribeToFiles: callback => inbox.subscribe(callback),
  openExternal: url => invoke('open_external', { url }),
  printDocument: () => invoke('print_document'),
}
