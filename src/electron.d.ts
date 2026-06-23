interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
}

interface ElectronAPI {
  onFileOpen: (callback: (filePath: string) => void) => void
  readFile: (filePath: string) => Promise<{ content: string; fileName: string } | { error: string }>
  openFolder: () => Promise<string | null>
  scanDirectory: (dirPath: string) => Promise<FileTreeNode[]>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
