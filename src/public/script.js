let currentChart = null;
let currentFieldChart = null;
let assetsCache = [];
let currentSubmissions = [];

// Champs Kobo internes à ignorer dans l'analyse (métadonnées, pas des réponses)
const META_FIELDS = new Set([
  "_id", "_uuid", "_submission_time", "_validation_status", "_notes", "_status",
  "_submitted_by", "_tags", "_geolocation", "_attachments", "_xform_id_string",
  "__version__", "_version_", "meta/instanceID", "formhub/uuid", "start", "end"
]);

// Couleurs de la barre latérale des cards, assignées en tournant sur la liste
const ACCENTS = ["#2F6F4E", "#B9822F", "#3E6E8E", "#A15C3E"];

init();

function init() {
  loadAssets();
  document.getElementById("syncBtn").addEventListener("click", syncData);
  document.getElementById("loadBtn").addEventListener("click", loadData);
  document.getElementById("closePanel").addEventListener("click", closePanel);
  document.getElementById("fieldSelect").addEventListener("change", (e) => {
    renderFieldChart(currentSubmissions, e.target.value);
  });
}

async function loadAssets() {
  const container = document.getElementById("app");
  try {
    const res = await fetch("/assets");
    const data = await res.json();
    assetsCache = data;

    if (!data.length) {
      container.innerHTML = `<p class="empty-state">Aucun formulaire trouvé. Clique sur « Synchroniser » pour aller les chercher sur KoboToolbox.</p>`;
      return;
    }

    renderCards(data);
    populateSelect(data);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="empty-state">Impossible de charger les formulaires. Vérifie que le serveur tourne bien.</p>`;
  }
}

function renderCards(data) {
  const container = document.getElementById("app");
  container.innerHTML = data.map((form, i) => `
    <div class="card" style="--accent:${ACCENTS[i % ACCENTS.length]}">
      <h3>${escapeHtml(form.name)}</h3>
      <span class="uid">${form.uid}</span>
      <button class="btn btn-primary" onclick="viewData('${form.uid}')">Voir données</button>
    </div>
  `).join("");
}

function populateSelect(data) {
  const select = document.getElementById("forms");
  select.innerHTML = data.map(form =>
    `<option value="${form.uid}">${escapeHtml(form.name)}</option>`
  ).join("");
}

async function syncData() {
  const uid = document.getElementById("forms").value;
  if (!uid) return;

  const btn = document.getElementById("syncBtn");
  btn.disabled = true;
  btn.textContent = "Synchronisation…";

  try {
    const res = await fetch(`/assets/${uid}/sync`);
    if (!res.ok) throw new Error("Échec de la synchronisation");
    await loadAssets();
    btn.textContent = "✓ Synchronisé";
  } catch (err) {
    console.error(err);
    btn.textContent = "Échec — réessayer";
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "↻ Synchroniser";
    }, 1500);
  }
}

function loadData() {
  const uid = document.getElementById("forms").value;
  if (!uid) return;
  viewData(uid);
}

async function viewData(uid) {
  try {
    const res = await fetch(`/assets/${uid}/data`);
    const data = await res.json();

    const form = assetsCache.find(f => f.uid === uid);
    document.getElementById("dataPanelTitle").textContent = form ? form.name : uid;

    currentSubmissions = data;

    renderStats(data);
    renderTable(data);
    renderChart(data);
    setupFieldAnalysis(data);

    const panel = document.getElementById("dataPanel");
    panel.classList.remove("hidden");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error(err);
  }
}

function closePanel() {
  document.getElementById("dataPanel").classList.add("hidden");
}

function renderStats(data) {
  const total = data.length;
  const lastDate = data
    .map(d => d._submission_time)
    .filter(Boolean)
    .sort()
    .pop();

  document.getElementById("statsRow").innerHTML = `
    <div class="stat">
      <div class="value">${total}</div>
      <div class="label">Soumissions</div>
    </div>
    <div class="stat">
      <div class="value">${lastDate ? new Date(lastDate).toLocaleDateString("fr-FR") : "—"}</div>
      <div class="label">Dernière soumission</div>
    </div>
  `;
}

function renderTable(data) {
  const head = document.getElementById("tableHead");
  const body = document.getElementById("tableBody");

  if (!data.length) {
    head.innerHTML = "";
    body.innerHTML = `<tr><td>Aucune donnée locale pour ce formulaire — clique sur « Synchroniser » d'abord.</td></tr>`;
    return;
  }

  // On garde les colonnes les plus lisibles, on écarte les champs internes trop verbeux
  const skip = new Set(["_geolocation", "_attachments", "_notes", "_tags", "_validation_status"]);
  const columns = Object.keys(data[0]).filter(k => !skip.has(k)).slice(0, 8);

  head.innerHTML = columns.map(c => `<th>${escapeHtml(c)}</th>`).join("");
  body.innerHTML = data.map(row => `
    <tr>${columns.map(c => `<td>${escapeHtml(formatCell(row[c]))}</td>`).join("")}</tr>
  `).join("");
}

function formatCell(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function renderChart(data) {
  const counts = {};
  data.forEach(row => {
    const date = row._submission_time ? row._submission_time.slice(0, 10) : "Inconnue";
    counts[date] = (counts[date] || 0) + 1;
  });

  const labels = Object.keys(counts).sort();
  const values = labels.map(l => counts[l]);

  if (currentChart) currentChart.destroy();

  const ctx = document.getElementById("chart").getContext("2d");
  currentChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Soumissions par jour",
        data: values,
        backgroundColor: "#2F6F4E",
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

// --- Analyse dynamique des champs (s'adapte à n'importe quel formulaire Kobo) ---

function detectFieldType(data, key) {
  const values = data.map(r => r[key]).filter(v => v !== null && v !== undefined && v !== "");
  if (!values.length) return null;

  const numericCount = values.filter(v => v !== "" && !isNaN(parseFloat(v)) && isFinite(v)).length;
  if (numericCount / values.length > 0.8) return "numeric";

  // Champs texte : on regarde combien de "tokens" distincts existent une fois éclaté sur les espaces
  // (les select_multiple KoboToolbox stockent plusieurs réponses séparées par un espace)
  const tokens = new Set();
  let tooLong = 0;
  values.forEach(v => {
    const str = String(v);
    if (str.length > 60) tooLong++;
    str.split(/\s+/).forEach(t => tokens.add(t));
  });

  if (tooLong / values.length > 0.3) return null; // probablement du texte libre, pas analysable
  if (tokens.size > 30) return null; // trop de valeurs distinctes pour un graphique lisible

  return "categorical";
}

function setupFieldAnalysis(data) {
  const select = document.getElementById("fieldSelect");
  const emptyMsg = document.getElementById("fieldChartEmpty");

  if (!data.length) {
    select.innerHTML = "";
    select.style.display = "none";
    emptyMsg.style.display = "block";
    if (currentFieldChart) { currentFieldChart.destroy(); currentFieldChart = null; }
    return;
  }

  const candidates = Object.keys(data[0])
    .filter(k => !META_FIELDS.has(k))
    .map(k => ({ key: k, type: detectFieldType(data, k) }))
    .filter(f => f.type !== null);

  if (!candidates.length) {
    select.innerHTML = "";
    select.style.display = "none";
    emptyMsg.style.display = "block";
    if (currentFieldChart) { currentFieldChart.destroy(); currentFieldChart = null; }
    return;
  }

  select.style.display = "inline-block";
  emptyMsg.style.display = "none";
  select.innerHTML = candidates.map(f => `<option value="${escapeHtml(f.key)}">${escapeHtml(f.key)}</option>`).join("");

  renderFieldChart(data, candidates[0].key);
}

function renderFieldChart(data, key) {
  const type = detectFieldType(data, key);
  const ctx = document.getElementById("fieldChart").getContext("2d");
  if (currentFieldChart) currentFieldChart.destroy();

  if (type === "numeric") {
    const values = data.map(r => parseFloat(r[key])).filter(v => !isNaN(v));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bins = 8;
    const width = (max - min) / bins || 1;
    const counts = new Array(bins).fill(0);
    values.forEach(v => {
      const idx = Math.min(bins - 1, Math.floor((v - min) / width));
      counts[idx]++;
    });
    const labels = counts.map((_, i) => `${(min + i * width).toFixed(1)}–${(min + (i + 1) * width).toFixed(1)}`);

    currentFieldChart = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ label: key, data: counts, backgroundColor: "#3E6E8E", borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: `Distribution — ${key}` } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  } else {
    // Catégoriel — on éclate sur les espaces pour gérer les select_multiple Kobo
    const counts = {};
    data.forEach(row => {
      const val = row[key];
      if (val === null || val === undefined || val === "") return;
      String(val).split(/\s+/).forEach(token => {
        counts[token] = (counts[token] || 0) + 1;
      });
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);

    currentFieldChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map(([label]) => label),
        datasets: [{ label: key, data: sorted.map(([, v]) => v), backgroundColor: "#B9822F", borderRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: "y",
        plugins: { legend: { display: false }, title: { display: true, text: `Répartition — ${key}` } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}