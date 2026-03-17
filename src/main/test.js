console.log('Testing electron require...')
try {
  const electron = require('electron')
  console.log('Electron module type:', typeof electron)
  console.log('Electron keys:', Object.keys(electron || {}))
  console.log('app exists:', electron && typeof electron.app !== 'undefined')
} catch (err) {
  console.error('Error requiring electron:', err)
}
