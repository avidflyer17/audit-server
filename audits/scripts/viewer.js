(() => {
  // audits/scripts/modules/services.js
  var SERVICE_CATEGORIES = [
    "Syst\xE8me",
    "R\xE9seau",
    "Stockage/Partages",
    "Conteneurs",
    "S\xE9curit\xE9",
    "Journalisation",
    "Mises \xE0 jour",
    "Autre"
  ];
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
  var servicesData = [];
  var filteredServices = [];
  var activeServiceCats = new Set(SERVICE_CATEGORIES);
  var serviceSearch = "";
  var serviceSort = "az";
  var servicesInit = false;
  function getServiceMeta(name) {
    for (const p of SERVICE_PATTERNS) {
      if (p.regex.test(name))
        return p;
    }
    return { icon: "\u2B1C", category: "Autre" };
  }
  function initServicesUI() {
    if (servicesInit)
      return;
    servicesInit = true;
    const searchInput = document.getElementById("serviceSearch");
    const sortSelect = document.getElementById("serviceSort");
    const filtersDiv = document.getElementById("categoryFilters");
    SERVICE_CATEGORIES.forEach((cat) => {
      const chip = document.createElement("button");
      chip.className = "filter-chip active";
      chip.textContent = cat;
      chip.dataset.cat = cat;
      chip.addEventListener("click", () => {
        if (activeServiceCats.has(cat))
          activeServiceCats.delete(cat);
        else
          activeServiceCats.add(cat);
        chip.classList.toggle("active");
        applyServiceFilters();
      });
      filtersDiv.appendChild(chip);
    });
    searchInput.addEventListener("input", (e) => {
      serviceSearch = e.target.value.toLowerCase();
      applyServiceFilters();
    });
    sortSelect.addEventListener("change", (e) => {
      serviceSort = e.target.value;
      applyServiceFilters();
    });
    document.getElementById("resetFilters").addEventListener("click", () => {
      serviceSearch = "";
      serviceSort = "az";
      activeServiceCats = new Set(SERVICE_CATEGORIES);
      searchInput.value = "";
      sortSelect.value = "az";
      document.querySelectorAll("#categoryFilters .filter-chip").forEach((c) => c.classList.add("active"));
      applyServiceFilters();
    });
  }
  function applyServiceFilters() {
    filteredServices = servicesData.filter(
      (s) => activeServiceCats.has(s.category) && s.name.toLowerCase().includes(serviceSearch)
    );
    if (serviceSort === "az")
      filteredServices.sort((a, b) => a.name.localeCompare(b.name));
    else if (serviceSort === "za")
      filteredServices.sort((a, b) => b.name.localeCompare(a.name));
    else if (serviceSort === "cat")
      filteredServices.sort(
        (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      );
    renderServicesList();
  }
  function renderServicesList() {
    const list = document.getElementById("servicesList");
    list.textContent = "";
    const countSpan = document.getElementById("servicesCount");
    if (filteredServices.length === 0) {
      countSpan.textContent = "0 service";
      document.getElementById("servicesEmpty").classList.remove("hidden");
      return;
    }
    document.getElementById("servicesEmpty").classList.add("hidden");
    const frag = document.createDocumentFragment();
    filteredServices.forEach((s) => {
      const item = document.createElement("div");
      item.className = "service-item";
      item.tabIndex = 0;
      item.title = s.desc;
      item.setAttribute("aria-expanded", "false");
      const main = document.createElement("div");
      main.className = "service-main";
      const iconSpan = document.createElement("span");
      iconSpan.className = "service-icon";
      iconSpan.textContent = s.icon;
      main.appendChild(iconSpan);
      const nameSpan = document.createElement("span");
      nameSpan.className = "service-name";
      nameSpan.textContent = s.name;
      main.appendChild(nameSpan);
      const badgeSpan = document.createElement("span");
      badgeSpan.className = "service-badge cat-" + s.category.toLowerCase().replace(/[\s/]+/g, "-");
      badgeSpan.textContent = s.category;
      main.appendChild(badgeSpan);
      item.appendChild(main);
      const details = document.createElement("div");
      details.className = "service-details";
      const nameDiv = document.createElement("div");
      const strongName = document.createElement("strong");
      strongName.textContent = "Nom de l\u2019unit\xE9 :";
      const code = document.createElement("code");
      code.textContent = s.name;
      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn small";
      copyBtn.title = "Copier le nom";
      copyBtn.textContent = "\u{1F4CB}";
      nameDiv.append(strongName, " ", code, " ", copyBtn);
      details.appendChild(nameDiv);
      const typeDiv = document.createElement("div");
      const strongType = document.createElement("strong");
      strongType.textContent = "Type :";
      typeDiv.append(strongType, " service");
      details.appendChild(typeDiv);
      const descDiv = document.createElement("div");
      const strongDesc = document.createElement("strong");
      strongDesc.textContent = "Description :";
      descDiv.append(strongDesc, " ", s.desc);
      details.appendChild(descDiv);
      item.appendChild(details);
      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(s.name).then(() => alert("Copi\xE9 dans le presse-papiers !"));
      });
      const toggle = () => {
        const expanded = item.classList.toggle("expanded");
        item.setAttribute("aria-expanded", expanded);
      };
      item.addEventListener("click", toggle);
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
      frag.appendChild(item);
    });
    list.appendChild(frag);
    countSpan.textContent = `${filteredServices.length} service${filteredServices.length > 1 ? "s" : ""}`;
  }
  function renderServices(names) {
    initServicesUI();
    servicesData = (names || []).map((n) => {
      const meta = getServiceMeta(n);
      return {
        name: n,
        icon: meta.icon,
        category: meta.category,
        desc: "Service systemd"
      };
    });
    applyServiceFilters();
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
  function setupSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("menuOverlay");
    if (!sidebar || !toggle || !overlay)
      return;
    const close = () => sidebar.classList.remove("open");
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
    overlay.addEventListener("click", close);
  }

  // audits/scripts/modules/docker.js
  var dockerData = [];
  var dockerFiltered = [];
  var dockerFilters = /* @__PURE__ */ new Set(["healthy", "unhealthy", "running", "exited"]);
  var dockerSearch = "";
  var dockerSort = "name";
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
      dockerSearch = e.target.value.toLowerCase();
      applyDockerFilters();
    });
    sortSel.addEventListener("change", (e) => {
      dockerSort = e.target.value;
      applyDockerFilters();
    });
    chips.forEach((ch) => {
      ch.addEventListener("click", () => {
        const f = ch.dataset.filter;
        if (dockerFilters.has(f))
          dockerFilters.delete(f);
        else
          dockerFilters.add(f);
        ch.classList.toggle("active");
        applyDockerFilters();
      });
    });
  }
  function applyDockerFilters() {
    dockerFiltered = dockerData.filter((c) => {
      const status = c.health === "starting" ? "running" : c.health || c.state;
      return dockerFilters.has(status) && c.name.toLowerCase().includes(dockerSearch);
    });
    if (dockerSort === "cpu")
      dockerFiltered.sort((a, b) => b.cpu - a.cpu);
    else if (dockerSort === "ram")
      dockerFiltered.sort((a, b) => b.mem - a.mem);
    else
      dockerFiltered.sort((a, b) => a.name.localeCompare(b.name));
    renderDockerList();
  }
  function renderDockerList() {
    const grid = document.getElementById("dockerGrid");
    grid.textContent = "";
    if (!dockerFiltered.length) {
      document.getElementById("dockerEmpty").classList.remove("hidden");
      return;
    }
    document.getElementById("dockerEmpty").classList.add("hidden");
    const frag = document.createDocumentFragment();
    const updates = [];
    dockerFiltered.forEach((c) => {
      const card = document.createElement("div");
      card.className = "docker-card";
      card.tabIndex = 0;
      const health = c.health ?? "";
      card.title = `CPU ${c.cpu}% \u2014 RAM ${c.mem}%${health ? ` \u2014 Status ${health}` : ""}`;
      const cpuColor = colorClassCpu(c.cpu);
      const ramColor = colorClassRam(c.mem);
      const icon = iconFor(c.name);
      const badge = health ? `<span class="status-badge status-${health}">${health}</span>` : "";
      const memDisplay = c.memText || `${c.mem}%`;
      card.innerHTML = `<div class="docker-head"><div class="docker-title"><span class="docker-icon">${icon}</span><span class="docker-name">${c.name}</span></div>${badge}</div><div class="docker-uptime">${c.uptime}</div><div class="docker-bars"><div class="bar-outer cpu"><div class="fill ${cpuColor}"></div><span class="bar-value">${c.cpu}%</span></div><div class="bar-outer ram"><div class="fill ${ramColor}"></div><span class="bar-value">${memDisplay}</span></div></div>`;
      frag.appendChild(card);
      updates.push({ fills: card.querySelectorAll(".fill"), cpu: c.cpu, mem: c.mem });
    });
    grid.appendChild(frag);
    requestAnimationFrame(() => {
      updates.forEach(({ fills, cpu, mem }) => {
        fills[0].style.width = cpu + "%";
        fills[1].style.width = mem + "%";
      });
    });
  }
  function renderDocker(list) {
    initDockerUI();
    const arr = Array.isArray(list) ? list : list && Array.isArray(list.containers) ? list.containers : [];
    dockerData = arr.map(parseDocker);
    applyDockerFilters();
  }

  // audits/scripts/modules/timeline.js
  var INDEX_REGEX = /^audit_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})\.json$/;
  function parseIndex(list = []) {
    const dedup = /* @__PURE__ */ new Map();
    for (const path of list) {
      const match = INDEX_REGEX.exec(path);
      if (!match)
        continue;
      const date = match[1];
      const time = match[2].replace("-", ":");
      const key = `${date}T${time}`;
      if (dedup.has(key))
        continue;
      const ts = (/* @__PURE__ */ new Date(`${date}T${time}:00`)).getTime();
      dedup.set(key, { date, time, path, ts });
    }
    const entries = Array.from(dedup.values());
    entries.sort((a, b) => b.ts - a.ts);
    return entries;
  }
  function getLatest(entries = []) {
    return entries[0];
  }
  function groupByDay(entries = []) {
    const grouped = /* @__PURE__ */ new Map();
    for (const e of entries) {
      if (!grouped.has(e.date))
        grouped.set(e.date, []);
      grouped.get(e.date).push(e);
    }
    for (const arr of grouped.values()) {
      arr.sort((a, b) => a.ts - b.ts);
    }
    return grouped;
  }

  // audits/scripts/modules/audits.js
  var auditsIndex = [];
  var auditsMap = {};
  var latestEntry = null;
  async function fetchIndex() {
    const res = await fetch("archives/index.json");
    return await res.json();
  }
  async function loadAudit(file) {
    const res = await fetch("archives/" + file);
    if (!res.ok)
      throw new Error("Fichier inaccessible");
    return await res.json();
  }
  function showStatus(message, type) {
    const div = document.getElementById("selectorStatus");
    div.className = type || "";
    div.textContent = message || "";
  }
  async function init() {
    setupSidebar();
    try {
      showStatus("Chargement\u2026", "loading");
      const list = await fetchIndex();
      auditsIndex = list || [];
      const parsed = parseIndex(list);
      auditsMap = Object.fromEntries(groupByDay(parsed));
      latestEntry = getLatest(parsed);
      if (!latestEntry) {
        showStatus("Aucun rapport", "empty");
        return;
      }
      const data = await loadAudit(latestEntry.path);
      renderServices(data.services || []);
      renderDocker(data.docker || []);
      showStatus("");
    } catch (err) {
      showStatus("Impossible de charger les rapports", "error");
    }
  }

  // audits/scripts/main.js
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
