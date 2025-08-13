/* chart instances removed after redesign */

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

const ICON_MAP = [
  {regex:/docker|containerd/i, icon:'🐳'},
  {regex:/nginx|traefik|caddy/i, icon:'🌐'},
  {regex:/node|nodejs/i, icon:'🟩'},
  {regex:/python|gunicorn|uvicorn/i, icon:'🐍'},
  {regex:/java/i, icon:'☕'},
  {regex:/redis/i, icon:'⚡'},
  {regex:/postgres|postgre/i, icon:'🐘'},
  {regex:/mysql|mariadb/i, icon:'🛢️'},
  {regex:/mongodb/i, icon:'🍃'},
  {regex:/jellyfin|plex|emby/i, icon:'🎬'},
  {regex:/adguard/i, icon:'🛡️'},
  {regex:/crowdsec/i, icon:'🧱'},
  {regex:/zigbee2mqtt|mqtt|mosquitto/i, icon:'📶'},
  {regex:/ssh|openssh/i, icon:'🔐'},
  {regex:/smb|samba/i, icon:'🗂️'},
  {regex:/prometheus|exporter|grafana/i, icon:'📈'},
  {regex:/.*/, icon:'⚙️'}
];

function iconFor(name){
  for(const m of ICON_MAP){
    if(m.regex.test(name)) return m.icon;
  }
  return '⚙️';
}

function colorClassCpu(v){
  const val = Number(v);
  if (val < 40) return 'color-success';
  if (val < 70) return 'color-warning';
  return 'color-danger';
}

function colorClassRam(v){
  const val = Number(v);
  if (val < 40) return 'color-info';
  if (val < 70) return 'color-warning';
  return 'color-danger';
}

function colorClassTemp(v){
  const val = Number(v);
  if (val < 60) return 'color-success';
  if (val < 80) return 'color-warning';
  return 'color-danger';
}

function colorClassDisk(v){
  const val = Number(v);
  if (val < 50) return 'color-success';
  if (val < 80) return 'color-warning';
  return 'color-danger';
}

function parseSizeToBytes(val){
  if (val == null) return null;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const str = String(val).trim().replace(/,/g, '.');
  const m = str.match(/^(\d+(?:\.\d+)?)(?:\s*(B|[KMGT]iB?|[KMGT]i))?$/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (isNaN(num)) return null;
  const unit = (m[2] || 'B').toUpperCase();
  const map = { B:1, KI:1024, KIB:1024, MI:1024**2, MIB:1024**2, GI:1024**3, GIB:1024**3, TI:1024**4, TIB:1024**4 };
  const mul = map[unit];
  if (!mul) return null;
  return num * mul;
}

function formatBytes(bytes){
  if (bytes == null || isNaN(bytes)) return 'N/A';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1){
    val /= 1024;
    i++;
  }
  const dec = val < 10 && i > 0 ? 1 : 0;
  return val.toFixed(dec) + units[i];
}

function formatGi(bytes){
  if (bytes == null || isNaN(bytes)) return 'N/A';
  return (bytes / (1024 ** 3)).toFixed(1) + 'Go';
}

function pctClass(pct){
  if (pct >= 75) return 'crit';
  if (pct >= 50) return 'warn';
  return 'ok';
}

function renderSparkline(arr){
  if (!Array.isArray(arr) || arr.length < 2) return null;
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','spark');
  svg.setAttribute('viewBox','0 0 60 20');
  const max = Math.max(100, ...arr);
  const step = 60 / (arr.length - 1);
  const points = arr.map((v,i)=>`${i*step},${20 - (v / max) * 20}`).join(' ');
  const line = document.createElementNS('http://www.w3.org/2000/svg','polyline');
  line.setAttribute('points', points);
  line.setAttribute('fill','none');
  line.setAttribute('stroke','var(--accent-color)');
  line.setAttribute('stroke-width','2');
  line.setAttribute('vector-effect','non-scaling-stroke');
  svg.appendChild(line);
  return svg;
}

function parseUptime(str){
  if(!str) return {text:'--', days:0};
  const parts = {days:0, hours:0, minutes:0};
  str.replace(/(\d+)\s+(year|week|day|hour|minute|years|weeks|days|hours|minutes)/g,(m,n,unit)=>{
    const num = parseInt(n,10);
    if(unit.startsWith('year')) parts.days += num*365;
    else if(unit.startsWith('week')) parts.days += num*7;
    else if(unit.startsWith('day')) parts.days += num;
    else if(unit.startsWith('hour')) parts.hours += num;
    else if(unit.startsWith('minute')) parts.minutes += num;
  });
  const segments = [];
  if(parts.days) segments.push(parts.days+ ' j');
  if(parts.hours) segments.push(parts.hours+ ' h');
  if(parts.minutes) segments.push(parts.minutes+ ' min');
  if(segments.length===0) segments.push('0 min');
  const totalDays = parts.days + parts.hours/24 + parts.minutes/1440;
  return {text:segments.join(' '), days:totalDays};
}

function setupCopy(id, getter){
  const btn = document.getElementById(id);
  if(!btn) return;
  btn.onclick = () => {
    const text = getter();
    if(!text || text==='--' || text==='N/A') return;
    navigator.clipboard.writeText(text).then(()=>{
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      setTimeout(()=>{ btn.innerHTML = original; },1000);
    });
  };
}

let dockerData = [];
let dockerFiltered = [];
let dockerFilters = new Set(['healthy','unhealthy','running','exited']);
let dockerSearch = '';
let dockerSort = 'name';
let dockerInit = false;

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
  list.textContent = '';
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

    const main = document.createElement('div');
    main.className = 'service-main';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'service-icon';
    iconSpan.textContent = s.icon;
    main.appendChild(iconSpan);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'service-name';
    nameSpan.textContent = s.name;
    main.appendChild(nameSpan);

    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'service-badge cat-' + s.category.toLowerCase().replace(/[\s/]+/g,'-');
    badgeSpan.textContent = s.category;
    main.appendChild(badgeSpan);

    item.appendChild(main);

    const details = document.createElement('div');
    details.className = 'service-details';

    const nameDiv = document.createElement('div');
    const strongName = document.createElement('strong');
    strongName.textContent = 'Nom de l’unité :';
    const code = document.createElement('code');
    code.textContent = s.name;
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn small';
    copyBtn.title = 'Copier le nom';
    copyBtn.textContent = '📋';
    nameDiv.append(strongName, ' ', code, ' ', copyBtn);
    details.appendChild(nameDiv);

    const typeDiv = document.createElement('div');
    const strongType = document.createElement('strong');
    strongType.textContent = 'Type :';
    typeDiv.append(strongType, ' service');
    details.appendChild(typeDiv);

    const descDiv = document.createElement('div');
    const strongDesc = document.createElement('strong');
    strongDesc.textContent = 'Description :';
    descDiv.append(strongDesc, ' ', s.desc);
    details.appendChild(descDiv);

    item.appendChild(details);

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
  const copyAllBtn = document.getElementById('portsCopy');
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
  if (copyAllBtn){
    copyAllBtn.addEventListener('click', ()=>{
      const text = filteredPorts.map(p=>`${p.ip}:${p.port}/${p.proto.toLowerCase()}`).join('\n');
      navigator.clipboard.writeText(text);
    });
  }
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
        line.innerHTML=`<span class="service-icon">${p.icon}</span><span class="service-name">${p.service}</span><span class="port-mono">:${p.port}/${p.proto.toLowerCase()}</span><span class="badges">${badgesHtml}</span><span class="risk-dot ${p.risk}"></span><button class="copy-btn small" title="Copier">📋</button>`;
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

function renderTopProcesses(data, containerId, main){
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const items = data?.slice(1,6) || [];
  if (!items.length){
    container.innerHTML = '<div class="empty">Aucun processus significatif</div>';
    return;
  }
  let total = 0;
  items.forEach(p => {
    const cpu = Number(p.cpu);
    const mem = Number(p.mem);
    if (main === 'cpu') total += cpu; else total += mem;
    const row = document.createElement('div');
    row.className = 'proc-row';
    row.tabIndex = 0;
    row.title = `CPU ${cpu}% — RAM ${mem}%`;
    const icon = iconFor(p.cmd);
    row.innerHTML = `
      <span class="proc-icon">${icon}</span>
      <span class="proc-name">${p.cmd}</span>
      <div class="proc-bars">
        <div class="bar bar-cpu" role="progressbar" aria-label="Utilisation CPU" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${cpu}">
          <span class="fill ${colorClassCpu(cpu)}" style="width:0"></span>
          <span class="value">${cpu}%</span>
        </div>
        <div class="bar bar-ram" role="progressbar" aria-label="Utilisation RAM" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${mem}">
          <span class="fill ${colorClassRam(mem)}" style="width:0"></span>
          <span class="value">${mem}%</span>
        </div>
      </div>`;
    container.appendChild(row);
    const fills = row.querySelectorAll('.bar .fill');
    const values = row.querySelectorAll('.bar .value');
    requestAnimationFrame(() => {
      fills[0].style.width = cpu + '%';
      fills[1].style.width = mem + '%';
      adjustBarValue(values[0], fills[0], cpu);
      adjustBarValue(values[1], fills[1], mem);
    });
  });
  const footer = document.createElement('div');
  footer.className = 'total-summary';
  footer.innerHTML = `Total ${main === 'cpu' ? 'CPU' : 'RAM'} des 5 : <span class="badge-total">${total.toFixed(1)}%</span>`;
  container.appendChild(footer);
}

function contrastColor(bg){
  const rgb = bg.match(/\d+/g).map(Number);
  const luminance = 0.299*rgb[0] + 0.587*rgb[1] + 0.114*rgb[2];
  return luminance > 140 ? '#000' : '#fff';
}

function adjustBarValue(valueEl, fillEl, val){
  let bg;
  if (val >= 20){
    bg = getComputedStyle(fillEl).backgroundColor;
  } else {
    // For small fills, use the bar background to ensure contrast
    bg = getComputedStyle(fillEl.parentElement).backgroundColor;
  }
  valueEl.style.color = contrastColor(bg);
}

function parseDocker(item){
  if (typeof item === 'string'){
    const name = item.split(' (')[0];
    const info = item.slice(name.length + 2, -1); // inside parentheses
    let state = 'running';
    let health = '';
    let uptime = info;
    const m = info.match(/\((healthy|unhealthy|starting)\)/i);
    if (m){
      health = m[1].toLowerCase();
      uptime = info.replace(/\((healthy|unhealthy|starting)\)/i,'').trim();
    }
    if (/^exited/i.test(info)) { state = 'exited'; health = 'exited'; }
    if (!health) health = state;
    return {name, state, health, uptime, cpu:0, mem:0};
  }

  const cpu = item.cpu_pct ?? item.cpu;
  const mem = item.mem_pct ?? item.mem;
  let memText = item.mem_text || '';

  if (!memText && item.mem_used_bytes != null){
    const fmt = b => {
      const units = ['B','KB','MB','GB','TB'];
      let i = 0, v = b;
      while (v >= 1024 && i < units.length - 1){ v /= 1024; i++; }
      return v.toFixed(v < 10 ? 1 : 0) + units[i];
    };
    const used = fmt(item.mem_used_bytes);
    memText = used;
    if (item.mem_limit_bytes){
      memText += ' / ' + fmt(item.mem_limit_bytes);
    }
  }

  return {
    name: item.name,
    state: item.state || 'running',
    health: item.health || item.state || 'running',
    uptime: item.uptime || '',
    cpu: Number(cpu) || 0,
    mem: Number(mem) || 0,
    memText
  };
}

function initDockerUI(){
  if (dockerInit) return;
  dockerInit = true;
  const search = document.getElementById('dockerSearch');
  const sortSel = document.getElementById('dockerSort');
  const chips = document.querySelectorAll('#dockerFilters .chip');
  search.addEventListener('input', e => { dockerSearch = e.target.value.toLowerCase(); applyDockerFilters(); });
  sortSel.addEventListener('change', e => { dockerSort = e.target.value; applyDockerFilters(); });
  chips.forEach(ch => {
    ch.addEventListener('click', () => {
      const f = ch.dataset.filter;
      if (dockerFilters.has(f)) dockerFilters.delete(f); else dockerFilters.add(f);
      ch.classList.toggle('active');
      applyDockerFilters();
    });
  });
}

function applyDockerFilters(){
  dockerFiltered = dockerData.filter(c => {
    const status = c.health === 'starting' ? 'running' : (c.health || c.state);
    return dockerFilters.has(status) && c.name.toLowerCase().includes(dockerSearch);
  });
  if (dockerSort === 'cpu') dockerFiltered.sort((a,b)=>b.cpu-a.cpu);
  else if (dockerSort === 'ram') dockerFiltered.sort((a,b)=>b.mem-a.mem);
  else dockerFiltered.sort((a,b)=>a.name.localeCompare(b.name));
  renderDockerList();
}

function renderDockerList(){
  const grid = document.getElementById('dockerGrid');
  grid.innerHTML = '';
  if (!dockerFiltered.length){
    document.getElementById('dockerEmpty').classList.remove('hidden');
    return;
  }
  document.getElementById('dockerEmpty').classList.add('hidden');
  dockerFiltered.forEach(c => {
    const card = document.createElement('div');
    card.className = 'docker-card';
    card.tabIndex = 0;
    const health = c.health ?? '';
    card.title = `CPU ${c.cpu}% — RAM ${c.mem}%${health ? ` — Status ${health}` : ''}`;
    const cpuColor = colorClassCpu(c.cpu);
    const ramColor = colorClassRam(c.mem);
    const icon = iconFor(c.name);
    const badge = health ? `<span class="status-badge status-${health}">${health}</span>` : '';
    card.innerHTML = `<div class="docker-head"><div class="docker-title"><span class="docker-icon">${icon}</span><span class="docker-name">${c.name}</span></div>${badge}</div><div class="docker-uptime">${c.uptime}</div><div class="docker-bars"><div class="bar-outer cpu"><div class="fill ${cpuColor}"></div><span class="bar-value">${c.cpu}%</span></div><div class="bar-outer ram"><div class="fill ${ramColor}"></div><span class="bar-value">${c.memText || (c.mem + '%')}</span></div></div>`;
    grid.appendChild(card);
    const fills = card.querySelectorAll('.fill');
    requestAnimationFrame(()=>{
      fills[0].style.width = c.cpu + '%';
      fills[1].style.width = c.mem + '%';
    });
  });
}

function renderDocker(list){
  initDockerUI();
  const arr = Array.isArray(list) ? list : (list && Array.isArray(list.containers) ? list.containers : []);
  dockerData = arr.map(parseDocker);
  applyDockerFilters();
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
  return last.file;
}

function setActiveTime(file) {
  document.querySelectorAll('.time-chip').forEach(b => b.classList.toggle('active', b.dataset.file === file));
}

async function selectTime(file) {
  const json = await loadAudit(file);
  if (json) {
    currentFile = file;
    renderText(json);
    setActiveTime(file);
    if (typeof closeMenu === 'function') closeMenu();
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

function renderCpuCores(usages){
  const container = document.getElementById('cpuCores');
  container.innerHTML = '';
  if(!Array.isArray(usages) || usages.length === 0){
    container.innerHTML = '<div class="empty">Aucune donnée CPU</div>';
    return;
  }
  usages.forEach(u => {
    const val = Number(u.usage);
    const card = document.createElement('div');
    card.className = 'docker-card';
    card.innerHTML = `
      <div class="docker-head"><div class="docker-title"><span class="docker-name">CPU ${u.core}</span></div></div>
      <div class="docker-bars">
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${val}">
          <span class="fill ${colorClassCpu(val)}" style="width:0"></span>
          <span class="value">${val}%</span>
        </div>
      </div>`;
    container.appendChild(card);
    const fill = card.querySelector('.bar .fill');
    const valueEl = card.querySelector('.bar .value');
    requestAnimationFrame(() => {
      fill.style.width = val + '%';
      adjustBarValue(valueEl, fill, val);
    });
  });
}

function renderCpuTemps(temps){
  const container = document.getElementById('tempsContainer');
  container.innerHTML = '';
  if(!Array.isArray(temps) || temps.length === 0){
    container.innerHTML = '<div class="empty">N/A</div>';
    return;
  }
  temps.forEach(t => {
    const temp = Number(t.temp);
    const row = document.createElement('div');
    row.className = 'proc-row';
    row.innerHTML = `
      <span class="proc-icon">🔥</span>
      <span class="proc-name">Core ${t.core}</span>
      <div class="proc-bars">
        <div class="bar bar-temp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${temp}">
          <span class="fill ${colorClassTemp(temp)}" style="width:0"></span>
          <span class="value">${isNaN(temp)?'N/A':temp.toFixed(1)+'°C'}</span>
        </div>
      </div>`;
    container.appendChild(row);
    if(!isNaN(temp)){
      const fill = row.querySelector('.bar .fill');
      const valueEl = row.querySelector('.bar .value');
      requestAnimationFrame(()=>{
        fill.style.width = Math.min(100, temp) + '%';
        adjustBarValue(valueEl, fill, Math.min(100, temp));
      });
    }
  });
}

function computeMemoryModel(memory){
  if (!memory) return null;
  const ram = memory.ram || {};
  const swap = memory.swap || {};

  const total = parseSizeToBytes(ram.total);
  let used = parseSizeToBytes(ram.used);
  let free = parseSizeToBytes(ram.free);
  let cache = parseSizeToBytes(ram.buff_cache);
  const shared = parseSizeToBytes(ram.shared);
  const available = parseSizeToBytes(ram.available);

  if ([used, free, cache, total].every(v => typeof v === 'number')){
    const sum = used + free + cache;
    if (total && Math.abs(sum - total) / total > 0.02){
      const k = total / sum;
      used *= k;
      free *= k;
      cache *= k;
    }
  }

  const usedEff = (used != null && cache != null) ? Math.max(0, used - cache) : null;
  const pctEff = (usedEff != null && total) ? Math.round((usedEff / total) * 100) : 0;

  const segUsed = (usedEff != null && total) ? (usedEff / total) * 100 : 0;
  const segCache = (cache != null && total) ? (cache / total) * 100 : 0;
  const segFree = (free != null && total) ? (free / total) * 100 : 0;

  const swapTotal = parseSizeToBytes(swap.total);
  const swapUsed = parseSizeToBytes(swap.used);
  let swapFree = parseSizeToBytes(swap.free);
  if (swapFree == null && swapTotal != null && swapUsed != null){
    swapFree = Math.max(0, swapTotal - swapUsed);
  }
  const swapPct = (swapUsed != null && swapTotal) ? Math.round((swapUsed / swapTotal) * 100) : 0;

  return {
    ram: {
      totalBytes: total,
      usedTotalBytes: used,
      usedEffectiveBytes: usedEff,
      cacheBytes: cache,
      freeBytes: free,
      pct: pctEff,
      seg: { usedPct: segUsed, cachePct: segCache, freePct: segFree }
    },
    badges: { availableBytes: available, sharedBytes: shared },
    swap: { totalBytes: swapTotal, usedBytes: swapUsed, freeBytes: swapFree, pct: swapPct }
  };
}

function renderMemory(model){
  const container = document.getElementById('memorySection');
  container.innerHTML = '';
  if (!model || (!model.ram && !model.swap)){
    container.innerHTML = '<div class="empty">Aucune donnée mémoire</div>';
    return;
  }

  if (model.ram && model.ram.totalBytes != null){
    const info = model.ram;
    const card = document.createElement('article');
    card.className = 'card ram';
    card.innerHTML = `
      <div class="card-head">
        <div class="title">RAM <span class="badge total">${formatGi(info.totalBytes)}</span></div>
        <div class="percent ${pctClass(info.pct)}">${info.pct}%</div>
      </div>
      <div class="bar" role="progressbar" aria-label="Utilisation RAM" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${info.pct}"></div>
      <div class="bar-legend hidden"></div>
      <div class="badges"></div>`;
    const bar = card.querySelector('.bar');
    const legend = card.querySelector('.bar-legend');
    const badges = card.querySelector('.badges');

    const segs = [
      {cls:`seg-used ${pctClass(info.pct)}`, label:'Utilisée réelle', val:info.usedEffectiveBytes, pct:info.seg.usedPct},
      {cls:'seg-cache', label:'Cache/buffers', val:info.cacheBytes, pct:info.seg.cachePct},
      {cls:'seg-free', label:'Libre', val:info.freeBytes, pct:info.seg.freePct}
    ];
    segs.forEach(seg => {
      if (seg.val == null) return;
      const pct = seg.pct;
      const pctStr = Math.round(pct);
      const segEl = document.createElement('div');
      segEl.className = `seg ${seg.cls}`;
      segEl.style.width = pct + '%';
      segEl.dataset.tip = `${seg.label} : ${formatGi(seg.val)} (${pctStr}%)`;
      bar.appendChild(segEl);
      const item = document.createElement('span');
      item.className = `legend-item ${seg.cls}`;
      item.innerHTML = `<span class="dot"></span>${seg.label} : ${formatGi(seg.val)} (${pctStr}%)`;
      legend.appendChild(item);
    });
    if (info.usedEffectiveBytes > 0){
      const pctStr = Math.round(info.seg.usedPct);
      const center = document.createElement('div');
      center.className = 'bar-label';
      center.textContent = `Utilisée réelle : ${formatGi(info.usedEffectiveBytes)} (${pctStr} %)`;
      bar.appendChild(center);
    }
    legend.classList.toggle('hidden', !legend.childElementCount);

    const badgeData = [
      {icon:'fa-microchip', label:'Utilisée (totale)', val:formatGi(info.usedTotalBytes), cls:pctClass(info.pct)},
      {icon:'fa-circle-check', label:'Utilisée réelle', val:formatGi(info.usedEffectiveBytes)},
      {icon:'fa-check', label:'Disponible', val:formatGi(model.badges.availableBytes)},
      {icon:'fa-share-nodes', label:'Partagée', val:formatGi(model.badges.sharedBytes)},
      {icon:'fa-layer-group', label:'Cache/buffers', val:formatGi(info.cacheBytes)},
      {icon:'fa-circle', label:'Libre', val:formatGi(info.freeBytes)}
    ];
    badgeData.forEach(b => {
      if (b.val === 'N/A') return;
      const el = document.createElement('div');
      el.className = `badge${b.cls ? ' '+b.cls : ''}`;
      el.innerHTML = `<i class="fa-solid ${b.icon}" aria-hidden="true"></i><span>${b.label} : ${b.val}</span>`;
      badges.appendChild(el);
    });
    container.appendChild(card);
  }

  if (model.swap && model.swap.totalBytes != null){
    const info = model.swap;
    const card = document.createElement('article');
    card.className = 'card swap';
    card.innerHTML = `
      <div class="card-head">
        <div class="title">Swap <span class="badge total">${formatGi(info.totalBytes)}</span></div>
        <div class="percent ${pctClass(info.pct)}">${info.pct}%</div>
      </div>
      <div class="bar" role="progressbar" aria-label="Utilisation Swap" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${info.pct}"></div>
      <div class="bar-legend hidden"></div>
      <div class="badges"></div>`;
    const bar = card.querySelector('.bar');
    const legend = card.querySelector('.bar-legend');
    const badges = card.querySelector('.badges');

    const segs = [
      {cls:`seg-used ${pctClass(info.pct)}`, label:'Utilisée', val:info.usedBytes, pct: info.totalBytes ? (info.usedBytes / info.totalBytes * 100) : 0},
      {cls:'seg-free', label:'Libre', val:info.freeBytes, pct: info.totalBytes ? (info.freeBytes / info.totalBytes * 100) : 0}
    ];
    segs.forEach(seg => {
      if (seg.val == null) return;
      const pct = seg.pct;
      const pctStr = Math.round(pct);
      const segEl = document.createElement('div');
      segEl.className = `seg ${seg.cls}`;
      segEl.style.width = pct + '%';
      segEl.dataset.tip = `${seg.label} : ${formatGi(seg.val)} (${pctStr}%)`;
      const label = document.createElement('span');
      label.className = 'label';
      if (info.usedBytes === 0 && seg.label === 'Libre') {
        label.textContent = `Libre : ${formatGi(seg.val)} (100 %)`;
      } else {
        label.textContent = `${formatGi(seg.val)} (${pctStr}%)`;
      }
      segEl.appendChild(label);
      bar.appendChild(segEl);
      if (pct < 12){
        label.classList.add('hidden');
        const item = document.createElement('span');
        item.className = `legend-item ${seg.cls}`;
        item.innerHTML = `<span class="dot"></span>${seg.label} : ${formatGi(seg.val)} (${pctStr}%)`;
        legend.appendChild(item);
      } else {
        requestAnimationFrame(()=>adjustBarValue(label, segEl, pct));
      }
    });
    legend.classList.toggle('hidden', !legend.childElementCount);

    if (info.usedBytes > 0){
      const warn = document.createElement('div');
      warn.className = 'badge warn';
      warn.innerHTML = '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>Swap en usage</span>';
      badges.appendChild(warn);
    }

    const badgeData = [
      {icon:'fa-microchip', label:'Utilisée', val:formatGi(info.usedBytes), cls:pctClass(info.pct)},
      {icon:'fa-circle', label:'Libre', val:formatGi(info.freeBytes)}
    ];
    badgeData.forEach(b => {
      if (b.val === 'N/A') return;
      const el = document.createElement('div');
      el.className = `badge${b.cls ? ' '+b.cls : ''}`;
      el.innerHTML = `<i class="fa-solid ${b.icon}" aria-hidden="true"></i><span>${b.label} : ${b.val}</span>`;
      badges.appendChild(el);
    });
    container.appendChild(card);
  }
}

function renderDisks(disks){
  const container = document.getElementById('disksContainer');
  container.innerHTML = '';
  if(!Array.isArray(disks) || disks.length === 0){
    container.innerHTML = '<div class="empty">Aucun disque détecté.</div>';
    return;
  }
  const sorted = [...disks].sort((a,b)=>{
    const aPct = parseFloat(a.used_percent) || 0;
    const bPct = parseFloat(b.used_percent) || 0;
    return bPct - aPct;
  });
  sorted.forEach(disk => {
    const totalBytes = parseSizeToBytes(disk.total_bytes ?? disk.size);
    const usedBytes = parseSizeToBytes(disk.used_bytes ?? disk.used);
    const freeBytes = (totalBytes != null && usedBytes != null) ? totalBytes - usedBytes : parseSizeToBytes(disk.free_bytes ?? disk.available);
    let pct = (totalBytes && usedBytes != null) ? (usedBytes / totalBytes) * 100 : null;
    const pctStr = pct != null ? (pct < 10 ? pct.toFixed(1) : Math.round(pct)) : 'N/A';
    const totalStr = formatBytes(totalBytes);
    const usedStr = formatBytes(usedBytes);
    const freeStr = formatBytes(freeBytes);
    const card = document.createElement('div');
    card.className = 'disk-card';
    const barHtml = pct != null ? `
          <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pctStr}">
            <span class="fill ${colorClassDisk(pct)}" style="width:0"></span>
            <span class="value">${pctStr}%</span>
          </div>` : `
          <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100">
            <span class="value">N/A</span>
          </div>`;
    const info = pct != null ? `${usedStr} utilisé / ${totalStr} (${freeStr} libre)` : 'Données incomplètes';
    card.innerHTML = `
      <div class="proc-row">
        <span class="proc-name">${disk.mountpoint} <span class="badge-total">${totalStr}</span></span>
        <div class="proc-bars">${barHtml}</div>
      </div>
      <div class="ram-text">${info}</div>`;
    container.appendChild(card);
    if (pct != null){
      const fill = card.querySelector('.bar .fill');
      const valueEl = card.querySelector('.bar .value');
      requestAnimationFrame(()=>{
        fill.style.width = pct + '%';
        adjustBarValue(valueEl, fill, pct);
      });
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
  if (v < 70) return 'var(--success)';
  if (v < 100) return 'var(--warning)';
  return 'var(--danger)';
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

  if (!loads || !cores) {
    document.getElementById('load1Val').textContent = '—';
    trendEl.textContent = '→';
    trendEl.style.color = '#666';
    path.setAttribute('stroke-dasharray', '0 100');
    renderMini('5', null, null);
    renderMini('15', null, null);
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
}

function renderText(json) {
  const genEl = document.getElementById('generatedValue');
  genEl.textContent = json.generated || '--';
  document.getElementById('hostname').textContent = json.hostname;
  const tz = json.timezone || json.tz;
  const tzBadge = document.getElementById('tzBadge');
  if (tz) { tzBadge.textContent = tz; tzBadge.style.display='inline-block'; } else { tzBadge.style.display='none'; }
  setupCopy('copyGenerated', () => genEl.textContent);

  const upInfo = parseUptime(json.uptime);
  const upEl = document.getElementById('uptimeValue');
  upEl.textContent = upInfo.text;
  setupCopy('copyUptime', () => upEl.textContent);
  const upBadge = document.getElementById('uptimeBadge');
  if (upBadge) {
    upBadge.style.display = 'none';
  }
  const bootTs = json.boot_ts || json.boot_time || null;
  const sinceEl = document.getElementById('uptimeSince');
  if (bootTs) {
    let d = new Date(typeof bootTs === 'number' ? bootTs*1000 : bootTs);
    if (!isNaN(d)) {
      const dateStr = d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}) + ' à ' + d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
      sinceEl.textContent = `depuis ${dateStr}`;
    } else sinceEl.textContent = '';
  } else {
    sinceEl.textContent = '';
  }

  const ipLocal = json.ip_local || null;
  const ipLocalSpan = document.getElementById('ipLocal');
  ipLocalSpan.textContent = ipLocal || 'N/A';
  document.getElementById('ipLocalChip').classList.toggle('na', !ipLocal);
  setupCopy('copyIpLocal', () => ipLocalSpan.textContent);
  const ipPub = json.ip_pub || null;
  const ipPubSpan = document.getElementById('ipPublic');
  ipPubSpan.textContent = ipPub || 'N/A';
  document.getElementById('ipPublicChip').classList.toggle('na', !ipPub);
  setupCopy('copyIpPublic', () => ipPubSpan.textContent);
  const netBadge = document.getElementById('netBadge');
  const netInfo = json.local_net || json.ip_local_net;
  if (netInfo) { netBadge.textContent = netInfo; netBadge.style.display='inline-block'; } else { netBadge.style.display='none'; }
  const ispBadge = document.getElementById('ispBadge');
  const isp = json.ip_pub_asn || json.ip_pub_isp || json.ip_pub_org;
  if (isp) { ispBadge.textContent = isp; ispBadge.style.display='inline-block'; } else { ispBadge.style.display='none'; }

  renderLoadAverage(json.load_average, json.cpu?.cores);
  renderCpuCores(json.cpu?.usage);
  renderMemory(computeMemoryModel(json.memory));
  renderDisks(json.disks);
  renderCpuTemps(json.cpu?.temperatures);

  renderServices(json.services);
  renderPorts(json.ports);
  renderTopProcesses(json.top_cpu, 'topCpu', 'cpu');
  renderTopProcesses(json.top_mem, 'topMem', 'mem');
  renderDocker(json.docker);
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
    populateDay(day);
  });

  document.getElementById('dayYesterday').addEventListener('click', () => {
    const day = new Date(Date.now()-86400000).toISOString().slice(0,10);
    document.getElementById('datePicker').value = day;
    selectedDate = day;
    updateDayButtons();
    populateDay(day);
  });

  document.getElementById('dayCalendar').addEventListener('click', () => {
    const picker = document.getElementById('datePicker');
    picker.showPicker?.();
    picker.focus();
  });

  document.getElementById('datePicker').addEventListener('change', () => {
    selectedDate = document.getElementById('datePicker').value;
    updateDayButtons();
    populateDay(selectedDate);
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


let closeMenu;

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('menuOverlay');
  const toggle = document.getElementById('menuToggle');
  const icon = toggle.querySelector('i');

  closeMenu = () => {
    sidebar.classList.remove('open');
    toggle.classList.remove('open');
    icon.classList.remove('fa-xmark');
    icon.classList.add('fa-bars');
  };

  toggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    icon.classList.toggle('fa-bars', !isOpen);
    icon.classList.toggle('fa-xmark', isOpen);
  });

  overlay.addEventListener('click', closeMenu);
});

document.addEventListener('DOMContentLoaded', init);
