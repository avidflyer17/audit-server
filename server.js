const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');

const auditsDir = path.join(__dirname, 'audits');
const archivesDir = path.join(auditsDir, 'archives');
const scriptPath = path.join(__dirname, 'generate-audit-json.sh');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
};

function send(res, status, body, headers = {}) {
  if (typeof body === 'object' && body !== null && !Buffer.isBuffer(body)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    body = JSON.stringify(body);
  }
  if (!res.headersSent) res.writeHead(status, headers);
  if (res.req && res.req.method === 'HEAD') return res.end();
  if (body === undefined) return res.end();
  res.end(body);
}

async function ensureDirs() {
  await fsp.mkdir(auditsDir, { recursive: true });
  await fsp.mkdir(archivesDir, { recursive: true });
}

function serveFileStream(req, res, filePath, ext) {
  const type = MIME[ext] || 'application/octet-stream';
  const isIndexJson = filePath.endsWith(path.join('archives', 'index.json'));
  const headers = {
    'Content-Type': type,
    'Cache-Control': isIndexJson ? 'no-store' : 'public, max-age=31536000, immutable'
  };
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, { error: 'not found' });
    headers['Content-Length'] = st.size;
    if (req.method === 'HEAD') return send(res, 200, null, headers);
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

function serveStatic(req, res) {
  let p = url.parse(req.url).pathname || '/';
  if (p === '/') p = '/index.html';
  const rel = path.normalize(p).replace(/^\/+/, '');
  const filePath = path.join(auditsDir, rel);
  if (!filePath.startsWith(auditsDir)) return send(res, 403, { error: 'forbidden' });
  const ext = path.extname(filePath).toLowerCase();
  serveFileStream(req, res, filePath, ext);
}

async function updateIndex(res, headers = {}) {
  try {
    const files = await fsp.readdir(archivesDir);
    const audits = (files || [])
      .filter(f => /^audit_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/.test(f))
      .sort()
      .reverse();
    await fsp.writeFile(path.join(archivesDir, 'index.json'), JSON.stringify(audits, null, 2));
    send(res, 200, { ok: true }, headers);
  } catch {
    send(res, 500, { error: 'index update failed' }, headers);
  }
}

function handleApi(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'GET' && pathname === '/healthz') {
    return send(res, 200, { ok: true }, { ...corsHeaders, 'Cache-Control': 'no-store' });
  }

  if (req.method === 'GET' && pathname === '/api/reports') {
    const p = path.join(archivesDir, 'index.json');
    fs.readFile(p, (err, data) => {
      if (err) return send(res, 500, { error: 'index error' }, corsHeaders);
      send(res, 200, data, {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      });
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/reports') {
    try {
      const child = spawn(scriptPath, [], {
        env: { ...process.env, BASE_DIR: auditsDir },
        stdio: 'ignore',
        detached: true
      });
      child.on('error', () => send(res, 500, { error: 'script spawn error' }, corsHeaders));
      child.unref();
      return send(res, 202, { status: 'accepted' }, corsHeaders);
    } catch {
      return send(res, 500, { error: 'script spawn error' }, corsHeaders);
    }
  }

  if (req.method === 'DELETE' && pathname.startsWith('/api/reports/')) {
    const file = path.basename(pathname.replace('/api/reports/', ''));
    if (!/^audit_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/.test(file))
      return send(res, 400, { error: 'bad name' }, corsHeaders);
    const p = path.join(archivesDir, file);
    if (!p.startsWith(archivesDir)) return send(res, 400, { error: 'bad path' }, corsHeaders);
    fs.unlink(p, err => {
      if (err) return send(res, 404, { error: 'not found' }, corsHeaders);
      updateIndex(res, corsHeaders);
    });
    return;
  }

  if (req.method === 'OPTIONS') {
    return send(res, 204, '', corsHeaders);
  }

  return send(res, 404, { error: 'not found' }, corsHeaders);
}

const server = http.createServer((req, res) => {
  res.req = req;
  try {
    if (req.url.startsWith('/api/')) return handleApi(req, res);
    return serveStatic(req, res);
  } catch {
    return send(res, 500, { error: 'server error' });
  }
});

const PORT = process.env.PORT || 8080;
ensureDirs().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Audit server listening on ${PORT}`);
  });
});

