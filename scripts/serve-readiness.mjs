import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'reports/readiness');
const port = Number(process.env.READINESS_PORT ?? 4178);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.log': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};
http
  .createServer((req, res) => {
    let relative;
    try {
      relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = path.resolve(root, `.${relative === '/' ? '/latest/index.html' : relative}`);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('Report not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, '127.0.0.1', () =>
    console.log(`Parish Pass readiness: http://127.0.0.1:${port} (local only)`),
  );
