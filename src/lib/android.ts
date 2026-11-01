import { Channel, invoke } from '@tauri-apps/api/core'
import { createFileInbox } from './file-inbox'
import type { NativeBridge, OpenRequest } from './types'

// Kept for the native frontend lifetime, including React StrictMode remounts.
let notifications: Channel<null> | undefined
const inbox = createFileInbox(
  async notify => {
    notifications = new Channel<null>()
    notifications.onmessage = notify
    await invoke('watch_open_files', { onOpen: notifications })
    return () => { notifications = undefined }
  },
  () => invoke<OpenRequest[]>('drain_open_files'),
)

const unsupported = () => Promise.reject(new Error('Use Open File to choose a Markdown document on Android.'))

export const native: NativeBridge = {
  pickDocument: () => invoke('pick_document'),
  readDocument: unsupported,
  pickWorkspace: unsupported,
  scanWorkspace: unsupported,
  resolveDocumentLink: unsupported,
  subscribeToFiles: callback => inbox.subscribe(callback),
  openExternal: url => invoke('open_external', { url }),
  printDocument: () => invoke('print_document'),
}
