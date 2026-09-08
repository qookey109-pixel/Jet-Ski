const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const entries = ['index.html', 'styles.css', 'src', 'THIRD_PARTY_NOTICES.md'];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const entry of entries) {
  const from = path.join(root, entry);
  if (!fs.existsSync(from)) throw new Error(`Missing build input: ${entry}`);
  const to = path.join(dist, entry);
  fs.cpSync(from, to, { recursive: true });
}

const jsFiles = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) walk(file);
    else if (file.endsWith('.js')) jsFiles.push(file);
  }
}
walk(path.join(dist, 'src'));

console.log(`Production build ready: dist/ (${jsFiles.length} JS runtime files)`);
