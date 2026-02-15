const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const dest = path.join(__dirname, '..', 'sql-wasm.wasm');

try {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('Copied sql-wasm.wasm to project root');
  } else {
    console.warn('sql-wasm.wasm not found in node_modules; please run npm install first or copy manually.');
  }
} catch (e) {
  console.error('Failed to copy sql-wasm.wasm:', e.message);
}
