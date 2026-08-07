/* ==========================
   CLOCK & DATE
========================== */

const clock = document.getElementById("clockDisplay");
const dateDisplay = document.getElementById("dateDisplay");

function updateClock(){
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const yyyy = now.getFullYear();
    dateDisplay.textContent = `${mm}/${dd}/${yyyy}`;
}

updateClock();
setInterval(updateClock, 1000);

/* ==========================
   SIDEBAR TOGGLE
========================== */

const sidebar = document.getElementById("sidebar");
const toggle = document.getElementById("toggleSidebar");

toggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    document.getElementById("accountSection")?.classList.remove("open");
});

/* ==========================
   ACCOUNT SWITCHER
========================== */

const accounts = [
    { name: "Juan Dela Cruz", role: "LGU Administrator", initials: "JD" },
    { name: "Maria Santos",   role: "Climate Analyst",    initials: "MS" },
    { name: "Ramon Reyes",    role: "Field Coordinator",  initials: "RR" },
];

let currentAccountIndex = 0;

const accountSection = document.getElementById("accountSection");
const accountTrigger = document.getElementById("accountTrigger");
const accountMenu = accountSection.querySelector(".account-menu");
const accountName = document.getElementById("accountName");
const accountRole = document.getElementById("accountRole");
const accountAvatar = document.getElementById("accountAvatar");
const switchAccountBtn = document.getElementById("switchAccountBtn");
const logoutBtn = document.getElementById("logoutBtn");

function renderAccount(){
    const acc = accounts[currentAccountIndex];
    accountName.textContent = acc.name;
    accountRole.textContent = acc.role;
    accountAvatar.textContent = acc.initials;
}

function positionAccountMenu(){
    const rect = accountTrigger.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 210);
    accountMenu.style.width = `${menuWidth}px`;
    accountMenu.style.bottom = `${window.innerHeight - rect.top + 8}px`;

    // Flip to the right of the trigger when the sidebar is collapsed
    // (icon-only rail), otherwise align to the trigger's own width.
    if (sidebar.classList.contains("collapsed")){
        accountMenu.style.left = `${rect.right + 12}px`;
        accountMenu.style.bottom = `${window.innerHeight - rect.bottom}px`;
    } else {
        accountMenu.style.left = `${rect.left}px`;
    }
}

accountTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const opening = !accountSection.classList.contains("open");
    if (opening) positionAccountMenu();
    accountSection.classList.toggle("open", opening);
});

document.addEventListener("click", (e) => {
    if (!accountSection.contains(e.target)){
        accountSection.classList.remove("open");
    }
});

window.addEventListener("resize", () => {
    accountSection.classList.remove("open");
});

switchAccountBtn.addEventListener("click", () => {
    currentAccountIndex = (currentAccountIndex + 1) % accounts.length;
    renderAccount();
    accountSection.classList.remove("open");
});

logoutBtn.addEventListener("click", () => {
    window.location.href = "index.html";
});

renderAccount();

/* ==========================
   VIEW ROUTING
========================== */

const navLinks = document.querySelectorAll("[data-view]");
const views = document.querySelectorAll(".view");
const topbarTitle = document.getElementById("topbarTitle");
const topbarSub = document.getElementById("topbarSub");

function goToView(viewName){
    views.forEach(v => v.classList.remove("active"));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.add("active");

    navLinks.forEach(item => item.classList.remove("active"));
    const link = document.querySelector(`[data-view="${viewName}"]`);
    if (link){
        link.classList.add("active");
        topbarTitle.textContent = link.dataset.title;
        topbarSub.textContent = link.dataset.sub;
    }

    renderChartsFor(viewName);
}

navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        goToView(link.dataset.view);
    });
});

document.querySelectorAll("[data-goto]").forEach(el => {
    el.addEventListener("click", (e) => {
        e.preventDefault();
        goToView(el.dataset.goto);
    });
});

/* ==========================
   SETTINGS — VISUAL-ONLY PICKERS
========================== */

document.querySelectorAll(".theme-options").forEach(group => {
    group.querySelectorAll(".theme-card").forEach(card => {
        card.addEventListener("click", () => {
            group.querySelectorAll(".theme-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
        });
    });
});

document.querySelectorAll(".accent-swatches").forEach(group => {
    group.querySelectorAll(".swatch").forEach(swatch => {
        swatch.addEventListener("click", () => {
            group.querySelectorAll(".swatch").forEach(s => s.classList.remove("active"));
            swatch.classList.add("active");
        });
    });
});

/* ==========================
   MOCK DATA — Quezon City barangays
========================== */

const barangays = [
    { name: "Payatas",              temp: 41.2, canopy: 12, severity: "critical", driver: "Open dump heat retention",     trend: 2.4,  area: 180, canopyChange: -4.1, priority: true  },
    { name: "Batasan Hills",        temp: 38.9, canopy: 16, severity: "high",     driver: "Dense low-rise residential",   trend: 1.6,  area: 210, canopyChange: -2.8, priority: true  },
    { name: "Cubao (Commercial)",   temp: 38.1, canopy: 9,  severity: "high",     driver: "Impervious commercial surface",trend: 1.1,  area: 40,  canopyChange: -1.2, priority: true  },
    { name: "Novaliches Proper",    temp: 36.4, canopy: 21, severity: "moderate", driver: "Recent canopy loss",           trend: 0.8,  area: 260, canopyChange: -3.3, priority: true  },
    { name: "Fairview",             temp: 35.8, canopy: 24, severity: "moderate", driver: "Expanding subdivision",        trend: 0.6,  area: 640, canopyChange: -0.9, priority: false },
    { name: "Commonwealth",         temp: 37.6, canopy: 18, severity: "high",     driver: "Traffic corridor heat",        trend: 1.3,  area: 520, canopyChange: -2.0, priority: true  },
    { name: "Diliman",              temp: 33.1, canopy: 38, severity: "moderate", driver: "Institutional grounds edge",   trend: 0.2,  area: 410, canopyChange: 0.3,  priority: false },
    { name: "Project 6",            temp: 36.9, canopy: 19, severity: "moderate", driver: "Mixed residential density",    trend: 0.9,  area: 150, canopyChange: -1.1, priority: false },
    { name: "Bagong Silangan",      temp: 37.9, canopy: 15, severity: "high",     driver: "Informal settlement density",  trend: 1.4,  area: 190, canopyChange: -3.4, priority: true  },
    { name: "Holy Spirit",          temp: 35.2, canopy: 22, severity: "moderate", driver: "Rooftop heat absorption",      trend: 0.5,  area: 230, canopyChange: -0.7, priority: false },
    { name: "Tandang Sora",         temp: 34.4, canopy: 27, severity: "moderate", driver: "Low canopy along main road",   trend: 0.3,  area: 380, canopyChange: 0.2,  priority: false },
    { name: "UP Campus",            temp: 30.6, canopy: 52, severity: "moderate", driver: "Baseline — high canopy zone",  trend: -0.4, area: 490, canopyChange: 1.1,  priority: false },
    { name: "Kamuning",             temp: 37.1, canopy: 14, severity: "high",     driver: "Dense commercial strip",       trend: 1.0,  area: 60,  canopyChange: -1.8, priority: true  },
    { name: "San Bartolome",        temp: 36.1, canopy: 20, severity: "moderate", driver: "Riverside informal housing",   trend: 0.7,  area: 240, canopyChange: -1.0, priority: false },
    { name: "Sauyo",                temp: 34.9, canopy: 26, severity: "moderate", driver: "Light industrial edge",        trend: 0.4,  area: 300, canopyChange: -0.4, priority: false },
    { name: "Pasong Tamo",          temp: 39.4, canopy: 11, severity: "critical", driver: "Warehouse / logistics zone",   trend: 1.9,  area: 95,  canopyChange: -3.9, priority: true  },
    { name: "Talipapa",             temp: 38.6, canopy: 13, severity: "critical", driver: "Market district, low shade",   trend: 1.7,  area: 70,  canopyChange: -3.1, priority: true  },
];

/* ==========================
   HEAT MAP GRID
========================== */

function tempToColor(t){
    // Map ~28C-42C to a blue -> green -> yellow -> orange -> red scale
    const stops = [
        { t: 28, c: [26, 58, 92]   },
        { t: 32, c: [47, 111, 78]  },
        { t: 35, c: [255, 210, 63] },
        { t: 38, c: [255, 140, 66] },
        { t: 42, c: [255, 45, 85]  },
    ];
    let lo = stops[0], hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++){
        if (t >= stops[i].t && t <= stops[i + 1].t){
            lo = stops[i]; hi = stops[i + 1]; break;
        }
    }
    const range = hi.t - lo.t || 1;
    const f = Math.min(1, Math.max(0, (t - lo.t) / range));
    const c = lo.c.map((v, i) => Math.round(v + (hi.c[i] - v) * f));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function buildHeatmapGrid(){
    const grid = document.getElementById("heatmapGrid");
    if (!grid || grid.dataset.built) return;
    grid.dataset.built = "true";

    // 40 cells, seeded from barangay temps with slight variation for texture
    const cells = 40;
    for (let i = 0; i < cells; i++){
        const source = barangays[i % barangays.length];
        const variation = (Math.sin(i * 12.9) * 1.6);
        const t = Math.max(27, Math.min(42, source.temp + variation));

        const cell = document.createElement("div");
        cell.className = "heatmap-cell";
        cell.style.background = tempToColor(t);

        const tip = document.createElement("div");
        tip.className = "cell-tip";
        tip.textContent = `${source.name} · ${t.toFixed(1)}°C`;
        cell.appendChild(tip);

        grid.appendChild(cell);
    }
}

/* ==========================
   HOTSPOTS TABLE
========================== */

function buildHotspotsTable(){
    const tbody = document.querySelector("#hotspotsTable tbody");
    if (!tbody || tbody.dataset.built) return;
    tbody.dataset.built = "true";

    const sorted = [...barangays].sort((a, b) => b.temp - a.temp);

    sorted.forEach(b => {
        const tr = document.createElement("tr");
        const trendUp = b.trend >= 0;

        tr.innerHTML = `
            <td><strong>${b.name}</strong></td>
            <td>${b.temp.toFixed(1)}°C</td>
            <td><span class="badge ${b.severity}">${b.severity[0].toUpperCase() + b.severity.slice(1)}</span></td>
            <td><span class="trend-cell ${trendUp ? "up" : "down"}">
                <i class="fa-solid fa-arrow-trend-${trendUp ? "up" : "down"}"></i>
                ${trendUp ? "+" : ""}${b.trend.toFixed(1)}°C
            </span></td>
            <td>${b.driver}</td>
            <td>4h ago</td>
        `;
        tbody.appendChild(tr);
    });
}

/* ==========================
   REPORTS TABLE
========================== */

const reports = [
    { title: "Q3 Urban Heat Island Summary",       type: "Quarterly", area: "Quezon City (All Districts)", date: "Aug 1, 2026", status: "ready" },
    { title: "Payatas Priority Zone Deep Dive",     type: "Hotspot Brief", area: "Payatas",                 date: "Jul 28, 2026", status: "ready" },
    { title: "Canopy Loss Assessment 2021–2026",    type: "Canopy",     area: "City-wide",                  date: "Jul 20, 2026", status: "ready" },
    { title: "Mitigation Impact Projection",        type: "Mitigation", area: "6 Priority Barangays",       date: "Aug 5, 2026",  status: "processing" },
    { title: "August Satellite Pass Summary",       type: "Monthly",   area: "Quezon City (All Districts)", date: "Aug 6, 2026",  status: "processing" },
];

function buildReportsTable(){
    const tbody = document.querySelector("#reportsTable tbody");
    if (!tbody || tbody.dataset.built) return;
    tbody.dataset.built = "true";

    reports.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${r.title}</strong></td>
            <td>${r.type}</td>
            <td>${r.area}</td>
            <td>${r.date}</td>
            <td><span class="status-pill ${r.status}">${r.status === "ready" ? "Ready" : "Processing"}</span></td>
            <td><button class="dl-btn" ${r.status !== "ready" ? "disabled style='opacity:.35;cursor:not-allowed'" : ""}>
                <i class="fa-solid fa-download"></i>
            </button></td>
        `;
        tbody.appendChild(tr);
    });
}

/* ==========================
   CHARTS
========================== */

let chartsBuilt = { dashboard: false, canopy: false };
const chartInstances = {};

function chartTheme(){
    return {
        grid: "rgba(255,255,255,.06)",
        text: "#888",
        red: "#ff2d55",
        orange: "#ff8c42",
        green: "#00ff84",
    };
}

function buildDashboardChart(){
    if (chartsBuilt.dashboard) return;
    const el = document.getElementById("dashMiniChart");
    if (!el) return;
    chartsBuilt.dashboard = true;
    const th = chartTheme();

    chartInstances.dash = new Chart(el, {
        type: "scatter",
        data: {
            datasets: [{
                label: "Barangays",
                data: barangays.map(b => ({ x: b.canopy, y: b.temp })),
                backgroundColor: th.red,
                pointRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: "Canopy %", color: th.text }, ticks: { color: th.text }, grid: { color: th.grid } },
                y: { title: { display: true, text: "Temp °C", color: th.text }, ticks: { color: th.text }, grid: { color: th.grid } },
            }
        }
    });
}

function buildCanopyCharts(){
    if (chartsBuilt.canopy) return;
    const barEl = document.getElementById("canopyBarChart");
    const lineEl = document.getElementById("canopyLineChart");
    if (!barEl || !lineEl) return;
    chartsBuilt.canopy = true;
    const th = chartTheme();

    const sorted = [...barangays].sort((a, b) => b.canopy - a.canopy);

    chartInstances.canopyBar = new Chart(barEl, {
        type: "bar",
        data: {
            labels: sorted.map(b => b.name),
            datasets: [{
                label: "Canopy %",
                data: sorted.map(b => b.canopy),
                backgroundColor: sorted.map(b => b.canopy < 18 ? th.red : b.canopy < 28 ? th.orange : th.green),
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: th.text, maxRotation: 60, minRotation: 60, font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { color: th.text }, grid: { color: th.grid } },
            }
        }
    });

    chartInstances.canopyLine = new Chart(lineEl, {
        type: "line",
        data: {
            labels: ["2021", "2022", "2023", "2024", "2025", "2026"],
            datasets: [{
                label: "Canopy %",
                data: [31.2, 30.6, 29.9, 29.8, 29.0, 28.4],
                borderColor: th.red,
                backgroundColor: "rgba(255,45,85,.12)",
                fill: true,
                tension: .35,
                pointRadius: 3,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: th.text }, grid: { display: false } },
                y: { ticks: { color: th.text }, grid: { color: th.grid } },
            }
        }
    });

    const landCoverEl = document.getElementById("landCoverChart");
    if (landCoverEl){
        chartInstances.landCover = new Chart(landCoverEl, {
            type: "doughnut",
            data: {
                labels: ["Tree Canopy", "Impervious Surface", "Open / Green Space", "Water Bodies", "Bare / Under Construction"],
                datasets: [{
                    data: [28.4, 31.2, 21.0, 5.4, 14.0],
                    backgroundColor: [th.green, th.red, "#5aa9ff", "#2f6f9e", th.orange],
                    borderColor: "#0d0d0d",
                    borderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "62%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { color: th.text, boxWidth: 10, font: { size: 10.5 }, padding: 12 }
                    }
                }
            }
        });
    }

    buildPriorityZonesList();
    buildCanopyTable();
}

function buildPriorityZonesList(){
    const list = document.getElementById("priorityZonesList");
    if (!list || list.dataset.built) return;
    list.dataset.built = "true";

    const zones = barangays.filter(b => b.priority).sort((a, b) => a.canopy - b.canopy);

    zones.forEach(b => {
        const row = document.createElement("div");
        row.className = "mini-hotspot";
        row.innerHTML = `
            <div class="mh-info">
                <span class="severity-dot ${b.severity}"></span>
                <div>
                    <strong>${b.name}</strong>
                    <small>${b.driver}</small>
                </div>
            </div>
            <span class="mh-temp ${b.severity}">${b.canopy}% canopy</span>
        `;
        list.appendChild(row);
    });
}

function buildCanopyTable(){
    const tbody = document.querySelector("#canopyTable tbody");
    if (!tbody || tbody.dataset.built) return;
    tbody.dataset.built = "true";

    const sorted = [...barangays].sort((a, b) => a.canopy - b.canopy);

    sorted.forEach(b => {
        const tr = document.createElement("tr");
        const improving = b.canopyChange >= 0;
        const status = b.priority ? "critical" : improving ? "moderate" : "high";
        const statusLabel = b.priority ? "Priority" : improving ? "Improving" : "Stable";

        tr.innerHTML = `
            <td><strong>${b.name}</strong></td>
            <td>${b.canopy}%</td>
            <td>${b.area.toLocaleString()} ha</td>
            <td><span class="trend-cell ${improving ? "down" : "up"}">
                <i class="fa-solid fa-arrow-trend-${improving ? "up" : "down"}"></i>
                ${improving ? "+" : ""}${b.canopyChange.toFixed(1)}%
            </span></td>
            <td><span class="badge ${status}">${statusLabel}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderChartsFor(viewName){
    if (viewName === "dashboard") buildDashboardChart();
    if (viewName === "canopy") buildCanopyCharts();
    if (viewName === "heatmap") buildHeatmapGrid();
    if (viewName === "hotspots") buildHotspotsTable();
    if (viewName === "reports") buildReportsTable();
}

/* ==========================
   INIT
========================== */

buildDashboardChart();