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
    if (countSpan)
      countSpan.textContent = filteredServices.length;
    if (filteredServices.length === 0) {
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
    const countSpan = document.getElementById("dockerCount");
    if (countSpan)
      countSpan.textContent = dockerFiltered.length;
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
      updates.push({
        fills: card.querySelectorAll(".fill"),
        cpu: c.cpu,
        mem: c.mem
      });
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

  // audits/scripts/modules/render.js
  function initMenu() {
    const toggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("menuOverlay");
    if (!toggle || !sidebar || !overlay)
      return;
    const close = () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    };
    const open = () => {
      sidebar.classList.add("open");
      overlay.classList.add("active");
    };
    toggle.addEventListener("click", () => {
      if (sidebar.classList.contains("open"))
        close();
      else
        open();
    });
    overlay.addEventListener("click", close);
  }
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el)
      el.textContent = val ?? "--";
  }
  function renderMeta(data) {
    if (!data)
      return;
    setText("hostname", data.hostname || "-");
    setText("generatedValue", data.generated || "--");
    setText("ipLocal", data.ip_local || "N/A");
    setText("ipPublic", data.ip_pub || "N/A");
    setText("uptimeValue", data.uptime || "--");
  }
  function renderLoad(avg) {
    const parts = (avg || "").split(",").map((s) => s.trim());
    const [l1, l5, l15] = [parts[0], parts[1], parts[2]];
    setText("load1Val", l1 || "--");
    setText("load5Val", l5 || "--");
    setText("load15Val", l15 || "--");
    const gauge = document.getElementById("loadGaugePath");
    if (gauge && l1) {
      const pct = Math.min(parseFloat(l1) * 10, 100);
      gauge.setAttribute("stroke-dasharray", pct + " 100");
    }
    const fill5 = document.getElementById("load5Fill");
    if (fill5 && l5)
      fill5.style.width = Math.min(parseFloat(l5) * 10, 100) + "%";
    const fill15 = document.getElementById("load15Fill");
    if (fill15 && l15)
      fill15.style.width = Math.min(parseFloat(l15) * 10, 100) + "%";
  }
  function renderCpu(cpu) {
    const section = document.getElementById("cpuSection");
    if (!cpu || !section)
      return;
    section.textContent = "";
    const model = document.createElement("div");
    model.className = "cpu-model";
    model.textContent = (cpu.model || "").trim();
    section.appendChild(model);
    const frag = document.createDocumentFragment();
    (cpu.usage || []).forEach((c) => {
      const div = document.createElement("div");
      div.className = "cpu-core";
      div.textContent = `c${c.core}: ${c.usage}%`;
      frag.appendChild(div);
    });
    section.appendChild(frag);
  }
  function renderMemory(mem) {
    const section = document.getElementById("memorySection");
    if (!section || !mem)
      return;
    section.textContent = "";
    const add = (title, obj) => {
      const div = document.createElement("div");
      div.className = "mem-card";
      if (!obj) {
        div.textContent = `${title}: N/A`;
      } else {
        div.innerHTML = `<strong>${title}</strong> ${obj.used} / ${obj.total}`;
      }
      section.appendChild(div);
    };
    add("RAM", mem.ram);
    add("Swap", mem.swap);
  }
  function renderDisks(disks) {
    const container = document.getElementById("disksContainer");
    if (!container)
      return;
    container.textContent = "";
    (disks || []).forEach((d) => {
      const div = document.createElement("div");
      div.className = "disk-card";
      div.innerHTML = `<strong>${d.mountpoint || d.filesystem}</strong> ${d.used} / ${d.size} (${d.used_percent || ""})`;
      container.appendChild(div);
    });
  }
  function renderTop(list, id, key) {
    const div = document.getElementById(id);
    if (!div)
      return;
    div.textContent = "";
    (list || []).slice(1).forEach((p) => {
      const item = document.createElement("div");
      item.className = "proc-item";
      item.textContent = `${p.cmd} (${p.pid}) - ${p[key]}%`;
      div.appendChild(item);
    });
  }
  function renderTopCpu(list) {
    renderTop(list, "topCpu", "cpu");
  }
  function renderTopMem(list) {
    renderTop(list, "topMem", "mem");
  }
  function renderPorts(list) {
    const body = document.getElementById("portsBody");
    if (!body)
      return;
    body.textContent = "";
    (list || []).forEach((p) => {
      const processes = /* @__PURE__ */ new Set();
      (p.bindings || []).forEach((b) => {
        if (b.process)
          processes.add(b.process);
      });
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${p.port}</td><td>${(p.services || []).join(", ")}</td><td>${p.category || ""}</td><td>${(p.scopes || []).join(", ")}</td><td>${Array.from(processes).join(", ")}</td><td>${(p.bindings || []).length}</td><td>${p.risk?.level || ""}</td>`;
      body.appendChild(tr);
    });
    const count = document.getElementById("portsCount");
    if (count)
      count.textContent = list ? list.length : 0;
  }
  function renderAudit(data) {
    renderMeta(data);
    renderLoad(data.load_average);
    renderCpu(data.cpu);
    renderMemory(data.memory);
    renderDisks(data.disks);
    renderTopCpu(data.top_cpu);
    renderTopMem(data.top_mem);
    renderPorts(data.ports);
  }

  // audits/scripts/modules/audits.js
  var auditsIndex = [];
  var auditsMap = {};
  var latestEntry = null;
  async function fetchIndex() {
    const res = await fetch("/archives/index.json");
    return await res.json();
  }
  async function loadAudit(file) {
    const res = await fetch("/archives/" + file);
    if (!res.ok)
      throw new Error("Fichier inaccessible");
    return await res.json();
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
      const data = await loadAudit(latestEntry.file);
      renderAudit(data);
      renderServices(data.services || []);
      renderDocker(data.docker || []);
      initMenu();
      showStatus("");
    } catch (err) {
      console.error(err);
      showStatus("Impossible de charger les rapports", "error");
    }
  }

  // audits/scripts/main.js
  document.addEventListener("DOMContentLoaded", init);
})();
