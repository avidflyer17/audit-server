let cpuChartInstance = null;
let memoryChartInstance = null;

let auditsIndex = [];
let auditsMap = {};
let latestEntry = null;
let currentFile = null;
let selectedDate = null;

const SERVICE_CATEGORIES = ['Système', 'Réseau', 'Stockage/Partages', 'Conteneurs', 'Sécurité', 'Journalisation', 'Mises à jour', 'Autre'];
const SERVICE_PATTERNS = [
  {regex:/docker|containerd/i, icon:'🐳', category:'Conteneurs'},
  {regex:/ssh/i, icon:'🔐', category:'Sécurité'},
  {regex:/cron/i, icon:'⏱️', category:'Système'},
  {regex:/dbus/i, icon:'🔌', category:'Système'},
  {regex:/ntp|ntpsec|timesync/i, icon:'🕒', category:'Réseau'},
  {regex:/rpcbind/i, icon:'🧭', category:'Réseau'},
  {regex:/rpc|nfs/i, icon:'📡', category:'Réseau'},
  {regex:/smb|smbd|nmbd|cifs/i, icon:'🗂️', category:'Stockage/Partages'},
  {regex:/systemd-(journald|logind|networkd|resolved|udevd)/i, icon:'⚙️', category:'Système'},
  {regex:/rsyslog/i, icon:'📝', category:'Journalisation'},
  {regex:/bluetooth/i, icon:'📶', category:'Réseau'},
  {regex:/unattended-upgrades/i, icon:'🔄', category:'Mises à jour'},
  {regex:/thermald/i, icon:'🌡️', category:'Système'},
];

let servicesData = [];
let filteredServices = [];
let activeServiceCats = new Set(SERVICE_CATEGORIES);
let serviceSearch = '';
let serviceSort = 'az';
let servicesInit = false;

function getServiceMeta(name){
  for (const p of SERVICE_PATTERNS){
    if (p.regex.test(name)) return p;
  }
  return {icon:'⬜', category:'Autre'};
}

function initServicesUI(){
  if (servicesInit) return;
  servicesInit = true;
  const searchInput = document.getElementById('serviceSearch');
  const sortSelect = document.getElementById('serviceSort');
  const filtersDiv = document.getElementById('categoryFilters');
  SERVICE_CATEGORIES.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip active';
    chip.textContent = cat;
    chip.dataset.cat = cat;
    chip.addEventListener('click', () => {
      if (activeServiceCats.has(cat)) activeServiceCats.delete(cat); else activeServiceCats.add(cat);
      chip.classList.toggle('active');
      applyServiceFilters();
    });
    filtersDiv.appendChild(chip);
  });
  searchInput.addEventListener('input', e => { serviceSearch = e.target.value.toLowerCase(); applyServiceFilters(); });
  sortSelect.addEventListener('change', e => { serviceSort = e.target.value; applyServiceFilters(); });
  document.getElementById('copyServicesBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(filteredServices.map(s=>s.name).join('\n')).then(()=>alert('Copié dans le presse-papiers !'));
  });
  document.getElementById('resetFilters').addEventListener('click', () => {
    serviceSearch = '';
    serviceSort = 'az';
    activeServiceCats = new Set(SERVICE_CATEGORIES);
    searchInput.value = '';
    sortSelect.value = 'az';
    document.querySelectorAll('#categoryFilters .filter-chip').forEach(c => c.classList.add('active'));
    applyServiceFilters();
  });
}

function applyServiceFilters(){
  filteredServices = servicesData.filter(s => activeServiceCats.has(s.category) && s.name.toLowerCase().includes(serviceSearch));
  if (serviceSort === 'az') filteredServices.sort((a,b)=>a.name.localeCompare(b.name));
  else if (serviceSort === 'za') filteredServices.sort((a,b)=>b.name.localeCompare(a.name));
  else if (serviceSort === 'cat') filteredServices.sort((a,b)=>a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  renderServicesList();
}

function renderServicesList(){
  const list = document.getElementById('servicesList');
  list.innerHTML = '';
  const countSpan = document.getElementById('servicesCount');
  if (filteredServices.length === 0){
    countSpan.textContent = '0 service';
    document.getElementById('servicesEmpty').classList.remove('hidden');
    return;
  }
  document.getElementById('servicesEmpty').classList.add('hidden');
  filteredServices.forEach(s => {
    const item = document.createElement('div');
    item.className = 'service-item';
    item.tabIndex = 0;
    item.title = s.desc;
    item.setAttribute('aria-expanded', 'false');
    item.innerHTML = `<div class="service-main"><span class="service-icon">${s.icon}</span><span class="service-name">${s.name}</span><span class="service-badge cat-${s.category.toLowerCase().replace(/[\s/]+/g,'-')}">${s.category}</span></div><div class="service-details"><div><strong>Nom de l’unité :</strong> <code>${s.name}</code> <button class="copy-btn small" title="Copier le nom">📋</button></div><div><strong>Type :</strong> service</div><div><strong>Description :</strong> ${s.desc}</div></div>`;
    const copyBtn = item.querySelector('.copy-btn');
    copyBtn.addEventListener('click', e => { e.stopPropagation(); navigator.clipboard.writeText(s.name).then(()=>alert('Copié dans le presse-papiers !')); });
    const toggle = () => {
      const expanded = item.classList.toggle('expanded');
      item.setAttribute('aria-expanded', expanded);
    };
    item.addEventListener('click', toggle);
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    list.appendChild(item);
  });
  countSpan.textContent = `${filteredServices.length} service${filteredServices.length>1?'s':''}`;
}

function renderServices(names){
  initServicesUI();
  servicesData = (names || []).map(n => { const meta = getServiceMeta(n); return {name:n, icon:meta.icon, category:meta.category, desc:'Service systemd'}; });
  applyServiceFilters();
}

const PORT_FILTERS = ['TCP','UDP','Public','Localhost','Docker','System','Unknown'];
let portsData = [];
let filteredPorts = [];
let activePortFilters = new Set(PORT_FILTERS);
let portSearch = '';
let portSort = 'port-asc';
let portsInit = false;

const WELL_KNOWN = {
  '22':'ssh',
  '53':'dns',
  '80':'http',
  '443':'https',
  '445':'smb',
  '139':'smb',
  '111':'rpcbind',
  '3306':'mysql',
  '5432':'postgres',
  '6379':'redis',
  '9100':'node-exporter',
  '123':'ntp'
};

const SENSITIVE_PORTS = [22,80,443,445,139,3306,5432,6379];

function parseAddr(portStr){
  const ipv6 = portStr.match(/^\[([^\]]+)]:(\d+)/);
  if (ipv6) return {ip:ipv6[1].split('%')[0], port:ipv6[2]};
  const parts = portStr.split(':');
  const port = parts.pop();
  const ip = parts.join(':') || '*';
  return {ip, port};
}

function getService(port){
  return WELL_KNOWN[port] || 'Unknown';
}

function getIcon(service, port, proto, ip){
  const n = Number(port);
  if (ip.startsWith('172.17.') || /docker|containerd/i.test(service)) return '🐳';
  if (service === 'ssh' || n===22) return '🔐';
  if (service === 'dns' || n===53) return '🌐';
  if (service === 'http' || n===80 || n===443) return '🌍';
  if (service === 'smb' || n===445 || n===139) return '🗂️';
  if (n===111 || n===2049) return '📡';
  if (service === 'mysql' || n===3306) return '🛢️';
  if (service === 'postgres' || n===5432) return '🐘';
  if (service === 'redis' || n===6379) return '⚡';
  if (service === 'node-exporter' || n===9100) return '📈';
  if (service === 'ntp' || n===123) return '🕒';
  return '◻️';
}

function getBadges(ip, service){
  const badges = [];
  if (ip.startsWith('172.17.')) badges.push('Docker');
  if (/^127\./.test(ip) || ip==='::1') badges.push('Localhost');
  if (ip==='0.0.0.0' || ip==='*' || ip==='::' || ip==='[::]') badges.push('Public');
  if (['ssh','dns','http','https','smb','rpcbind','mysql','postgres','redis','node-exporter','ntp'].includes(service)) badges.push('System');
  if (service === 'Unknown') badges.push('Unknown');
  return badges;
}

function getRisk(ip, port, service){
  const n = Number(port);
  const sensitive = SENSITIVE_PORTS.includes(n) || (n>=9000 && n<=10000);
  const isPublic = ip==='0.0.0.0' || ip==='*' || ip==='::' || ip==='[::]';
  const isLan = /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) || ip.startsWith('172.17.');
  const isLocal = /^127\./.test(ip) || ip==='::1';
  if (isPublic && sensitive) return 'high';
  if ((isLan) && sensitive) return 'medium';
  return 'low';
}

function initPortsUI(){
  if (portsInit) return;
  portsInit = true;
  const searchInput = document.getElementById('portSearch');
  const filtersDiv = document.getElementById('portFilters');
  const sortSelect = document.getElementById('portSort');
  const legendDiv = document.getElementById('portsLegend');
  if (legendDiv){
    legendDiv.innerHTML='';
    [
      {cls:'low', label:'faible risque'},
      {cls:'medium', label:'exposé localement'},
      {cls:'high', label:'potentiellement exposé / critique'}
    ].forEach(item=>{
      const span=document.createElement('span');
      span.innerHTML=`<span class="risk-dot ${item.cls}"></span>${item.label}`;
      legendDiv.appendChild(span);
    });
  }
  PORT_FILTERS.forEach(f => {
    const chip = document.createElement('button');
    chip.className='filter-chip active';
    chip.textContent=f;
    chip.dataset.filter=f;
    chip.addEventListener('click', ()=>{
      if (activePortFilters.has(f)) activePortFilters.delete(f); else activePortFilters.add(f);
      chip.classList.toggle('active');
      applyPortFilters();
    });
    filtersDiv.appendChild(chip);
  });
  searchInput.addEventListener('input', e=>{ portSearch = e.target.value.toLowerCase(); applyPortFilters(); });
  sortSelect.addEventListener('change', e=>{ portSort = e.target.value; applyPortFilters(); });
  document.getElementById('copyAllPorts').addEventListener('click', ()=>{
    navigator.clipboard.writeText(filteredPorts.map(p=>`${p.ip}:${p.port}/${p.proto.toLowerCase()}`).join('\n')).then(()=>alert('Copié dans le presse-papiers !'));
  });
  document.getElementById('portsReset').addEventListener('click', ()=>{
    portSearch='';
    portSort='port-asc';
    activePortFilters=new Set(PORT_FILTERS);
    searchInput.value='';
    sortSelect.value='port-asc';
    document.querySelectorAll('#portFilters .filter-chip').forEach(c=>c.classList.add('active'));
    applyPortFilters();
  });
}

function applyPortFilters(){
  filteredPorts = portsData.filter(p=>{
    if (!activePortFilters.has(p.proto)) return false;
    if (p.badges.includes('Public') && !activePortFilters.has('Public')) return false;
    if (p.badges.includes('Localhost') && !activePortFilters.has('Localhost')) return false;
    if (p.badges.includes('Docker') && !activePortFilters.has('Docker')) return false;
    if (p.badges.includes('System') && !activePortFilters.has('System')) return false;
    if (p.badges.includes('Unknown') && !activePortFilters.has('Unknown')) return false;
    const hay = `${p.ip} ${p.port} ${p.service}`.toLowerCase();
    return hay.includes(portSearch);
  });
  if (portSort==='port-asc') filteredPorts.sort((a,b)=>a.port-b.port);
  else if (portSort==='port-desc') filteredPorts.sort((a,b)=>b.port-a.port);
  else if (portSort==='service') filteredPorts.sort((a,b)=>a.service.localeCompare(b.service));
  else if (portSort==='risk') {
    const order={high:0,medium:1,low:2};
    filteredPorts.sort((a,b)=>order[a.risk]-order[b.risk]);
  }
  renderPortsList();
}

function renderPortsList(){
  const container = document.getElementById('portsContainer');
  container.innerHTML='';
  const totalSpan = document.getElementById('portsTotal');
  totalSpan.textContent = portsData.length;
  if (filteredPorts.length===0){
    document.getElementById('portsEmpty').classList.remove('hidden');
    return;
  }
  document.getElementById('portsEmpty').classList.add('hidden');
  const byProto = {};
  filteredPorts.forEach(p=>{ if(!byProto[p.proto]) byProto[p.proto]=[]; byProto[p.proto].push(p); });
  ['TCP','UDP'].forEach(proto=>{
    const list = byProto[proto] || [];
    if (!list.length) return;
    const acc = document.createElement('div');
    acc.className='port-accordion open';
    const header=document.createElement('button');
    header.className='accordion-header';
    header.innerHTML=`<span>${proto}</span><span class="count">${list.length}</span>`;
    header.addEventListener('click',()=>acc.classList.toggle('open'));
    acc.appendChild(header);
    const body=document.createElement('div');
    body.className='accordion-content';
    const byIp={};
    list.forEach(p=>{ if(!byIp[p.ip]) byIp[p.ip]=[]; byIp[p.ip].push(p); });
    Object.entries(byIp).forEach(([ip,ports])=>{
      const ipAcc=document.createElement('div');
      ipAcc.className='ip-accordion';
      const ipHead=document.createElement('button');
      ipHead.className='accordion-header';
      ipHead.innerHTML=`<span>${ip}</span><span class="count">${ports.length}</span>`;
      ipHead.addEventListener('click',()=>ipAcc.classList.toggle('open'));
      ipAcc.appendChild(ipHead);
      const ipBody=document.createElement('div');
      ipBody.className='accordion-content';
      ports.forEach(p=>{
        const line=document.createElement('div');
        line.className='port-line';
        line.title=`${p.ip} • ${p.port} • ${p.service}`;
        const badgesHtml=p.badges.map(b=>`<span class="badge">${b}</span>`).join('');
        line.innerHTML=`<span class="service-icon">${p.icon}</span><span class="service-name">${p.service}</span><span class="port-mono">:${p.port}/${p.proto.toLowerCase()}</span><span class="actions"><span class="risk-dot ${p.risk}"></span>${badgesHtml}<button class="copy-btn small" title="Copier">📋</button></span>`;
        line.querySelector('.copy-btn').addEventListener('click',e=>{e.stopPropagation();navigator.clipboard.writeText(`${p.ip}:${p.port}/${p.proto.toLowerCase()}`);});
        ipBody.appendChild(line);
      });
      ipAcc.appendChild(ipBody);
      body.appendChild(ipAcc);
    });
    acc.appendChild(body);
    container.appendChild(acc);
  });
}

function renderPorts(ports){
  initPortsUI();
  portsData = (ports||[]).map(p=>{
    const {ip,port} = parseAddr(p.port);
    const service = getService(port);
    const badges = getBadges(ip, service);
    const risk = getRisk(ip, port, service);
    const icon = getIcon(service, port, p.proto, ip);
    return {proto:p.proto.toUpperCase(), ip, port:Number(port), service, badges, risk, icon};
  });
  applyPortFilters();
}

async function fetchIndex() {
  const res = await fetch('/archives/index.json');
  return await res.json();
}

async function loadAudit(file) {
  try {
    const res = await fetch('/archives/' + file);
    if (!res.ok) throw new Error('Fichier inaccessible');
    return await res.json();
  } catch (err) {
    console.error('Erreur chargement :', err);
    alert("Erreur lors du chargement de l'audit !");
    return null;
  }
}

function parseIndex(list) {
  auditsIndex = list || [];
  auditsMap = {};
  latestEntry = null;
  auditsIndex.forEach(file => {
    const match = file.match(/audit_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})\.json/);
    if (!match) return;
    const date = match[1];
    const time = match[2].replace('-', ':');
    const iso = new Date(`${date}T${time}:00`);
    const entry = { file, time, iso, date };
    if (!auditsMap[date]) auditsMap[date] = [];
    auditsMap[date].push(entry);
    if (!latestEntry || iso > latestEntry.iso) latestEntry = entry;
  });
  Object.keys(auditsMap).forEach(d => auditsMap[d].sort((a, b) => a.iso - b.iso));
  return auditsMap;
}

function formatRelative(date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(navigator.language, { numeric: 'auto' });
  return rtf.format(-minutes, 'minute');
}

function showStatus(message, type) {
  const div = document.getElementById('selectorStatus');
  div.className = type || '';
  if (type === 'loading') {
    div.innerHTML = `<div class="skeleton"></div> ${message}`;
  } else if (type === 'error') {
    div.innerHTML = `${message} <button id="retryBtn" class="btn">Réessayer</button>`;
    document.getElementById('retryBtn').addEventListener('click', init);
  } else if (type === 'empty') {
    div.textContent = message;
  } else {
    div.textContent = message || '';
  }
}

function renderTimeline(list) {
  const timeline = document.getElementById('timeTimeline');
  timeline.innerHTML = '';
  list.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'time-chip';
    btn.textContent = item.time;
    btn.dataset.file = item.file;
    btn.dataset.iso = item.iso.toISOString();
    btn.title = `${item.time} — ${formatRelative(item.iso)}`;
    btn.addEventListener('click', () => selectTime(item.file));
    timeline.appendChild(btn);
  });
}

function populateDay(day) {
  const list = auditsMap[day] || [];
  if (list.length === 0) {
    renderTimeline([]);
    showStatus('Aucune heure disponible', 'empty');
    return null;
  }
  showStatus('');
  renderTimeline(list);
  const last = list[list.length - 1];
  setActiveTime(last.file);
  return last.file;
}

function setActiveTime(file) {
  document.querySelectorAll('.time-chip').forEach(b => b.classList.toggle('active', b.dataset.file === file));
}

async function selectTime(file) {
  const json = await loadAudit(file);
  if (json) {
    currentFile = file;
    renderCpuChart(json.cpu.usage);
    renderText(json);
    setActiveTime(file);
  }
}

function updateDayButtons() {
  const today = new Date().toISOString().slice(0,10);
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  document.getElementById('dayToday').classList.toggle('active', selectedDate === today);
  document.getElementById('dayYesterday').classList.toggle('active', selectedDate === yesterday);
  document.getElementById('dayCalendar').classList.toggle('active', selectedDate !== today && selectedDate !== yesterday);
}

function showUpdateBadge() {
  const badge = document.getElementById('updateBadge');
  badge.classList.add('show');
  setTimeout(() => badge.classList.remove('show'), 1000);
}

function renderCpuChart(usages) {
  const ctx = document.getElementById('cpuChart').getContext('2d');
  if (cpuChartInstance) cpuChartInstance.destroy();

  cpuChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: usages.map(u => 'CPU ' + u.core),
      datasets: [{
        label: 'Utilisation (%)',
        data: usages.map(u => parseFloat(u.usage)),
        backgroundColor: 'rgba(100, 181, 246, 0.7)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 100 }
      }
    }
  });
}

function parseLoadAverage(value) {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const one = Number(value.one ?? value["1min"] ?? value["1m"]);
    const five = Number(value.five ?? value["5min"] ?? value["5m"]);
    const fifteen = Number(value.fifteen ?? value["15min"] ?? value["15m"]);
    if ([one, five, fifteen].some(v => isNaN(v))) return null;
    return { one, five, fifteen };
  }
  const parts = String(value).split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const nums = parts.slice(0,3).map(p => parseFloat(p.replace(',', '.')));
  if (nums.some(v => isNaN(v))) return null;
  return { one: nums[0], five: nums[1], fifteen: nums[2] };
}

function loadToPercent(load, cores) {
  if (load == null || !cores) return { pct: null, rawPct: null };
  const rawPct = (load / cores) * 100;
  const pct = Math.max(0, Math.min(100, rawPct));
  return { pct, rawPct };
}

function loadColor(v) {
  if (v == null) return '#666';
  if (v < 70) return '#4caf50';
  if (v < 100) return '#ff9800';
  return '#f44336';
}

function arrowFromDiff(d) {
  if (d > 5) return '↑';
  if (d < -5) return '↓';
  return '→';
}

function trendLabel(d) {
  if (d > 5) return 'en hausse';
  if (d < -5) return 'en baisse';
  return 'stable';
}

function renderMini(label, value, prev, raw) {
  const card = document.getElementById(`load${label}Card`);
  const valEl = document.getElementById(`load${label}Val`);
  const bar = document.getElementById(`load${label}Bar`);
  const trend = document.getElementById(`load${label}Trend`);
  if (value == null) {
    card.classList.add('na');
    valEl.textContent = '—';
    bar.style.width = '0%';
    trend.textContent = 'donnée manquante';
    card.removeAttribute('title');
  } else {
    card.classList.remove('na');
    valEl.textContent = Math.round(value) + '%';
    const display = Math.max(0, Math.min(100, value));
    bar.style.width = display + '%';
    const color = loadColor(value);
    card.style.setProperty('--load-color', color);
    const diff = prev != null ? value - prev : 0;
    trend.textContent = trendLabel(diff);
    if (raw != null) card.title = `${raw.toFixed(1)}%`;
  }
}

function renderLoadAverage(raw, cores) {
  const loads = parseLoadAverage(raw);
  const gauge = document.getElementById('loadGauge');
  const path = document.getElementById('loadGaugePath');
  const trendEl = document.getElementById('loadTrend');
  const badge = document.getElementById('loadAvgBadge');

  badge.classList.remove('green', 'orange', 'red');

  if (!loads || !cores) {
    document.getElementById('load1Val').textContent = '—';
    trendEl.textContent = '→';
    trendEl.style.color = '#666';
    path.setAttribute('stroke-dasharray', '0 100');
    renderMini('5', null, null);
    renderMini('15', null, null);
    badge.textContent = '';
    return;
  }

  const one = loadToPercent(loads.one, cores);
  const five = loadToPercent(loads.five, cores);
  const fifteen = loadToPercent(loads.fifteen, cores);

  const color1 = loadColor(one.pct);
  gauge.style.setProperty('--load-color', color1);
  const dashVal = one.pct != null ? Math.max(0, Math.min(100, one.pct)) : 0;
  path.setAttribute('stroke-dasharray', `${dashVal} 100`);
  document.getElementById('load1Val').textContent = one.pct != null ? Math.round(one.pct) + '%' : '—';
  gauge.title = one.rawPct != null ? `${one.rawPct.toFixed(1)}%` : '';
  const diff = (one.pct != null && five.pct != null) ? one.pct - five.pct : 0;
  trendEl.textContent = arrowFromDiff(diff);
  trendEl.style.color = color1;
  renderMini('5', five.pct, one.pct, five.rawPct);
  renderMini('15', fifteen.pct, five.pct, fifteen.rawPct);

  if (one.rawPct == null) {
    badge.textContent = '';
  } else if (one.rawPct < 70) {
    badge.textContent = '🟢 Système OK';
    badge.classList.add('green');
  } else if (one.rawPct < 100) {
    badge.textContent = '🟠 Système chargé';
    badge.classList.add('orange');
  } else {
    badge.textContent = '🔴 Système surchargé';
    badge.classList.add('red');
  }
}

function renderText(json) {
  document.getElementById('generated').textContent = json.generated;
  document.getElementById('hostname').textContent = json.hostname;
  document.getElementById('ipLocal').textContent = json.ip_local || '--';
  document.getElementById('ipPublic').textContent = json.ip_pub || '--';
  document.getElementById('uptime').textContent = json.uptime || '--';
  renderLoadAverage(json.load_average, json.cpu?.cores);

  const mem = json.memory?.ram;
  if (mem) {
    const total = parseFloat(mem.total);
    const used = parseFloat(mem.used);
    const free = parseFloat(mem.free);

    const memCtx = document.getElementById('memoryChart').getContext('2d');
    if (memoryChartInstance) memoryChartInstance.destroy();

    memoryChartInstance = new Chart(memCtx, {
      type: 'pie',
      data: {
        labels: ['Utilisée', 'Libre'],
        datasets: [{
          data: [used, free],
          backgroundColor: ['#ff9800', '#4caf50']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: '#fff',
              font: { size: 14 }
            }
          }
        }
      }
    });
  }

  const disksContainer = document.getElementById("disksContainer");
  disksContainer.innerHTML = "";
  if (json.disks && json.disks.length > 0) {
    json.disks.forEach(disk => {
      const usedPercent = parseInt(disk.used_percent);
      let colorClass = "green";
      if (usedPercent > 80) colorClass = "red";
      else if (usedPercent > 50) colorClass = "orange";

      const bar = `
        <div style="margin-bottom: 1rem;">
          <strong>${disk.mountpoint}</strong> – ${disk.used} / ${disk.size} (${disk.available} libre)
          <div class="disk-bar">
            <div class="disk-bar-fill ${colorClass}" style="width: ${usedPercent}%">
              ${usedPercent}%
            </div>
          </div>
        </div>
      `;

      disksContainer.innerHTML += bar;
    });
  } else {
    disksContainer.innerHTML = "<p>Aucun disque détecté.</p>";
  }

  const tempsContainer = document.getElementById("tempsContainer");
  tempsContainer.innerHTML = "";
  const temps = json.cpu?.temperatures;
  if (Array.isArray(temps) && temps.length > 0) {
    temps.forEach(t => {
      const value = parseFloat(t.temp);
      const wrapper = document.createElement("div");
      wrapper.className = "temp-wrapper";

      const label = document.createElement("span");
      label.textContent = `Core ${t.core}: ${isNaN(value) ? "N/A" : value.toFixed(1) + "°C"}`;
      wrapper.appendChild(label);

      const bar = document.createElement("div");
      bar.className = "temp-bar";
      const fill = document.createElement("div");
      fill.className = "temp-fill";
      if (!isNaN(value)) {
        const percentage = Math.min(100, Math.max(0, value));
        fill.style.width = percentage + "%";
        // Color zones: 0-80°C green, 80-95°C orange, 95°C+ red
        if (value < 80) {
          fill.classList.add("green");
        } else if (value < 95) {
          fill.classList.add("orange");
        } else {
          fill.classList.add("red");
        }
      }
      bar.appendChild(fill);
      wrapper.appendChild(bar);
      tempsContainer.appendChild(wrapper);
    });
  } else {
    tempsContainer.textContent = "N/A";
  }

  const badge = document.getElementById('cpuLoadBadge');
  const color = json.cpu_load_color ? json.cpu_load_color.toLowerCase() : "";
  badge.textContent = json.cpu_load_color?.toUpperCase() || "N/A";
  badge.className = "badge " + color;

  renderServices(json.services);

  renderPorts(json.ports);

  const topCpu = json.top_cpu?.slice(1).map(p => `${p.cmd} (PID ${p.pid}) - CPU ${p.cpu}%, RAM ${p.mem}%`) || [];
  document.getElementById('topCpuText').textContent = topCpu.length ? topCpu.join('\n') : 'Aucun processus';

  const topMem = json.top_mem?.slice(1).map(p => `${p.cmd} (PID ${p.pid}) - RAM ${p.mem}%, CPU ${p.cpu}%`) || [];
  document.getElementById('topMemText').textContent = topMem.length ? topMem.join('\n') : 'Aucun processus';

  const docker = json.docker?.join('\n') || 'Aucun conteneur';
  document.getElementById('dockerText').textContent = docker;
}

async function init() {
  try {
    showStatus('Chargement…', 'loading');
    const list = await fetchIndex();
    parseIndex(list);
    if (!latestEntry) {
      showStatus('Aucun rapport', 'empty');
      return;
    }
    selectedDate = latestEntry.date;
    document.getElementById('datePicker').value = selectedDate;
    updateDayButtons();
    const file = populateDay(selectedDate);
    if (file) await selectTime(file);
    document.getElementById('latestInfo').textContent = `${latestEntry.time} — ${formatRelative(latestEntry.iso)}`;
    showStatus('');
  } catch (err) {
    console.error(err);
    showStatus('Impossible de charger les rapports', 'error');
    return;
  }


  document.getElementById('btnLatest').addEventListener('click', async () => {
    if (!latestEntry) return;
    selectedDate = latestEntry.date;
    document.getElementById('datePicker').value = selectedDate;
    updateDayButtons();
    populateDay(selectedDate);
    await selectTime(latestEntry.file);
  });

  document.getElementById('dayToday').addEventListener('click', () => {
    const day = new Date().toISOString().slice(0,10);
    document.getElementById('datePicker').value = day;
    selectedDate = day;
    updateDayButtons();
    const file = populateDay(day);
    if (file) selectTime(file);
  });

  document.getElementById('dayYesterday').addEventListener('click', () => {
    const day = new Date(Date.now()-86400000).toISOString().slice(0,10);
    document.getElementById('datePicker').value = day;
    selectedDate = day;
    updateDayButtons();
    const file = populateDay(day);
    if (file) selectTime(file);
  });

  document.getElementById('dayCalendar').addEventListener('click', () => {
    const picker = document.getElementById('datePicker');
    picker.showPicker?.();
    picker.focus();
  });

  document.getElementById('datePicker').addEventListener('change', () => {
    selectedDate = document.getElementById('datePicker').value;
    updateDayButtons();
    const file = populateDay(selectedDate);
    if (file) selectTime(file);
  });


  setInterval(refreshAudits, 60000);
}

async function refreshAudits() {
  const dot = document.getElementById('refreshDot');
  dot.classList.add('active');
  const oldList = auditsMap[selectedDate] ? auditsMap[selectedDate].map(e => e.file) : [];
  const wasOnLatest = currentFile && latestEntry && currentFile === latestEntry.file;
  try {
    const list = await fetchIndex();
    parseIndex(list);
    if (latestEntry) {
      document.getElementById('latestInfo').textContent = `${latestEntry.time} — ${formatRelative(latestEntry.iso)}`;
    }
    const newList = auditsMap[selectedDate] ? auditsMap[selectedDate].map(e => e.file) : [];
    const added = newList.filter(f => !oldList.includes(f));
    if (added.length || newList.length !== oldList.length) {
      populateDay(selectedDate);
      if (currentFile && newList.includes(currentFile)) setActiveTime(currentFile);
      added.forEach(f => {
        const chip = document.querySelector(`.time-chip[data-file="${f}"]`);
        if (chip) chip.insertAdjacentHTML('beforeend', '<span class="badge">Nouveau</span>');
      });
      if (added.length) showUpdateBadge();
    }
    if (wasOnLatest && latestEntry && latestEntry.file !== currentFile) {
      selectedDate = latestEntry.date;
      document.getElementById('datePicker').value = selectedDate;
      updateDayButtons();
      populateDay(selectedDate);
      await selectTime(latestEntry.file);
    }
  } catch (err) {
    console.error('refresh error', err);
  } finally {
    dot.classList.remove('active');
  }
}

document.addEventListener('DOMContentLoaded', init);
