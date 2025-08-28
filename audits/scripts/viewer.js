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
      renderInfo(data);
      renderServices(data.services || []);
      renderDocker(data.docker || []);
      showStatus("");
    } catch (err) {
      console.error(err);
      showStatus("Impossible de charger les rapports: " + err.message, "error");
    }
  }

  // audits/scripts/main.js
  document.addEventListener("DOMContentLoaded", init);
})();
