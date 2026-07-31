const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..', '..');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if (pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
  const target = path.resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`);
  if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, {'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(target).pipe(res);
}).listen(4180,'127.0.0.1');
