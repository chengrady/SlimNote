import electron from 'electron'

console.log('Electron module:', electron)
const app = electron.default?.app || electron.app
console.log('App:', app)
