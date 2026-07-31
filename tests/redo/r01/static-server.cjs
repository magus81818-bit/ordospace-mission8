const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');
const host = '127.0.0.1';
const port = 4176;
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(String(urlPath || '/').split('?')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const resolved = path.resolve(root, relative);
  return resolved.startsWith(root + path.sep) || resolved === path.join(root, 'index.html')
    ? resolved
    : null;
}

const server = http.createServer((req, res) => {
  const filePath = safePath(req.url);
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  process.stdout.write(`ORDOSPACE audit server: http://${host}:${port}/\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
