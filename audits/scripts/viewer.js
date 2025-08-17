/* chart instances removed after redesign */

let auditsIndex = [];
let auditsMap = {};
let latestEntry = null;
let currentFile = null;
let selectedDate = null;

const viewerVersion = '1.4.0';
const viewerSchema = 3;

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
  if (val < 85) return 'color-warning';
  return 'color-danger';
}

function parseSizeToBytes(val){
  if (val == null) return null;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const str = String(val).trim().replace(/,/g, '.');
  const m = str.match(/^(\d+(?:\.\d+)?)(?:\s*(B|[KMGT](?:iB?|io?|i|B)?))?$/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (isNaN(num)) return null;
  const unit = (m[2] || 'B').toUpperCase();
  const map = {
    B: 1,
    K: 1024, KB: 1024, KI: 1024, KIB: 1024, KIO: 1024,
    M: 1024 ** 2, MB: 1024 ** 2, MI: 1024 ** 2, MIB: 1024 ** 2, MIO: 1024 ** 2,
    G: 1024 ** 3, GB: 1024 ** 3, GI: 1024 ** 3, GIB: 1024 ** 3, GIO: 1024 ** 3,
    T: 1024 ** 4, TB: 1024 ** 4, TI: 1024 ** 4, TIB: 1024 ** 4, TIO: 1024 ** 4
  };
  const mul = map[unit];
  if (!mul) return null;
  return num * mul;
}

function formatBytes(bytes){
  if (bytes == null || isNaN(bytes)) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1){
    val /= 1024;
    i++;
  }
  const dec = val < 10 && i > 0 ? 1 : 0;
  return val.toFixed(dec) + units[i];
}

function formatBytesFR(bytes){
  if (bytes == null || isNaN(bytes)) return 'N/A';
  let unit = 'Kio';
  let val = bytes / 1024;
  if (bytes >= 1024 ** 3){
    unit = 'Gio';
    val = bytes / 1024 ** 3;
  } else if (bytes >= 1024 ** 2){
    unit = 'Mio';
    val = bytes / 1024 ** 2;
  }
  let decimals = 1;
  if (unit === 'Kio') decimals = val > 999 ? 0 : 1;
  const formatted = val.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return `${formatted} ${unit}`;
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

function formatBootTime(iso){
  if(!iso) return null;
  const d = new Date(iso);
  if(isNaN(d)) return null;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff/60000);
  const days = Math.floor(mins/1440);
  const hours = Math.floor((mins % 1440) / 60);
  let str = '';
  if (days) str += days + 'j ';
  if (hours) str += hours + 'h';
  if (!days && !hours) str += mins + 'min';
  return 'il y a ' + str.trim();
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

const PORT_FILTERS = ['TCP','UDP','Public','Localhost','Docker','System','Unknown','Critique'];
let portsData = [];
let filteredPorts = [];
let activePortFilters = new Set(PORT_FILTERS);
let portSearch = '';
let portSort = 'risk';
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
  if (ip.startsWith('172.17.') || /docker|containerd/i.test(service)) return '📦';
  if (service === 'ssh' || n===22) return '🔒';
  if (service === 'dns' || n===53) return '🧭';
  if (service === 'http' || service === 'https' || n===80 || n===443) return '🌐';
  if (service === 'smb' || n===445 || n===139) return '🗂️';
  if (n===111 || n===2049) return '📡';
  if (service === 'mysql' || n===3306) return '🛢️';
  if (service === 'postgres' || n===5432) return '🐘';
  if (service === 'redis' || n===6379) return '⚡';
  if (service === 'node-exporter' || n===9100) return '📈';
  if (service === 'ntp' || n===123) return '🕒';
  return '❓';
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
  const sensitive = ['ssh','smb','rpcbind'].includes(service) || [22,445,139,111].includes(n) || (service==='Unknown' && n>30000);
  const isPublic = ip==='0.0.0.0' || ip==='*' || ip==='::' || ip==='[::]';
  const isDocker = ip.startsWith('172.17.');
  if (isPublic && sensitive) return 'critical';
  if (isPublic) return 'warning';
  if (isDocker) return 'docker';
  return 'low';
}

function maxRisk(a,b){
  const order={low:0,docker:1,warning:2,critical:3};
  return order[a] >= order[b] ? a : b;
}

function initPortsUI(){
  if (portsInit) return;
  portsInit = true;
  const searchInput = document.getElementById('portSearch');
  const filtersDiv = document.getElementById('portFilters');
  const sortToggle = document.getElementById('portSortToggle');
  const copyAllBtn = document.getElementById('portsCopy');
  PORT_FILTERS.forEach(f => {
    const chip = document.createElement('button');
    chip.className='filter-chip active';
    if (f==='Critique') chip.classList.add('critical-chip');
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
  sortToggle.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      portSort = btn.dataset.sort;
      sortToggle.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      applyPortFilters();
    });
  });
  if (copyAllBtn){
    copyAllBtn.addEventListener('click', ()=>{
      const text = filteredPorts.map(p=>`${p.ip}:${p.port}/${p.proto.toLowerCase()}`).join('\n');
      navigator.clipboard.writeText(text);
    });
  }
  document.getElementById('portsReset').addEventListener('click', ()=>{
    portSearch='';
    portSort='risk';
    activePortFilters=new Set(PORT_FILTERS);
    searchInput.value='';
    sortToggle.querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',i===0);});
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
    if (p.risk === 'critical' && !activePortFilters.has('Critique')) return false;
    const hay = `${p.ip} ${p.port} ${p.service}`.toLowerCase();
    return hay.includes(portSearch);
  });
  renderPortGroups();
}

function updatePortSummary(){
  const totalSpan = document.getElementById('portsTotal');
  totalSpan.textContent = portsData.length;
  const summaryDiv = document.getElementById('portsSummary');
  const crit = portsData.filter(p=>p.risk==='critical').length;
  const warn = portsData.filter(p=>p.risk==='warning').length;
  const low = portsData.filter(p=>p.risk==='low' || p.risk==='docker').length;
  summaryDiv.innerHTML = `
    <div class="summary-item total" title="Total">${portsData.length}</div>
    <div class="summary-item critical" title="Critiques">${crit}</div>
    <div class="summary-item warning" title="Potentiellement exposés">${warn}</div>
    <div class="summary-item low" title="Faible risque / locaux">${low}</div>`;
}

function renderPortGroups(){
  const container = document.getElementById('portsContainer');
  container.innerHTML='';
  updatePortSummary();
  if (filteredPorts.length===0){
    document.getElementById('portsEmpty').classList.remove('hidden');
    return;
  }
  document.getElementById('portsEmpty').classList.add('hidden');

  const byService={};
  filteredPorts.forEach(p=>{ if(!byService[p.service]) byService[p.service]=[]; byService[p.service].push(p); });

  const groups = Object.entries(byService).map(([service,items])=>{
    const byPort={};
    items.forEach(p=>{
      const key=`${p.port}/${p.proto}`;
      if(!byPort[key]) byPort[key]={port:p.port, proto:p.proto, instances:[], badges:p.badges, risk:p.risk};
      byPort[key].instances.push(p);
      byPort[key].badges = Array.from(new Set([...byPort[key].badges, ...p.badges]));
      byPort[key].risk = maxRisk(byPort[key].risk, p.risk);
    });
    const ports=Object.values(byPort).sort((a,b)=>a.port-b.port);
    let gRisk='low';
    ports.forEach(p=>{ gRisk=maxRisk(gRisk,p.risk); });
    const icon=getIcon(service, ports[0]?.port, ports[0]?.proto, items[0].ip);
    return {service, icon, ports, risk:gRisk};
  });

  const order={critical:0,warning:1,docker:2,low:3};
  if (portSort==='risk') groups.sort((a,b)=>order[a.risk]-order[b.risk]);
  else groups.sort((a,b)=>a.ports[0].port-b.ports[0].port);

  groups.forEach(g=>{
    const groupDiv=document.createElement('div');
    groupDiv.className='service-group';
    if (g.ports.length>6) groupDiv.classList.add('collapsed');
    const header=document.createElement('button');
    header.className='service-header';
    header.innerHTML=`<span class="icon">${g.icon}</span><span class="title">${g.service}</span><span class="count">${g.ports.length}</span>`;
    header.addEventListener('click',()=>groupDiv.classList.toggle('collapsed'));
    groupDiv.appendChild(header);
    const body=document.createElement('div');
    body.className='service-body';
    g.ports.forEach(p=>{
      const item=document.createElement('div');
      item.className=`port-item ${p.risk}`;
      const badgesHtml=p.badges.map(b=>`<span class="badge">${b}</span>`).join('');
      const inst=p.instances.length>1?`<span class="instances" title="${p.instances.map(i=>i.ip).join(', ')}">x${p.instances.length} instances</span>`:'';
      item.innerHTML=`<span class="port-label">:${p.port}/${p.proto.toLowerCase()}</span><span class="badges">${badgesHtml}</span>${inst}<button class="copy-btn small" title="Copier">📋</button>`;
      item.querySelector('.copy-btn').addEventListener('click',e=>{e.stopPropagation();navigator.clipboard.writeText(`${p.instances[0].ip}:${p.port}/${p.proto.toLowerCase()}`);});
      body.appendChild(item);
    });
    groupDiv.appendChild(body);
    container.appendChild(groupDiv);
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
  const totalSpan = document.getElementById('dockerTotal');
  totalSpan.textContent = dockerData.length;
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
    checkCompatibility(json);
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

let updateTimer;

function showNotification({ title, message, icon = 'ℹ️', duration = 6000, type = '' }) {
  const badge = document.getElementById('updateBadge');
  if (!badge) return;
  badge.className = 'update-badge';
  if (type) badge.classList.add(type);
  badge.querySelector('.icon').textContent = icon;
  badge.querySelector('.title').textContent = title;
  badge.querySelector('.message').textContent = message;
  badge.classList.add('show');
  clearTimeout(updateTimer);
  const hide = () => {
    badge.classList.remove('show');
    badge.removeEventListener('click', hide);
  };
  badge.addEventListener('click', hide);
  updateTimer = setTimeout(hide, duration);
}

function showUpdateBadge() {
  showNotification({
    title: 'Nouveau rapport disponible',
    message: 'Il a été chargé automatiquement',
    icon: '📄',
    duration: 30000,
  });
}

function semverLt(a, b) {
  const pa = String(a || '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return true;
    if (pa[i] > pb[i]) return false;
  }
  return false;
}

function checkCompatibility(json) {
  const rv = json.report_version;
  const sv = json.schema_version;
  const reportOld = !rv || semverLt(rv, viewerVersion);
  const schemaOld = sv == null || sv < viewerSchema;
  if (reportOld || schemaOld) {
    const details = `Rapport v${rv || 'N/A'} · UI v${viewerVersion}`;
    showNotification({
      title: 'Rapport ancien',
      message:
        'Ce rapport a été généré avec une ancienne version. Certaines informations peuvent être absentes. ' +
        details,
      icon: '⚠️',
      type: 'warning',
      duration: 8000,
    });
  }
}

function cleanCpuModel(modelRaw){
  if(!modelRaw) return '';
  const parts = String(modelRaw).split(/\n+/).map(s=>s.replace(/To Be Filled By O\.E\.M\./gi,'').trim()).filter(Boolean);
  const line = parts.pop() || '';
  return line.replace(/\s+/g,' ').replace(/CPU\s*@/i,'@').replace(/\s+GHz/i,' GHz').replace(/\s@/,' @ ').trim();
}

function severityUsage(pct){
  const v = clamp(Math.round(Number(pct)),0,100);
  if (v < 50) return 'cool';
  if (v < 80) return 'warm';
  if (v <= 100) return 'hot';
  return 'critical';
}

function percentOfTjMax(c, tjmax=100){
  return clamp(Math.round((Number(c)/Number(tjmax))*100),0,100);
}

function severityTemp(c, tjmax=100){
  const pct = percentOfTjMax(c, tjmax);
  if (pct < 50) return 'cool';
  if (pct < 80) return 'warm';
  if (pct < 90) return 'hot';
  return 'critical';
}

function summarizeCpu(usageArr=[], tempArr=[], tjmax=100){
  let sumU=0, countU=0, sumT=0, countT=0;
  let maxUsage=-1, maxCore=null, maxTemp=null;
  let minU=Infinity, maxU=-Infinity, minT=Infinity, maxT=-Infinity;
  const len = Math.max(usageArr.length, tempArr.length);
  for(let i=0;i<len;i++){
    const u = usageArr[i]?.usage;
    const t = tempArr[i]?.temp;
    if (typeof u === 'number'){
      const cu = clamp(Math.round(u),0,100);
      sumU += cu; countU++;
      if (cu > maxUsage){ maxUsage = cu; maxCore = i; maxTemp = typeof t==='number'?clamp(t,0,tjmax):null; }
      if (cu < minU) minU = cu; if (cu > maxU) maxU = cu;
    }
    if (typeof t === 'number'){
      const ct = clamp(t,0,tjmax);
      sumT += ct; countT++;
      if (ct < minT) minT = ct; if (ct > maxT) maxT = ct;
    }
  }
  return {
    avgUsage: countU? sumU/countU : null,
    avgTemp: countT? sumT/countT : null,
    max: {core:maxCore, usage:maxUsage, temp:maxTemp},
    spreadTemp: countT? maxT - minT : null,
    spreadUsage: countU? maxU - minU : null
  };
}

function formatPercentFR(n){
  if(n==null || isNaN(n)) return 'N/A';
  return `${Math.round(n).toLocaleString('fr-FR')} %`;
}

function formatTempFR(c){
  if(c==null || isNaN(c)) return 'N/A';
  return `${Number(c).toLocaleString('fr-FR',{minimumFractionDigits:1, maximumFractionDigits:1})} °C`;
}

function classForSeverity(sev){
  switch(sev){
    case 'cool': return 'color-success';
    case 'warm': return 'color-warning';
    case 'hot':
    case 'critical': return 'color-danger';
    default: return '';
  }
}

function renderCpu(cpu){
  const container = document.getElementById('cpuSection');
  container.innerHTML = '';
  if(!cpu){
    container.innerHTML = '<div class="empty">Aucune donnée CPU</div>';
    return;
  }
  const tjmax = Number(cpu.tjmax_celsius) || 100;
  const model = cleanCpuModel(cpu.model);
  const summary = summarizeCpu(cpu.usage||[], cpu.temperatures||[], tjmax);

  const card = document.createElement('article');
  card.className = 'card cpu';
  card.innerHTML = `
    <div class="card-head">
      <div class="summary">
        <div class="badge"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i><span>${formatPercentFR(summary.avgUsage)}</span></div>
        <div class="badge"><i class="fa-solid fa-temperature-three-quarters" aria-hidden="true"></i><span>${formatTempFR(summary.avgTemp)}</span></div>
        <div class="badge"><i class="fa-solid fa-arrow-up" aria-hidden="true"></i><span>${summary.max.core!=null?`Core ${summary.max.core} — ${formatPercentFR(summary.max.usage)} / ${formatTempFR(summary.max.temp)}`:'N/A'}</span></div>
      </div>
      <div class="model">${model} <em class="cores">— ${cpu.cores ?? 'N/A'} cœurs</em></div>
    </div>
    <div class="core-list"></div>`;

  const list = card.querySelector('.core-list');
  const len = Math.max(cpu.cores || 0, cpu.usage?.length || 0, cpu.temperatures?.length || 0);
  for(let i=0;i<len;i++){
    const u = cpu.usage?.[i]?.usage;
    const t = cpu.temperatures?.[i]?.temp;
    let uClamped = null, tClamped = null, uTip='', tTip='';
    if (typeof u === 'number'){
      const orig = Math.round(u);
      uClamped = clamp(orig,0,100);
      if(uClamped !== orig) uTip=' (normalisée)';
    }
    if (typeof t === 'number'){
      const origT = Number(t);
      tClamped = clamp(origT,0,tjmax);
      if(tClamped !== origT) tTip=' (normalisée)';
    }
    const pctT = tClamped!=null? percentOfTjMax(tClamped, tjmax):null;
    const usageText = uClamped!=null? formatPercentFR(uClamped):'N/A';
    const tempText = tClamped!=null? formatTempFR(tClamped):'N/A';

    const barU = document.createElement('div');
    barU.className = 'bar bar-usage';
    barU.setAttribute('role','progressbar');
    barU.setAttribute('aria-valuemin','0');
    barU.setAttribute('aria-valuemax','100');
    barU.setAttribute('aria-valuenow',uClamped ?? 0);
    barU.setAttribute('aria-label',`Core ${i} — ${usageText} d’utilisation`);
    barU.title = `Core ${i} — ${usageText} d’utilisation${uTip}`;
    barU.innerHTML = `<span class="fill ${classForSeverity(severityUsage(uClamped ?? 0))}" style="width:0"></span><span class="value">${usageText}</span>`;

    const barT = document.createElement('div');
    barT.className = 'bar bar-temp';
    barT.setAttribute('role','progressbar');
    barT.setAttribute('aria-valuemin','0');
    barT.setAttribute('aria-valuemax','100');
    barT.setAttribute('aria-valuenow',pctT ?? 0);
    const pctText = pctT!=null?` (${pctT} % de TjMax)`:'';
    barT.setAttribute('aria-label',`Core ${i} — ${tempText}${pctText}`);
    barT.title = `Core ${i} — ${tempText}${pctText}${tTip}`;
    barT.innerHTML = `<span class="fill ${classForSeverity(severityTemp(tClamped ?? 0, tjmax))}" style="width:0"></span><span class="value">${tempText}</span>`;

    const row = document.createElement('div');
    row.className = 'proc-row';
    row.innerHTML = `<span class="proc-icon">🔥</span><span class="proc-name">Core ${i}</span>`;
    const bars = document.createElement('div');
    bars.className = 'core-bars';
    bars.appendChild(barU);
    bars.appendChild(barT);
    row.appendChild(bars);
    if (severityTemp(tClamped ?? 0, tjmax) === 'critical'){
      const warn = document.createElement('span');
      warn.className = 'badge danger crit-badge';
      warn.textContent = '⚠️';
      row.appendChild(warn);
    }
    list.appendChild(row);

    const fillU = barU.querySelector('.fill');
    const valU = barU.querySelector('.value');
    if (uClamped!=null){
      requestAnimationFrame(()=>{ fillU.style.width = uClamped + '%'; adjustBarValue(valU, fillU, uClamped); });
    } else {
      fillU.style.width = '100%';
      fillU.style.background = 'var(--bg-muted)';
    }
    const fillT = barT.querySelector('.fill');
    const valT = barT.querySelector('.value');
    if (pctT!=null){
      requestAnimationFrame(()=>{ fillT.style.width = pctT + '%'; adjustBarValue(valT, fillT, pctT); });
    } else {
      fillT.style.width = '100%';
      fillT.style.background = 'var(--bg-muted)';
    }
  }

  container.appendChild(card);
}

console.assert(percentOfTjMax(73,100) === 73, 'percentOfTjMax');
console.assert(formatTempFR(73) === '73,0 °C', 'formatTempFR', formatTempFR(73));
const __cpuTest = summarizeCpu(
  [{core:0,usage:6},{core:1,usage:12},{core:2,usage:17},{core:3,usage:23}],
  [{core:0,temp:73},{core:1,temp:73},{core:2,temp:73},{core:3,temp:73}],
  100
);
console.assert(Math.round(__cpuTest.avgUsage) === 15, 'avgUsage', __cpuTest.avgUsage);

function clamp(val, min, max){
  return Math.min(Math.max(val, min), max);
}

function computeRamUsage(ram){
  if (!ram) return null;
  const total = parseSizeToBytes(ram.total);
  const available = parseSizeToBytes(ram.available);
  let usedApps = (total != null && available != null) ? Math.max(0, total - available) : null;
  if (usedApps == null) {
    const used = parseSizeToBytes(ram.used);
    if (used != null && total != null) usedApps = used;
  }
  const percent = (usedApps != null && total) ? clamp(Math.round((usedApps / total) * 100), 0, 100) : null;
  const cache = parseSizeToBytes(ram.buff_cache);
  const free = parseSizeToBytes(ram.free);
  const shared = parseSizeToBytes(ram.shared);
  const segUsed = (usedApps != null && total) ? (usedApps / total) * 100 : 0;
  const segCache = (cache != null && total) ? (cache / total) * 100 : 0;
  const segFree = (free != null && total) ? (free / total) * 100 : 0;
  return {
    totalBytes: total,
    usedAppsBytes: usedApps,
    cacheBytes: cache,
    freeBytes: free,
    availableBytes: available,
    sharedBytes: shared,
    percent,
    seg: { usedPct: segUsed, cachePct: segCache, freePct: segFree }
  };
}

function computeSwapUsage(swap){
  if (!swap) return null;
  let total = parseSizeToBytes(swap.total);
  let used = parseSizeToBytes(swap.used);
  let free = parseSizeToBytes(swap.free);
  // Si les valeurs semblent incohérentes (ex. total < used),
  // on suppose que total et used ont été inversés dans la source.
  if (total != null && used != null && used > total && (free == null || free <= total)) {
    [total, used] = [used, total];
  }
  // Déduire les valeurs manquantes ou recalculer si nécessaire
  if (total != null && free != null) {
    used = Math.max(0, total - free);
  } else if (free == null && total != null && used != null) {
    free = Math.max(0, total - used);
  }
  const percent = (used != null && total) ? clamp(Math.round((used / total) * 100), 0, 100) : null;
  const segUsed = (used != null && total) ? (used / total) * 100 : 0;
  const segFree = (free != null && total) ? (free / total) * 100 : 0;
  return { totalBytes: total, usedBytes: used, freeBytes: free, percent, seg: { usedPct: segUsed, freePct: segFree } };
}

function computeMemoryModel(memory){
  if (!memory) return null;
  return {
    ram: computeRamUsage(memory.ram),
    swap: computeSwapUsage(memory.swap)
  };
}

// basic tests for memory computations and formatting
(function(){
  const sample = {
    memory: {
      ram: {
        total: '15Gi',
        used: '5,6Gi',
        free: '258Mi',
        shared: '120Mi',
        buff_cache: '9Gi',
        available: '9,8Gi'
      },
      swap: {
        total: '4,0Gi',
        used: '512Ki',
        free: '4,0Gi'
      }
    }
  };
  const ram = computeRamUsage(sample.memory.ram);
  console.assert(ram.percent >= 34 && ram.percent <= 35, 'RAM % incorrect', ram.percent);
  const swap = computeSwapUsage(sample.memory.swap);
  console.assert(swap.percent === 0 || swap.percent === 1, 'Swap % incorrect', swap.percent);
  console.assert(formatBytesFR(ram.usedAppsBytes) === '5,2 Gio', 'Format Gio incorrect', formatBytesFR(ram.usedAppsBytes));
  console.assert(formatBytesFR(parseSizeToBytes(sample.memory.swap.used)).includes('Kio'), 'Format Kio attendu');
})();

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
        <div class="title">RAM</div>
      </div>
      <div class="bar mem-bar" role="progressbar" aria-label="Utilisation RAM" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${info.percent ?? 0}"></div>
      <div class="badge-row"></div>`;
    const bar = card.querySelector('.bar');
    const badges = card.querySelector('.badge-row');

    const seg = document.createElement('div');
    seg.className = `seg seg-used ${pctClass(info.percent)}`;
    const pctRam = info.percent ?? 0;
    const pctRamWidth = pctRam > 0 && pctRam < 1 ? 1 : pctRam;
    seg.style.width = pctRamWidth + '%';
    const tip = `Utilisée : ${formatBytesFR(info.usedAppsBytes)} (${info.percent ?? 0} %)`;
    seg.title = tip;
    seg.setAttribute('aria-label', tip);
    bar.appendChild(seg);
    const label = document.createElement('div');
    label.className = 'bar-label';
    label.textContent = `${info.percent ?? 'N/A'}%`;
    bar.appendChild(label);

    const items = [
      {icon:'fa-database', label:'Total', val:info.totalBytes, cls:'total'},
      {icon:'fa-microchip', label:'Utilisée', val:info.usedAppsBytes, cls:pctClass(info.percent), tip:'Mémoire utilisée par les applications'},
      {icon:'fa-circle', label:'Libre', val:info.freeBytes, tip:'Mémoire libre'},
      {icon:'fa-layer-group', label:'Cache/buffers', val:info.cacheBytes, tip:'Mémoire cache et buffers'},
      {icon:'fa-check', label:'Disponible', val:info.availableBytes, tip:'Mémoire immédiatement disponible'},
      {icon:'fa-share-nodes', label:'Partagée', val:info.sharedBytes, tip:'Mémoire partagée'}
    ];
    items.forEach(b => {
      if (b.val == null) return;
      const el = document.createElement('div');
      el.className = `badge${b.cls ? ' '+b.cls : ''}`;
      const formatted = formatBytesFR(b.val);
      el.innerHTML = `<i class="fa-solid ${b.icon}" aria-hidden="true"></i><span>${b.label} : ${formatted}</span>`;
      el.title = `${b.label} : ${formatted}`;
      el.setAttribute('aria-label', `${b.label} : ${formatted}`);
      badges.appendChild(el);
    });
    container.appendChild(card);
  } else {
    const msg = document.createElement('div');
    msg.className = 'no-data';
    msg.textContent = 'Donnée RAM indisponible';
    container.appendChild(msg);
  }

  if (model.swap && model.swap.totalBytes != null){
    const info = model.swap;
    const card = document.createElement('article');
    card.className = 'card swap';
    card.innerHTML = `
      <div class="card-head">
        <div class="title">Swap</div>
      </div>
      <div class="bar mem-bar" role="progressbar" aria-label="Utilisation Swap" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${info.percent ?? 0}"></div>
      <div class="badge-row"></div>`;
    const bar = card.querySelector('.bar');
    const badges = card.querySelector('.badge-row');

    const seg = document.createElement('div');
    seg.className = `seg seg-used ${pctClass(info.percent ?? 0)}`;
    const pctSwap = info.percent ?? 0;
    const pctSwapWidth = pctSwap > 0 && pctSwap < 1 ? 1 : pctSwap;
    seg.style.width = pctSwapWidth + '%';
    const tip = `Utilisée : ${formatBytesFR(info.usedBytes)} (${info.percent ?? 0} %)`;
    seg.title = tip;
    seg.setAttribute('aria-label', tip);
    bar.appendChild(seg);
    const label = document.createElement('div');
    label.className = 'bar-label';
    label.textContent = `${info.percent ?? 0}%`;
    bar.appendChild(label);

    const items = [
      {icon:'fa-database', label:'Total', val:info.totalBytes, cls:'total'},
      {icon:'fa-microchip', label:'Utilisée', val:info.usedBytes, cls:pctClass(info.percent ?? 0)},
      {icon:'fa-circle', label:'Libre', val:info.freeBytes}
    ];
    items.forEach(b => {
      if (b.val == null) return;
      const el = document.createElement('div');
      el.className = `badge${b.cls ? ' '+b.cls : ''}`;
      const formatted = formatBytesFR(b.val);
      el.innerHTML = `<i class="fa-solid ${b.icon}" aria-hidden="true"></i><span>${b.label} : ${formatted}</span>`;
      el.title = `${b.label} : ${formatted}`;
      el.setAttribute('aria-label', `${b.label} : ${formatted}`);
      badges.appendChild(el);
    });
    container.appendChild(card);
  } else {
    const msg = document.createElement('div');
    msg.className = 'no-data';
    msg.textContent = 'Donnée Swap indisponible';
    container.appendChild(msg);
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
    const pctRaw = parseFloat(String(disk.used_percent).replace('%','')) || 0;
    const pctDisplay = Math.round(pctRaw);
    const pctArc = Math.max(pctRaw, 1);
    const totalStr = disk.size || '';
    const usedStr = disk.used || '';
    const freeStr = disk.available || '';
    const card = document.createElement('div');
    card.className = 'disk-card';
    card.tabIndex = 0;
    const aria = `Disque ${disk.mountpoint} : ${pctDisplay}% utilisés, ${usedStr} utilisés, ${freeStr} libres, total ${totalStr}`;
    card.innerHTML = `
      <svg class="disk-donut" viewBox="0 0 40 40" role="img" aria-label="${aria}">
        <circle class="donut-bg" cx="20" cy="20" r="16"></circle>
        <circle class="donut-ring ${colorClassDisk(pctRaw)}" cx="20" cy="20" r="16" stroke-dasharray="0 100"></circle>
        <text x="20" y="20" class="donut-value">${pctDisplay}%</text>
      </svg>
      <div class="disk-info">
        <span>${usedStr} utilisés</span>
        <span>${freeStr} libres</span>
      </div>
      <div class="disk-badges">
        <span class="badge">${disk.mountpoint}</span>
        <span class="badge">${totalStr}</span>
      </div>
      <div class="disk-tooltip">${usedStr} utilisés • ${freeStr} libres • Total ${totalStr}</div>`;
    container.appendChild(card);
    const ring = card.querySelector('.donut-ring');
    requestAnimationFrame(()=>{
      ring.setAttribute('stroke-dasharray', `${pctArc} 100`);
    });
    const tip = card.querySelector('.disk-tooltip');
    ring.addEventListener('mouseenter', () => {
      card.classList.add('show-tooltip');
    });
    ring.addEventListener('mouseleave', () => {
      card.classList.remove('show-tooltip');
    });
    ring.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      let left = e.clientX - rect.left + 8;
      let top = e.clientY - rect.top - tip.offsetHeight - 8;
      const maxLeft = rect.width - tip.offsetWidth - 4;
      if (left > maxLeft) left = maxLeft;
      if (left < 4) left = 4;
      if (top < 4) top = e.clientY - rect.top + 8;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    });
    card.addEventListener('click', () => {
      const txt = `mountpoint=${disk.mountpoint} • used=${usedStr} • free=${freeStr} • total=${totalStr} • ${pctDisplay}%`;
      navigator.clipboard?.writeText(txt);
    });
  });
}

function renderOs(os){
  const container = document.getElementById('osContent');
  container.textContent = '';
  if(!os || Object.keys(os).length === 0){
    const div = document.createElement('div');
    div.className = 'empty';
    div.textContent = 'Non disponible dans ce rapport';
    container.appendChild(div);
    return;
  }
  const items = [];
  if(os.name || os.version){
    items.push({icon:'fa-brands fa-linux', label:'Distribution', value:[os.name, os.version].filter(Boolean).join(' ')});
  }
  if(os.codename){
    items.push({icon:'fa-solid fa-tag', label:'Nom de code', value:os.codename});
  }
  if(os.kernel){
    items.push({icon:'fa-solid fa-terminal', label:'Kernel', value:os.kernel});
  }
  if(os.architecture){
    items.push({icon:'fa-solid fa-microchip', label:'Architecture', value:os.architecture});
  }
  if(os.kernel_boot_time){
    const rel = formatBootTime(os.kernel_boot_time);
    if(rel) items.push({icon:'fa-regular fa-clock', label:'Démarrage du noyau', value:rel, title:os.kernel_boot_time});
  }
  if(items.length === 0){
    const div = document.createElement('div');
    div.className = 'empty';
    div.textContent = 'Non disponible dans ce rapport';
    container.appendChild(div);
    return;
  }
  items.forEach((it)=>{
    const row = document.createElement('div');
    row.className = 'os-item';
    const label = document.createElement('span');
    label.className = 'os-label';
    label.innerHTML = `<i class="${it.icon}" aria-hidden="true"></i> ${it.label}`;
    const val = document.createElement('span');
    val.textContent = it.value;
    if(it.title) val.title = it.title;
    row.append(label, val);
    container.appendChild(row);
  });
}

function parseLoadAvgFR(str) {
  // Parse string "0,21,0,22,0,21" or "0.22,0.25,0.31" -> [0.21, 0.22, 0.21]
  if (typeof str !== 'string') return null;
  const matches = str.match(/\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length < 3) return null;
  return matches.slice(0, 3).map(v => parseFloat(v.replace(',', '.')));
}

function normaliseByCores(load, cores) {
  // Convert a load value into percentage of total cores, capped at 100
  if (load == null || !cores) return null;
  return Math.min((load / cores) * 100, 100);
}

function statusFromRatio(ratio) {
  // Map load/cores ratio to status & theme color
  if (ratio < 0.7) return { label: 'Faible', cls: 'success', color: 'var(--success)' };
  if (ratio < 1.0) return { label: 'Élevée', cls: 'warning', color: 'var(--warning)' };
  return { label: 'Critique', cls: 'danger', color: 'var(--danger)' };
}

function trendFrom(l1, l5) {
  // Compare current vs previous load to detect trend
  if (l1 > l5) return { icon: 'fa-chevron-up', label: 'en hausse' };
  if (l1 < l5) return { icon: 'fa-chevron-down', label: 'en baisse' };
  return { icon: 'fa-chevron-right', label: 'stable' };
}

function renderMini(label, load, prevLoad, cores) {
  const card = document.getElementById(`load${label}Card`);
  const valEl = document.getElementById(`load${label}Val`);
  const bar = document.getElementById(`load${label}Bar`);
  const fill = document.getElementById(`load${label}Fill`);
  const dot = document.getElementById(`load${label}Dot`);
  const trend = document.getElementById(`load${label}Trend`);
  if (load == null) {
    card.classList.add('na');
    valEl.textContent = '—';
    fill.style.width = '0%';
    fill.className = 'fill';
    trend.innerHTML = 'donnée manquante';
    trend.style.color = 'var(--text-muted)';
    trend.removeAttribute('title');
    trend.removeAttribute('aria-label');
    card.removeAttribute('title');
    card.removeAttribute('aria-label');
    bar.removeAttribute('aria-label');
    bar.removeAttribute('role');
    dot.style.background = 'var(--bg-muted)';
  } else {
    card.classList.remove('na');
    const pct = normaliseByCores(load, cores);
    valEl.textContent = pct.toFixed(0) + '%';
    const status = statusFromRatio(load / cores);
    fill.className = `fill color-${status.cls}`;
    requestAnimationFrame(() => {
      fill.style.width = Math.min(100, pct) + '%';
    });
    dot.style.background = status.color;
    const t = trendFrom(load, prevLoad);
    trend.innerHTML = `<i class="fa-solid ${t.icon}" aria-hidden="true"></i><span>${t.label}</span>`;
    let trendColor = 'var(--text-muted)';
    if (t.icon === 'fa-chevron-up') trendColor = 'var(--success)';
    else if (t.icon === 'fa-chevron-down') trendColor = 'var(--danger)';
    trend.style.color = trendColor;
    trend.setAttribute('aria-label', t.label);
    trend.title = t.label;
    const rawStr = load.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const tip = `${label} min : ${rawStr} / ${cores} cœurs (${pct.toFixed(0)} %)`;
    card.title = tip;
    card.setAttribute('aria-label', tip);
    bar.setAttribute('aria-label', tip);
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', pct.toFixed(0));
  }
}

function renderLoadAverage(raw, cores) {
  const gauge = document.getElementById('loadGauge');
  const path = document.getElementById('loadGaugePath');
  const trendEl = document.getElementById('loadTrend');
  const loads = parseLoadAvgFR(raw);

  if (!loads || !cores) {
    document.getElementById('load1Val').textContent = '—';
    trendEl.className = 'trend fa-solid fa-chevron-right';
    trendEl.setAttribute('aria-label', 'stable');
    trendEl.title = 'stable';
    trendEl.style.color = 'var(--text-muted)';
    path.setAttribute('stroke-dasharray', '0 100');
    gauge.removeAttribute('title');
    gauge.removeAttribute('aria-label');
    renderMini('5', null, null, cores);
    renderMini('15', null, null, cores);
    return;
  }

  const [l1, l5, l15] = loads;
  const pct1 = normaliseByCores(l1, cores);
  const status = statusFromRatio(l1 / cores);
  gauge.style.setProperty('--load-color', status.color);
  requestAnimationFrame(() => {
    path.setAttribute('stroke-dasharray', `${Math.min(100, pct1)} 100`);
  });
  document.getElementById('load1Val').textContent = pct1.toFixed(0) + '%';
  const trendInfo = trendFrom(l1, l5);
  trendEl.className = `trend fa-solid ${trendInfo.icon}`;
  trendEl.setAttribute('aria-label', trendInfo.label);
  trendEl.title = trendInfo.label;
  trendEl.style.color = status.color;
  const l1Str = l1.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const tip = `Charge 1 min : ${l1Str} / ${cores} cœurs (${pct1.toFixed(0)} %)`;
  gauge.title = tip;
  gauge.setAttribute('aria-label', tip);
  renderMini('5', l5, l1, cores);
  renderMini('15', l15, l1, cores);
}

function renderText(json) {
  const genEl = document.getElementById('generatedValue');
  genEl.textContent = json.generated || '--';
  document.getElementById('hostname').textContent = json.hostname;
  const tz = json.timezone || json.tz;
  const tzBadge = document.getElementById('tzBadge');
  if (tz) { tzBadge.textContent = tz; tzBadge.style.display='inline-block'; } else { tzBadge.style.display='none'; }
  const upInfo = parseUptime(json.uptime);
  const upEl = document.getElementById('uptimeValue');
  upEl.textContent = upInfo.text;
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

  renderOs(json.os);

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
    renderCpu(json.cpu);
    renderMemory(computeMemoryModel(json.memory));
    renderDisks(json.disks);

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
