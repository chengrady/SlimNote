const path = require('path');
const { downloadArtifact } = require('@electron/get');

async function downloadElectron() {
  const version = '28.3.3';
  console.log('Downloading Electron', version, 'from GitHub...');
  
  try {
    const zipPath = await downloadArtifact({
      version: version,
      platform: 'win32',
      arch: 'x64',
      artifactName: 'electron',
      mirrorOptions: {
        mirror: 'https://github.com/electron/electron/releases/download/v'
      }
    });
    
    console.log('Downloaded to:', zipPath);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

downloadElectron();
