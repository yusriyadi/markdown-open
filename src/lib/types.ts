export interface DocumentData {
  path: string | null
  fileName: string
  content: string
}

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
}

export type OpenRequest =
  | { type: 'document'; path: string }
  | { type: 'documentData'; document: DocumentData }
  | { type: 'error'; message: string }

export interface NativeBridge {
  pickDocument(): Promise<DocumentData | null>
  readDocument(path: string): Promise<DocumentData>
  pickWorkspace(): Promise<string | null>
  scanWorkspace(path: string): Promise<{ nodes: FileTreeNode[]; warnings: string[] }>
  resolveDocumentLink(current: string, href: string): Promise<string>
  subscribeToFiles(callback: (request: OpenRequest) => void): () => void
  openExternal(url: string): Promise<void>
  printDocument(): Promise<void>
}
