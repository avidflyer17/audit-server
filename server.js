const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');

const auditsDir = path.join(__dirname, 'audits');
const archivesDir = path.join(auditsDir, 'archives');
const scriptPath = path.join(__dirname, 'generate-audit-json.sh');

function send(res, status, body, type = 'text/plain') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function serveStatic(req, res) {
  let p = url.parse(req.url).pathname;
  if (p === '/') p = '/index.html';
  const filePath = path.join(auditsDir, path.normalize(p).replace(/^\/+/, ''));
  if (!filePath.startsWith(auditsDir)) return send(res, 403, 'Forbidden');
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    const ext = path.extname(filePath).toLowerCase();
    const type = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.ico': 'image/x-icon'
    }[ext] || 'text/plain; charset=utf-8';
    send(res, 200, data, type);
  });
}

function updateIndex(res) {
  fs.readdir(archivesDir, (err, files) => {
    if (err) return send(res, 500, 'read err');
    const audits = files
      .filter(f => /^audit_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/.test(f))
      .sort()
      .reverse();
    fs.writeFile(
      path.join(archivesDir, 'index.json'),
      JSON.stringify(audits, null, 2),
      wErr => {
        if (wErr) return send(res, 500, 'write err');
        send(res, 200, JSON.stringify({ ok: true }), 'application/json');
      }
    );
  });
}

function handleApi(req, res) {
  const parsed = url.parse(req.url);
  if (req.method === 'GET' && parsed.pathname === '/api/reports') {
    fs.readFile(path.join(archivesDir, 'index.json'), (err, data) => {
      if (err) return send(res, 500, 'index error');
      send(res, 200, data, 'application/json');
    });
    return;
  }
  if (req.method === 'POST' && parsed.pathname === '/api/reports') {
    const child = spawn(scriptPath, [], {
      env: { ...process.env, BASE_DIR: auditsDir }
    });
    child.on('exit', code => {
      if (code === 0) send(res, 200, JSON.stringify({ ok: true }), 'application/json');
      else send(res, 500, 'script error');
    });
    return;
  }
  if (req.method === 'DELETE' && parsed.pathname.startsWith('/api/reports/')) {
    const file = path.basename(parsed.pathname.replace('/api/reports/', ''));
    if (!/^audit_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/.test(file))
      return send(res, 400, 'bad name');
    fs.unlink(path.join(archivesDir, file), err => {
      if (err) return send(res, 404, 'not found');
      updateIndex(res);
    });
    return;
  }
  send(res, 404, 'Not found');
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handleApi(req, res);
  serveStatic(req, res);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Audit server listening on ${PORT}`);
});

