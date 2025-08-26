#!/usr/bin/env node
import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import net from 'net';

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe","pipe","ignore"] }).trim();
  } catch {
    return null;
  }
}

function networkInterfaces() {
  const nets = os.networkInterfaces();
  const ipv4 = new Set();
  const ipv6 = new Set();
  for (const name of Object.keys(nets)) {
    for (const info of nets[name] || []) {
      if (info.internal) continue;
      if (info.family === 'IPv4') ipv4.add(info.address);
      if (info.family === 'IPv6') ipv6.add(info.address);
    }
  }
  return { ipv4: Array.from(ipv4), ipv6: Array.from(ipv6) };
}

function ipToInt(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function ipInSubnet(ip, cidr) {
  const [range, maskStr] = cidr.split('/');
  const mask = Number(maskStr);
  if (net.isIPv4(ip) && net.isIPv4(range)) {
    const ipInt = ipToInt(ip);
    const rangeInt = ipToInt(range);
    const maskInt = mask === 0 ? 0 : ~((1 << (32 - mask)) - 1) >>> 0;
    return (ipInt & maskInt) === (rangeInt & maskInt);
  }
  // IPv6 not handled
  return false;
}

function privateIp(ip) {
  const privateCidrs = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
  return privateCidrs.some(c => ipInSubnet(ip, c));
}

function getDockerSubnets() {
  const ids = run('docker network ls -q');
  if (!ids) return ['172.17.0.0/16', '172.18.0.0/16'];
  const subnets = new Set();
  ids.split(/\s+/).filter(Boolean).forEach(id => {
    const subnet = run(`docker network inspect ${id} -f '{{range .IPAM.Config}}{{.Subnet}} {{end}}'`);
    if (subnet) {
      subnet.split(/\s+/).filter(Boolean).forEach(s => subnets.add(s));
    }
  });
  if (subnets.size === 0) {
    subnets.add('172.17.0.0/16');
    subnets.add('172.18.0.0/16');
  }
  return Array.from(subnets);
}

function classifyScope(ip, dockerSubnets) {
  if (ip === '0.0.0.0' || ip === '::' || ip === '*') return 'Public';
  if (ip === '127.0.0.1' || ip === '::1') return 'Localhost';
  if (dockerSubnets.some(s => ipInSubnet(ip, s))) return 'Docker';
  if (privateIp(ip)) return 'System';
  return 'Public';
}

function serviceName(port, proto) {
  const res = run(`getent services ${port}/${proto}`);
  if (!res) return 'unknown';
  return res.split(/\s/)[0] || 'unknown';
}

function serviceCategory(name) {
  const n = name.toLowerCase();
  if (['ssh', 'telnet', 'ftp', 'rdp', 'vnc', 'docker'].includes(n)) return 'admin';
  if (['http', 'https'].includes(n)) return 'web';
  if (['mysql', 'postgresql', 'mongodb', 'redis'].includes(n)) return 'db';
  if (['smb', 'nfs'].includes(n)) return 'fileshare';
  if (['dns', 'rpcbind'].includes(n)) return 'infra';
  return 'unknown';
}

function parseSsLine(line, privileged) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const proto = parts[0];
  const state = parts[1];
  const local = parts[4];
  const idx = local.lastIndexOf(':');
  if (idx === -1) return null;
  let addr = local.slice(0, idx);
  let port = local.slice(idx + 1);
  if (addr.startsWith('[') && addr.endsWith(']')) addr = addr.slice(1, -1);
  if (addr === '*' && proto === 'tcp6') addr = '::';
  if (addr === '*') addr = '0.0.0.0';
  if (!/^\d+$/.test(port)) return null;
  let process = null;
  let pid = null;
  if (privileged) {
    const m = line.match(/users:\(\("([^"]+)",pid=(\d+),fd=\d+\)\)/);
    if (m) {
      process = m[1];
      pid = Number(m[2]);
    }
  }
  const ipVer = addr.includes(':') ? 'ipv6' : 'ipv4';
  return { proto, state, addr, port: Number(port), pid, process, ipVer };
}

function computeRisk(scopes, service, port) {
  let level = 'low';
  const reasons = [];
  const criticalServices = new Set(['ssh','telnet','ftp','rdp','vnc','smb','rpcbind','docker','mysql','postgresql','mongodb','redis','http']);
  if (scopes.includes('Public')) {
    if (service === 'unknown' || criticalServices.has(service) || (service === 'http' && port === 80) || (port === 8080 && service === 'unknown')) {
      level = 'critical';
      reasons.push(service === 'unknown' ? 'Unknown service exposed publicly' : `${service} exposed publicly`);
    } else {
      level = 'warn';
      reasons.push('Publicly exposed service');
    }
  } else if (scopes.every(s => s === 'Localhost')) {
    level = 'local';
    reasons.push('Only bound to localhost');
  } else {
    level = 'low';
    reasons.push('Not publicly exposed');
  }
  return { level, reasons };
}

const dockerSubnets = getDockerSubnets();
let ssCmd = 'ss -tulpenH';
let ssOutput = run(ssCmd);
let privileged = true;
if (!ssOutput || !ssOutput.includes("users:(")) {
  ssCmd = 'ss -tulnH';
  ssOutput = run(ssCmd) || '';
  privileged = false;
}

const lines = ssOutput.split('\n').filter(Boolean);
const map = new Map();
for (const line of lines) {
  const info = parseSsLine(line, privileged);
  if (!info) continue;
  const { proto, state, addr, port, pid, process, ipVer } = info;
  const scope = classifyScope(addr, dockerSubnets);
  const key = `${proto}:${port}`;
  const service = serviceName(port, proto);
  const binding = {
    local_address: addr,
    iface: null,
    scope,
    pid: privileged ? pid : null,
    process: privileged ? process : null,
    user: null,
    container: null,
    source: 'ss',
    state,
    notes: ''
  };
  let agg = map.get(key);
  if (!agg) {
    agg = {
      proto,
      port,
      ip_versions: new Set(),
      services: new Set(),
      scopes: new Set(),
      bindings: [],
      risk: null,
      counts: {}
    };
    map.set(key, agg);
  }
  agg.ip_versions.add(ipVer);
  agg.services.add(service);
  agg.scopes.add(scope);
  agg.bindings.push(binding);
}

const entries = [];
for (const agg of map.values()) {
  const services = Array.from(agg.services);
  const scopes = Array.from(agg.scopes);
  const ipVersions = Array.from(agg.ip_versions);
  const risk = computeRisk(scopes, services[0] || 'unknown', agg.port);
  const counts = {
    bindings: agg.bindings.length,
    public_bindings: agg.bindings.filter(b => b.scope === 'Public').length,
    processes: new Set(agg.bindings.map(b => b.pid).filter(Boolean)).size
  };
  entries.push({
    proto: agg.proto,
    port: agg.port,
    ip_versions: ipVersions,
    services,
    scopes,
    bindings: agg.bindings,
    risk,
    counts,
    copy_hints: {
      summary: `${agg.proto}/${agg.port} - ${services.join(', ')}`,
      mitigation: `ufw deny ${agg.port}/${agg.proto}`
    }
  });
}

const order = { critical: 0, warn: 1, local: 2, low: 3 };
entries.sort((a, b) => {
  const diff = order[a.risk.level] - order[b.risk.level];
  if (diff !== 0) return diff;
  return a.port - b.port;
});

const ssVersion = run('ss --version');
const lsofVersion = run("lsof -v");
const tooling = {
  ss: { cmd: ssCmd, version: ssVersion ? ssVersion.split('\n')[0] : null }
};
if (lsofVersion) {
  tooling.lsof = { cmd: "lsof -nP -i", version: lsofVersion.split("\n")[0] };
} else {
  tooling.missing = ["lsof"];
}

const meta = {
  generated_at: new Date().toISOString(),
  host: os.hostname(),
  ips_host: networkInterfaces(),
  docker_networks: dockerSubnets,
  privileged,
  tooling
};

console.log(JSON.stringify({ meta, entries }));
