const electron = require('electron');
console.log('electron type:', typeof electron);
console.log('electron keys:', Object.keys(electron || {}).slice(0, 10));
console.log('has app property:', 'app' in (electron || {}));
