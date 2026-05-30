const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../../galaxy-temp-backend/shared');
const destDir = path.resolve(__dirname, '../shared');

function sync() {
  console.log(`Syncing shared package:\n  From: ${srcDir}\n  To:   ${destDir}`);

  if (!fs.existsSync(srcDir)) {
    console.error(`Source directory "${srcDir}" does not exist.`);
    process.exit(1);
  }

  // Ensure destination directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const itemsToCopy = ['package.json', 'tsconfig.json', '.gitignore', 'src', 'dist'];

  for (const item of itemsToCopy) {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);

    if (fs.existsSync(srcPath)) {
      const stats = fs.statSync(srcPath);
      if (stats.isDirectory()) {
        // Clean target directory first to avoid stale files
        if (fs.existsSync(destPath)) {
          fs.rmSync(destPath, { recursive: true, force: true });
        }
        fs.mkdirSync(destPath, { recursive: true });
        fs.cpSync(srcPath, destPath, { recursive: true, force: true });
      } else {
        fs.cpSync(srcPath, destPath, { force: true });
      }
      console.log(`  Synced: ${item}`);
    } else {
      console.log(`  Skipped (not found in source): ${item}`);
    }
  }

  console.log('Shared package sync complete!');
}

sync();
