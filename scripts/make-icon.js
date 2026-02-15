const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const src = path.join(__dirname, '..', 'assets', 'icon-source.png');
const outDir = path.join(__dirname, '..', 'build');
const out = path.join(outDir, 'icon.ico');

if (!fs.existsSync(src)) {
  console.error('Missing source PNG: place your logo at assets/icon-source.png');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
pngToIco(src)
  .then(buf => {
    fs.writeFileSync(out, buf);
    console.log('Wrote', out);
  })
  .catch(err => {
    console.error('Failed to create icon:', err);
    process.exit(2);
  });
