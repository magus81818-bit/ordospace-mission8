const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');
const host = '127.0.0.1';
const port = 4179;
const types = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp'
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(String(urlPath || '/').split('?')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const resolved = path.resolve(root, relative);
  return resolved === path.join(root, 'index.html') || resolved.startsWith(root + path.sep) ? resolved : null;
}

const server = http.createServer((req, res) => {
  if (String(req.url || '').split('?')[0] === '/favicon.ico') {
    res.writeHead(204, { 'cache-control': 'no-store' });
    res.end();
    return;
  }
  const file = safePath(req.url);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'cache-control': 'no-store', 'content-type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, host, () => process.stdout.write(`ORDOSPACE Round 4 audit server: http://${host}:${port}/\n`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));

