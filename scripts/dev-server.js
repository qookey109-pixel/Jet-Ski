const path = require('path');
const { startStaticServer } = require('./static-server.js');

const port = Number(process.env.PORT) || 5173;
startStaticServer(path.resolve(__dirname, '..'), port);
