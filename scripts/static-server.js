const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav'
});

function safePath(rootDir, requestPath) {
  const decoded = decodeURIComponent((requestPath || '/').split('?')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const resolved = path.resolve(rootDir, relative);
  const root = path.resolve(rootDir);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

function startStaticServer(rootDir, port) {
  const root = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    const filePath = safePath(root, req.url);
    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (statError, stat) => {
      if (statError || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }

      res.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Swim Ring Racing: http://127.0.0.1:${port}`);
  });

  return server;
}

module.exports = { MIME, safePath, startStaticServer };
