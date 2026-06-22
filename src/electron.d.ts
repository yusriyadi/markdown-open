interface ElectronAPI {
  onFileOpen: (callback: (filePath: string) => void) => void
  readFile: (filePath: string) => Promise<{ content: string; fileName: string } | { error: string }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
