const fs = require('fs');
const path = require('path');
const { startStaticServer } = require('./static-server.js');

const dist = path.resolve(__dirname, '..', 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  throw new Error('dist/index.html not found. Run npm run build first.');
}
const port = Number(process.env.PORT) || 4173;
startStaticServer(dist, port);
