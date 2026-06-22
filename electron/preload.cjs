const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Get the initial file path (set before renderer was ready)
  getPendingFilePath: () => ipcRenderer.invoke('get-pending-file'),

  // Listen for file-open events while app is running
  onFileOpen: (callback) => {
    ipcRenderer.on('open-file', (event, filePath) => {
      callback(filePath)
    })
  },

  // Read a file from disk and return content + filename
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
})
