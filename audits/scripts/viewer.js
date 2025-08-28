(() => {
  // audits/scripts/modules/services/config.js
  var SERVICE_PATTERNS = [
    { regex: /docker|containerd/i, icon: "\u{1F433}", category: "Conteneurs" },
    { regex: /ssh/i, icon: "\u{1F510}", category: "S\xE9curit\xE9" },
    { regex: /cron/i, icon: "\u23F1\uFE0F", category: "Syst\xE8me" },
    { regex: /dbus/i, icon: "\u{1F50C}", category: "Syst\xE8me" },
    { regex: /ntp|ntpsec|timesync/i, icon: "\u{1F552}", category: "R\xE9seau" },
    { regex: /rpcbind/i, icon: "\u{1F9ED}", category: "R\xE9seau" },
    { regex: /rpc|nfs/i, icon: "\u{1F4E1}", category: "R\xE9seau" },
    { regex: /smb|smbd|nmbd|cifs/i, icon: "\u{1F5C2}\uFE0F", category: "Stockage/Partages" },
    {
      regex: /systemd-(journald|logind|networkd|resolved|udevd)/i,
      icon: "\u2699\uFE0F",
      category: "Syst\xE8me"
    },
    { regex: /rsyslog/i, icon: "\u{1F4DD}", category: "Journalisation" },
    { regex: /bluetooth/i, icon: "\u{1F4F6}", category: "R\xE9seau" },
    { regex: /unattended-upgrades/i, icon: "\u{1F504}", category: "Mises \xE0 jour" },
    { regex: /thermald/i, icon: "\u{1F321}\uFE0F", category: "Syst\xE8me" }
  ];

  // audits/scripts/modules/services.js
  function getMeta(id = "") {
    for (const p of SERVICE_PATTERNS) {
      if (p.regex.test(id))
        return p;
    }
    return { icon: "\u2699\uFE0F", category: "Autre" };
  }
  var rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  function timeAgo(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()))
      return "";
    const sec = Math.floor((Date.now() - date.getTime()) / 1e3);
    const units = [
      ["year", 31536e3],
      ["month", 2592e3],
      ["week", 604800],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60],
      ["second", 1]
    ];
    for (const [unit, s] of units) {
      if (sec >= s)
        return rtf.format(-Math.floor(sec / s), unit);
    }
    return "";
  }
  function renderServiceCard(svc = {}) {
    const id = svc.id || svc.unit_name || "\u2014";
    const meta = getMeta(id);
    const category = svc.category || meta.category;
    const catClass = "cat-" + category.toLowerCase().replace(/[\s/]+/g, "-");
    const state = (svc.state || "unknown").toLowerCase().replace(/[^a-z-]/g, "-");
    const sinceText = svc.since ? timeAgo(svc.since) : "";
    const unit = svc.unit_name || "\u2014";
    const type = svc.type || "\u2014";
    const desc = svc.description || "\u2014";
    const article = document.createElement("article");
    article.className = "docker-card service-card";
    article.setAttribute("role", "group");
    article.setAttribute("aria-label", id);
    const head = document.createElement("div");
    head.className = "docker-head";
    const titleDiv = document.createElement("div");
    titleDiv.className = "docker-title";
    const iconSpan = document.createElement("span");
    iconSpan.className = "docker-icon";
    iconSpan.textContent = meta.icon;
    const nameH3 = document.createElement("h3");
    nameH3.className = "docker-name";
    nameH3.textContent = id;
    titleDiv.append(iconSpan, nameH3);
    const pill = document.createElement("span");
    pill.className = `status-badge status-${state}`;
    pill.setAttribute("aria-label", state);
    pill.textContent = state;
    head.append(titleDiv, pill);
    article.appendChild(head);
    if (sinceText) {
      const sinceDiv = document.createElement("div");
      sinceDiv.className = "card-subtle";
      sinceDiv.textContent = `since ${sinceText}`;
      article.appendChild(sinceDiv);
    }
    const metaDiv = document.createElement("div");
    metaDiv.className = "card-meta";
    const unitSpan = document.createElement("span");
    unitSpan.className = "meta-item";
    const unitStrong = document.createElement("strong");
    unitStrong.textContent = "Unit\xE9 :";
    unitSpan.append(unitStrong, document.createTextNode(" " + unit));
    const typeSpan = document.createElement("span");
    typeSpan.className = "badge";
    typeSpan.textContent = type;
    const catSpan = document.createElement("span");
    catSpan.className = `badge ${catClass}`;
    catSpan.textContent = category;
    metaDiv.append(unitSpan, typeSpan, catSpan);
    article.appendChild(metaDiv);
    const descP = document.createElement("p");
    descP.className = "card-desc";
    descP.title = desc;
    descP.textContent = desc;
    article.appendChild(descP);
    return article;
  }
  function renderServices(list = []) {
    const grid = document.getElementById("servicesGrid");
    const empty = document.getElementById("servicesEmpty");
    const countSpan = document.getElementById("servicesCount");
    if (!grid || !empty || !countSpan)
      return;
    const normalized = (list || []).map(
      (s) => typeof s === "string" ? { id: s } : s || {}
    );
    const sorted = [...normalized].sort((a, b) => {
      const nameA = a.id ?? a.unit_name ?? "";
      const nameB = b.id ?? b.unit_name ?? "";
      return String(nameA).localeCompare(String(nameB));
    });
    countSpan.textContent = `${sorted.length} service${sorted.length > 1 ? "s" : ""}`;
    if (!sorted.length) {
      grid.textContent = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    grid.textContent = "";
    const frag = document.createDocumentFragment();
    sorted.forEach((svc) => frag.appendChild(renderServiceCard(svc)));
    grid.appendChild(frag);
  }

  // audits/scripts/modules/ui.js
  var ICON_MAP = [
    { regex: /docker|containerd/i, icon: "\u{1F433}" },
    { regex: /nginx|traefik|caddy/i, icon: "\u{1F310}" },
    { regex: /node|nodejs/i, icon: "\u{1F7E9}" },
    { regex: /python|gunicorn|uvicorn/i, icon: "\u{1F40D}" },
    { regex: /java/i, icon: "\u2615" },
    { regex: /redis/i, icon: "\u26A1" },
    { regex: /postgres|postgre/i, icon: "\u{1F418}" },
    { regex: /mysql|mariadb/i, icon: "\u{1F6E2}\uFE0F" },
    { regex: /mongodb/i, icon: "\u{1F343}" },
    { regex: /jellyfin|plex|emby/i, icon: "\u{1F3AC}" },
    { regex: /adguard/i, icon: "\u{1F6E1}\uFE0F" },
    { regex: /crowdsec/i, icon: "\u{1F9F1}" },
    { regex: /zigbee2mqtt|mqtt|mosquitto/i, icon: "\u{1F4F6}" },
    { regex: /ssh|openssh/i, icon: "\u{1F510}" },
    { regex: /smb|samba/i, icon: "\u{1F5C2}\uFE0F" },
    { regex: /prometheus|exporter|grafana/i, icon: "\u{1F4C8}" },
    { regex: /.*/, icon: "\u2699\uFE0F" }
  ];
  function iconFor(name) {
    for (const m of ICON_MAP) {
      if (m.regex.test(name))
        return m.icon;
    }
    return "\u2699\uFE0F";
  }
  function colorClassCpu(v) {
    const val = Number(v);
    if (val < 40)
      return "color-success";
    if (val < 70)
      return "color-warning";
    return "color-danger";
  }
  function colorClassRam(v) {
    const val = Number(v);
    if (val < 40)
      return "color-info";
    if (val < 70)
      return "color-warning";
    return "color-danger";
  }

  // audits/scripts/modules/store.js
  function createListStore({
    data = [],
    filtered = [],
    search = "",
    sort = "",
    filters = /* @__PURE__ */ new Set(),
    filterFunc = () => true,
    sortFunc = () => {
    },
    resetFunc = null
  } = {}) {
    return {
      data,
      filtered,
      search,
      sort,
      filters,
      setData(arr) {
        this.data = arr || [];
        return this.applyFilters();
      },
      setSearch(value) {
        this.search = value.toLowerCase();
        return this.applyFilters();
      },
      setSort(value) {
        this.sort = value;
        return this.applyFilters();
      },
      toggleFilter(val) {
        if (this.filters.has(val))
          this.filters.delete(val);
        else
          this.filters.add(val);
        return this.applyFilters();
      },
      applyFilters() {
        this.filtered = this.data.filter((item) => filterFunc.call(this, item));
        sortFunc.call(this, this.filtered);
        return this.filtered;
      },
      resetFilters() {
        if (typeof resetFunc === "function")
          resetFunc.call(this);
        return this.applyFilters();
      },
      getFiltered() {
        return this.filtered;
      }
    };
  }

  // audits/scripts/modules/docker.js
  var DockerStore = createListStore({
    sort: "name",
    filters: /* @__PURE__ */ new Set(["healthy", "unhealthy", "running", "exited"]),
    filterFunc(c) {
      const status = c.health === "starting" ? "running" : c.health || c.state;
      return this.filters.has(status) && c.name.toLowerCase().includes(this.search);
    },
    sortFunc(list) {
      if (this.sort === "cpu")
        list.sort((a, b) => b.cpu - a.cpu);
      else if (this.sort === "ram")
        list.sort((a, b) => b.mem - a.mem);
      else
        list.sort((a, b) => a.name.localeCompare(b.name));
    }
  });
  var dockerInit = false;
  function formatBytes(b) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let v = b;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return v.toFixed(v < 10 ? 1 : 0) + units[i];
  }
  function parseDocker(item) {
    if (typeof item === "string") {
      const name = item.split(" (")[0];
      const info = item.slice(name.length + 2, -1);
      let state = "running";
      let health = "";
      let uptime = info;
      const m = info.match(/\((healthy|unhealthy|starting)\)/i);
      if (m) {
        health = m[1].toLowerCase();
        uptime = info.replace(/\((healthy|unhealthy|starting)\)/i, "").trim();
      }
      if (/^exited/i.test(info)) {
        state = "exited";
        health = "exited";
      }
      if (!health)
        health = state;
      return { name, state, health, uptime, cpu: 0, mem: 0 };
    }
    const cpu = item.cpu_pct ?? item.cpu;
    const mem = item.mem_pct ?? item.mem;
    let memText = item.mem_text || "";
    if (!memText && item.mem_used_bytes != null) {
      const used = formatBytes(item.mem_used_bytes);
      memText = used;
      if (item.mem_limit_bytes) {
        memText += " / " + formatBytes(item.mem_limit_bytes);
      }
    }
    return {
      name: item.name,
      state: item.state || "running",
      health: item.health || item.state || "running",
      uptime: item.uptime || "",
      cpu: Number(cpu) || 0,
      mem: Number(mem) || 0,
      memText
    };
  }
  function initDockerUI() {
    if (dockerInit)
      return;
    dockerInit = true;
    const search = document.getElementById("dockerSearch");
    const sortSel = document.getElementById("dockerSort");
    const chips = document.querySelectorAll("#dockerFilters .chip");
    search.addEventListener("input", (e) => {
      DockerStore.setSearch(e.target.value);
      renderDockerList();
    });
    sortSel.addEventListener("change", (e) => {
      DockerStore.setSort(e.target.value);
      renderDockerList();
    });
    chips.forEach((ch) => {
      ch.addEventListener("click", () => {
        const f = ch.dataset.filter;
        DockerStore.toggleFilter(f);
        ch.classList.toggle("active");
        renderDockerList();
      });
    });
  }
  function renderDockerList() {
    const list = DockerStore.getFiltered();
    const grid = document.getElementById("dockerGrid");
    grid.textContent = "";
    if (!list.length) {
      document.getElementById("dockerEmpty").classList.remove("hidden");
      return;
    }
    document.getElementById("dockerEmpty").classList.add("hidden");
    const template = document.getElementById("tpl-docker-card");
    const frag = document.createDocumentFragment();
    const updates = [];
    list.forEach((c) => {
      const node = template.content.cloneNode(true);
      const card = node.querySelector(".docker-card");
      const iconSpan = node.querySelector(".docker-icon");
      const nameSpan = node.querySelector(".docker-name");
      const badge = node.querySelector(".status-badge");
      const uptimeDiv = node.querySelector(".docker-uptime");
      const cpuOuter = node.querySelector(".bar-outer.cpu");
      const cpuFill = cpuOuter.querySelector(".fill");
      const cpuValue = cpuOuter.querySelector(".bar-value");
      const ramOuter = node.querySelector(".bar-outer.ram");
      const ramFill = ramOuter.querySelector(".fill");
      const ramValue = ramOuter.querySelector(".bar-value");
      const health = c.health ?? "";
      card.setAttribute(
        "title",
        `CPU ${c.cpu}% \u2014 RAM ${c.mem}%${health ? ` \u2014 Status ${health}` : ""}`
      );
      iconSpan.textContent = iconFor(c.name);
      nameSpan.textContent = c.name;
      uptimeDiv.textContent = c.uptime;
      if (health) {
        badge.textContent = health;
        badge.classList.add(`status-${health}`);
      } else {
        badge.remove();
      }
      const cpuColor = colorClassCpu(c.cpu);
      const ramColor = colorClassRam(c.mem);
      const memDisplay = c.memText || `${c.mem}%`;
      cpuFill.classList.add(cpuColor);
      cpuValue.textContent = `${c.cpu}%`;
      ramFill.classList.add(ramColor);
      ramValue.textContent = memDisplay;
      frag.appendChild(node);
      updates.push({ cpuFill, ramFill, cpu: c.cpu, mem: c.mem });
    });
    grid.appendChild(frag);
    requestAnimationFrame(() => {
      updates.forEach(({ cpuFill, ramFill, cpu, mem }) => {
        cpuFill.style.width = cpu + "%";
        ramFill.style.width = mem + "%";
      });
    });
  }
  function renderDocker(list) {
    initDockerUI();
    const arr = Array.isArray(list) ? list : list && Array.isArray(list.containers) ? list.containers : [];
    const data = arr.map(parseDocker);
    DockerStore.setData(data);
    renderDockerList();
  }

  // ===== Helper functions for core metrics =====
  function parseSizeToBytes(str) {
    if (!str)
      return null;
    const m = String(str).trim().match(/^([0-9]+(?:[.,][0-9]+)?)\s*(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB)?$/i);
    if (!m)
      return null;
    let [, num, unit] = m;
    num = parseFloat(num.replace(',', '.'));
    const map = { b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4 };
    unit = (unit || 'B').toLowerCase();
    return Math.round(num * (map[unit] || 1));
  }
  function formatBytes(bytes) {
    if (bytes == null || isNaN(bytes))
      return 'N/A';
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return n.toLocaleString('fr-FR', { maximumFractionDigits: i ? 1 : 0 }) + ' ' + units[i];
  }
  function pctClass(pct) {
    if (pct == null)
      return '';
    if (pct < 40)
      return 'ok';
    if (pct < 70)
      return 'warn';
    return 'crit';
  }
  function parseLoadAverage(value) {
    if (!value)
      return null;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const one = Number(value.one ?? value['1min'] ?? value['1m']);
      const five = Number(value.five ?? value['5min'] ?? value['5m']);
      const fifteen = Number(value.fifteen ?? value['15min'] ?? value['15m']);
      if ([one, five, fifteen].some((v) => isNaN(v)))
        return null;
      return { one, five, fifteen };
    }
    const parts = String(value).split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3)
      return null;
    const nums = parts.slice(0, 3).map((p) => parseFloat(p.replace(',', '.')));
    if (nums.some((v) => isNaN(v)))
      return null;
    return { one: nums[0], five: nums[1], fifteen: nums[2] };
  }
  function loadToPercent(load, cores) {
    if (load == null || !cores)
      return { pct: null, rawPct: null };
    const rawPct = load / cores * 100;
    const pct = Math.max(0, Math.min(100, rawPct));
    return { pct, rawPct };
  }
  function loadColor(v) {
    if (v == null)
      return 'var(--muted)';
    if (v < 70)
      return 'var(--ok)';
    if (v < 100)
      return 'var(--warn)';
    return 'var(--crit)';
  }
  function arrowFromDiff(d) {
    if (d > 5)
      return 'up';
    if (d < -5)
      return 'down';
    return 'right';
  }
  function renderMini(label, cur, prev) {
    const fill = document.getElementById(`load${label}Fill`);
    const valEl = document.getElementById(`load${label}Val`);
    const trend = document.getElementById(`load${label}Trend`);
    const dot = document.getElementById(`load${label}Dot`);
    if (!cur || cur.pct == null) {
      valEl.textContent = '--';
      fill.style.width = '0%';
      trend.textContent = '--';
      dot && (dot.style.background = 'var(--muted)');
      return;
    }
    const pct = Math.max(0, Math.min(100, cur.pct));
    valEl.textContent = Math.round(pct) + '%';
    fill.style.width = pct + '%';
    const diff = prev && prev.pct != null ? cur.pct - prev.pct : 0;
    const arrow = arrowFromDiff(diff);
    trend.textContent = arrow === 'up' ? '↑' : arrow === 'down' ? '↓' : '→';
    dot && (dot.style.background = loadColor(cur.pct));
  }
  function renderLoadAverage(raw, cores) {
    const loads = parseLoadAverage(raw);
    const path = document.getElementById('loadGaugePath');
    const trendEl = document.getElementById('loadTrend');
    if (!loads || !cores) {
      document.getElementById('load1Val').textContent = '--';
      path.setAttribute('stroke-dasharray', '0 100');
      trendEl.className = 'trend fa-solid fa-chevron-right';
      renderMini('5', null, null);
      renderMini('15', null, null);
      return;
    }
    const one = loadToPercent(loads.one, cores);
    const five = loadToPercent(loads.five, cores);
    const fifteen = loadToPercent(loads.fifteen, cores);
    document.getElementById('load1Val').textContent = one.pct != null ? Math.round(one.pct) + '%' : '--';
    const dash = one.pct != null ? Math.max(0, Math.min(100, one.pct)) : 0;
    path.setAttribute('stroke-dasharray', `${dash} 100`);
    const arrow = arrowFromDiff(one.pct - (five.pct ?? one.pct));
    trendEl.className = `trend fa-solid fa-chevron-${arrow}`;
    renderMini('5', five, one);
    renderMini('15', fifteen, five);
  }
  function renderCpu(cpu) {
    const container = document.getElementById('cpuSection');
    container.innerHTML = '';
    if (!cpu) {
      container.innerHTML = '<div class="empty">Aucune donnée CPU</div>';
      return;
    }
    const card = document.createElement('article');
    card.className = 'card cpu-card';
    const head = document.createElement('div');
    head.className = 'card-head';
    head.innerHTML = `<div class="title"><i class="fa-solid fa-gear" aria-hidden="true"></i><span>CPU</span></div><div class="subtitle">${cpu.model || ''}${cpu.cores ? ' — ' + cpu.cores + ' cœurs' : ''}</div>`;
    card.appendChild(head);
    const list = document.createElement('div');
    list.className = 'core-list';
    const len = Math.max(cpu.usage?.length || 0, cpu.temperatures?.length || 0);
    for (let i = 0; i < len; i++) {
      const usage = cpu.usage?.[i]?.usage;
      const temp = cpu.temperatures?.[i]?.temp;
      const row = document.createElement('div');
      row.className = 'proc-row';
      row.innerHTML = `<span class="proc-name">Core ${cpu.usage?.[i]?.core ?? i}</span>`;
      const bars = document.createElement('div');
      bars.className = 'core-bars';
      const barU = document.createElement('div');
      barU.className = 'bar bar-usage';
      barU.innerHTML = `<span class="fill" style="width:0"></span><span class="value">${usage != null ? usage + '%' : 'N/A'}</span>`;
      barU.setAttribute('role', 'progressbar');
      barU.setAttribute('aria-valuemin', '0');
      barU.setAttribute('aria-valuemax', '100');
      barU.setAttribute('aria-valuenow', usage ?? 0);
      const barT = document.createElement('div');
      barT.className = 'bar bar-temp';
      barT.innerHTML = `<span class="fill" style="width:0"></span><span class="value">${temp != null ? temp + '°C' : 'N/A'}</span>`;
      barT.setAttribute('role', 'progressbar');
      barT.setAttribute('aria-valuemin', '0');
      barT.setAttribute('aria-valuemax', '100');
      barT.setAttribute('aria-valuenow', temp ?? 0);
      bars.append(barU, barT);
      row.appendChild(bars);
      list.appendChild(row);
      const fillU = barU.querySelector('.fill');
      const valU = barU.querySelector('.value');
      const fillT = barT.querySelector('.fill');
      const valT = barT.querySelector('.value');
      if (usage != null) {
        requestAnimationFrame(() => {
          const pct = Math.max(0, Math.min(100, usage));
          fillU.style.width = pct + '%';
          adjustBarValue(valU, fillU, pct);
        });
      }
      if (temp != null) {
        requestAnimationFrame(() => {
          const pct = Math.max(0, Math.min(100, temp));
          fillT.style.width = pct + '%';
          adjustBarValue(valT, fillT, pct);
        });
      }
    }
    card.appendChild(list);
    container.appendChild(card);
  }
  function renderMemory(memory) {
    const container = document.getElementById('memorySection');
    container.innerHTML = '';
    if (!memory) {
      container.innerHTML = '<div class="empty">Aucune donnée mémoire</div>';
      return;
    }
    const ram = memory.ram;
    if (ram) {
      const total = parseSizeToBytes(ram.total);
      const available = parseSizeToBytes(ram.available);
      const cache = parseSizeToBytes(ram.buff_cache);
      const free = parseSizeToBytes(ram.free);
      const used = total != null && available != null ? total - available : null;
      const usedPct = used != null && total ? used / total * 100 : null;
      const cachePct = cache != null && total ? cache / total * 100 : 0;
      const freePct = free != null && total ? free / total * 100 : 0;
      const card = document.createElement('article');
      card.className = 'card ram';
      const cls = pctClass(usedPct);
      card.innerHTML = `<div class="card-head"><div class="title">RAM <span class="badge total">${ram.total}</span></div><div class="percent ${cls}">${usedPct != null ? Math.round(usedPct) : 'N/A'}%</div></div><div class="bar"><div class="seg seg-used ${cls}" style="width:${usedPct || 0}%"><span class="label">Apps</span></div><div class="seg seg-cache" style="width:${cachePct}%"><span class="label">Cache</span></div><div class="seg seg-free" style="width:${freePct}%"><span class="label">Libre</span></div></div>`;
      container.appendChild(card);
    }
    const swap = memory.swap;
    if (swap && swap.total) {
      const total = parseSizeToBytes(swap.total);
      const used = parseSizeToBytes(swap.used);
      const free = parseSizeToBytes(swap.free);
      const usedPct = used != null && total ? used / total * 100 : null;
      const freePct = free != null && total ? free / total * 100 : 0;
      const card = document.createElement('article');
      card.className = 'card swap';
      const cls = pctClass(usedPct);
      card.innerHTML = `<div class="card-head"><div class="title">Swap <span class="badge total">${swap.total}</span></div><div class="percent ${cls}">${usedPct != null ? Math.round(usedPct) : 'N/A'}%</div></div><div class="bar"><div class="seg seg-used ${cls}" style="width:${usedPct || 0}%"><span class="label">Utilisée</span></div><div class="seg seg-free" style="width:${freePct}%"><span class="label">Libre</span></div></div>`;
      container.appendChild(card);
    }
  }
  function colorClassDisk(pct) {
    if (pct < 70)
      return 'color-info';
    if (pct < 90)
      return 'color-warning';
    return 'color-danger';
  }
  function renderDisks(disks) {
    const container = document.getElementById('disksContainer');
    container.innerHTML = '';
    if (!Array.isArray(disks) || !disks.length) {
      container.innerHTML = '<div class="empty">Aucun disque détecté.</div>';
      return;
    }
    disks.forEach((disk) => {
      const pct = parseFloat(disk.used_percent) || 0;
      const card = document.createElement('div');
      card.className = 'disk-card';
      card.innerHTML = `<div class="proc-row"><span class="proc-name">${disk.mountpoint} <span class="badge-total">${disk.size}</span></span><div class="proc-bars"><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span class="fill ${colorClassDisk(pct)}" style="width:0"></span><span class="value">${pct}%</span></div></div></div><div class="ram-text">${disk.used} / ${disk.size} (${disk.available} libre)</div>`;
      container.appendChild(card);
      const fill = card.querySelector('.bar .fill');
      const valueEl = card.querySelector('.bar .value');
      requestAnimationFrame(() => {
        fill.style.width = pct + '%';
        adjustBarValue(valueEl, fill, pct);
      });
    });
  }
  function renderTopProcesses(data, containerId, main) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const items = data?.slice(1, 6) || [];
    if (!items.length) {
      container.innerHTML = '<div class="empty">Aucun processus significatif</div>';
      return;
    }
    let total = 0;
    items.forEach((p) => {
      const cpu = Number(p.cpu);
      const mem = Number(p.mem);
      if (main === 'cpu')
        total += cpu;
      else
        total += mem;
      const row = document.createElement('div');
      row.className = 'proc-row';
      row.tabIndex = 0;
      row.title = `CPU ${cpu}% — RAM ${mem}%`;
      const icon = iconFor(p.cmd);
      row.innerHTML = `<span class="proc-icon">${icon}</span><span class="proc-name">${p.cmd}</span><div class="proc-bars"><div class="bar bar-cpu" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${cpu}"><span class="fill ${colorClassCpu(cpu)}" style="width:0"></span><span class="value">${cpu}%</span></div><div class="bar bar-ram" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${mem}"><span class="fill ${colorClassRam(mem)}" style="width:0"></span><span class="value">${mem}%</span></div></div>`;
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

  // audits/scripts/modules/audits.js
  function renderInfo(data = {}) {
    const hostname = document.getElementById("hostname");
    const generated = document.getElementById("generatedValue");
    const ipLocal = document.getElementById("ipLocal");
    const ipPublic = document.getElementById("ipPublic");
    const uptime = document.getElementById("uptimeValue");
    if (hostname)
      hostname.textContent = data.hostname || "-";
    if (generated)
      generated.textContent = data.generated || "--";
    if (ipLocal)
      ipLocal.textContent = data.ip_local || "N/A";
    if (ipPublic)
      ipPublic.textContent = data.ip_pub || "N/A";
    if (uptime)
      uptime.textContent = data.uptime || "--";
  }
  var auditsIndex = [];
  var auditsMap = {};
  var latestEntry = null;
  async function fetchIndex() {
    const res = await fetch("/archives/index.json");
    if (!res.ok)
      throw new Error(`Index inaccessible (${res.status})`);
    return await res.json();
  }
  async function loadAudit(file) {
    try {
      const res = await fetch("/archives/" + file);
      if (!res.ok)
        throw new Error(`Fichier inaccessible (${res.status})`);
      try {
        return await res.json();
      } catch (err) {
        throw new Error("JSON invalide: " + err.message);
      }
    } catch (err) {
      console.error("loadAudit error:", err);
      throw err;
    }
  }
  function parseIndex(list) {
    auditsIndex = list || [];
    auditsMap = {};
    latestEntry = null;
    auditsIndex.forEach((file) => {
      const match = file.match(/audit_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})\.json/);
      if (!match)
        return;
      const date = match[1];
      const time = match[2].replace("-", ":");
      const iso = /* @__PURE__ */ new Date(`${date}T${time}:00`);
      const entry = { file, time, iso, date };
      if (!auditsMap[date])
        auditsMap[date] = [];
      auditsMap[date].push(entry);
      if (!latestEntry || iso > latestEntry.iso)
        latestEntry = entry;
    });
    Object.keys(auditsMap).forEach(
      (d) => auditsMap[d].sort((a, b) => a.iso - b.iso)
    );
    return auditsMap;
  }
  function fmtDate(d) {
    return d.toISOString().slice(0, 10);
  }
  function toggleSidebar(open) {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar)
      return;
    if (open)
      sidebar.classList.add("open");
    else
      sidebar.classList.remove("open");
  }
  async function loadAndRender(entry) {
    try {
      showStatus("Chargement\u2026", "loading");
      const data = await loadAudit(entry.file);
      renderInfo(data);
      renderLoadAverage(data.load_average, data.cpu?.cores);
      renderCpu(data.cpu);
      renderMemory(data.memory);
      renderDisks(data.disks);
      renderTopProcesses(data.top_cpu, 'topCpu', 'cpu');
      renderTopProcesses(data.top_mem, 'topMem', 'mem');
      renderServices(data.services || []);
      renderDocker(data.docker || []);
      showStatus("");
      const chips = document.querySelectorAll(".time-chip");
      chips.forEach((c) => c.classList.remove("active"));
      const active = Array.from(chips).find((c) => c.textContent === entry.time);
      if (active)
        active.classList.add("active");
    } catch (err) {
      console.error(err);
      showStatus("Impossible de charger le rapport: " + err.message, "error");
    }
  }
  function selectDay(dateStr) {
    const timeline = document.getElementById("timeTimeline");
    if (!timeline)
      return;
    timeline.textContent = "";
    document.querySelectorAll(".day-control .seg").forEach((b) => b.classList.remove("active"));
    const today = fmtDate(/* @__PURE__ */ new Date());
    const y = /* @__PURE__ */ new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = fmtDate(y);
    const btnToday = document.getElementById("dayToday");
    const btnYest = document.getElementById("dayYesterday");
    if (dateStr === today)
      btnToday?.classList.add("active");
    else if (dateStr === yesterday)
      btnYest?.classList.add("active");
    const entries = auditsMap[dateStr] || [];
    if (!entries.length) {
      showStatus("Aucun rapport pour ce jour", "empty");
      return;
    }
    showStatus("");
    entries.forEach((entry) => {
      const btn = document.createElement("button");
      btn.className = "time-chip";
      btn.textContent = entry.time;
      btn.addEventListener("click", () => {
        loadAndRender(entry);
        toggleSidebar(false);
      });
      timeline.appendChild(btn);
    });
  }
  function initNav() {
    const menuToggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("menuOverlay");
    menuToggle?.addEventListener("click", () => toggleSidebar(true));
    overlay?.addEventListener("click", () => toggleSidebar(false));
    const btnLatest = document.getElementById("btnLatest");
    const latestInfo = document.getElementById("latestInfo");
    if (btnLatest && latestEntry) {
      const when = latestEntry.iso.toLocaleString();
      if (latestInfo)
        latestInfo.textContent = when;
      btnLatest.addEventListener("click", () => {
        selectDay(latestEntry.date);
        loadAndRender(latestEntry);
        toggleSidebar(false);
      });
    }
    const dayToday = document.getElementById("dayToday");
    const dayYesterday = document.getElementById("dayYesterday");
    const dayCalendar = document.getElementById("dayCalendar");
    const datePicker = document.getElementById("datePicker");
    const todayStr = fmtDate(/* @__PURE__ */ new Date());
    const y = /* @__PURE__ */ new Date();
    y.setDate(y.getDate() - 1);
    const yesterdayStr = fmtDate(y);
    dayToday?.addEventListener("click", () => selectDay(todayStr));
    dayYesterday?.addEventListener("click", () => selectDay(yesterdayStr));
    dayCalendar?.addEventListener(
      "click",
      () => datePicker?.showPicker ? datePicker.showPicker() : datePicker?.click()
    );
    datePicker?.addEventListener("change", () => selectDay(datePicker.value));
    selectDay(latestEntry.date);
  }
  function showStatus(message, type) {
    const div = document.getElementById("selectorStatus");
    div.className = type || "";
    div.textContent = message || "";
  }
  async function init() {
    try {
      showStatus("Chargement\u2026", "loading");
      const list = await fetchIndex();
      parseIndex(list);
      if (!latestEntry) {
        showStatus("Aucun rapport", "empty");
        return;
      }
      initNav();
      await loadAndRender(latestEntry);
    } catch (err) {
      console.error(err);
      showStatus("Impossible de charger les rapports: " + err.message, "error");
    }
  }

  // audits/scripts/main.js
  document.addEventListener("DOMContentLoaded", init);
})();
