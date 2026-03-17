const { execSync } = require('child_process');
const fs = require('fs');

const appPath = 'C:\Program Files\SlimNote\SlimNote.exe';

// Try to get version info
try {
  const output = execSync(`"${appPath}" --version`, { encoding: 'utf-8' });
  console.log('Version from --version:', output.trim());
} catch (e) {
  console.log('Error getting version:', e.message);
}

// Check file properties
const stats = fs.statSync(appPath);
console.log('File size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
console.log('Modified:', stats.mtime);

// Check package.json in asar
try {
  const asar = require('asar');
  const pkg = JSON.parse(asar.extractFile('app.asar', 'package.json'));
  console.log('Electron version in package.json:', pkg.devDependencies?.electron || pkg.dependencies?.electron || 'Not found');
} catch (e) {
  console.log('Cannot read asar:', e.message);
}
