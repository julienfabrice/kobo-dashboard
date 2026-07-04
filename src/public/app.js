console.log("🔥 FRONT OK");

// Charger formulaires
async function loadForms() {
  const res = await fetch("/assets");
  const data = await res.json();

  console.log("FORMULAIRES:", data);

  const select = document.getElementById("forms");
  select.innerHTML = "";

  data.forEach(f => {
    const option = document.createElement("option");
    option.value = f.uid;
    option.textContent = f.name;
    select.appendChild(option);
  });
}

// Synchroniser + sauvegarder
async function syncData() {
  const uid = document.getElementById("forms").value;

  const res = await fetch(`/assets/${uid}/sync`);
  const data = await res.json();

  console.log("SYNC:", data);

  document.getElementById("status").innerHTML =
    `✅ ${data.message}<br>
     📊 Total KoBo: ${data.totalKoBo}<br>
     💾 Enregistrées: ${data.enregistrees}`;
}

// Charger données pour tableau
async function loadData() {
  const uid = document.getElementById("forms").value;

  const res = await fetch(`/assets/${uid}/data`);
  const data = await res.json();

  console.log("DATA:", data);

  renderTable(data);
  renderChart(data); // 👈 AJOUT IMPORTANT
}

// Tableau
function renderTable(data) {
  const tableHead = document.getElementById("tableHead");
  const tableBody = document.getElementById("tableBody");

  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  const rows = data.results || [];

  if (rows.length === 0) {
    tableBody.innerHTML = "<tr><td>Aucune donnée</td></tr>";
    return;
  }

  const columns = [
    { key: "Nom", alt: ["Nom", "nom"] },
    { key: "Prenom", alt: ["Prenom", "prenom"] },
    { key: "Telephone", alt: ["Telephone", "telephone"] },
    { key: "Date_de_naissance", alt: ["Date_de_naissance", "date_de_naissance"] }
  ];

  // header
  columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col.key;
    tableHead.appendChild(th);
  });

  // rows
  rows.forEach(row => {
    const tr = document.createElement("tr");

    columns.forEach(col => {
      const td = document.createElement("td");

      let value = "";
      for (let k of col.alt) {
        if (row[k] !== undefined) value = row[k];
      }

      td.textContent = value;
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });
}
 function renderChart(data) {
  const rows = data.results || [];

  const ctx = document.getElementById("chart");

  // détruit ancien chart si existe
  if (window.myChart) {
    window.myChart.destroy();
  }

  window.myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Soumissions"],
      datasets: [{
        label: "Total réponses KoBo",
        data: [rows.length],
        backgroundColor: "blue"
      }]
    }
  });
}
// init
loadForms();