const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for file-open events while app is running
  onFileOpen: (callback) => {
    ipcRenderer.on('open-file', (event, filePath) => {
      callback(filePath)
    })
  },

  // Read a file from disk and return content + filename
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  // Open native folder picker dialog
  openFolder: () => ipcRenderer.invoke('open-folder-dialog'),

  // Scan directory recursively for .md files
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
})
