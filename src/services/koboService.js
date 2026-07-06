const axios = require("axios");
const db = require("../config/db");
const BASE_URL = process.env.KOBO_BASE_URL;
const TOKEN = process.env.KOBO_TOKEN;

// 🔵 1. récupérer tous les formulaires (assets)
async function getAssets() {
  const response = await axios.get(`${BASE_URL}/api/v2/assets/`, {
    headers: {
      Authorization: `Token ${TOKEN}`,
    },
  });

  return response.data.results; // 👈 IMPORTANT (plus propre)
}

// 🔵 2. récupérer les données d'un formulaire (en direct chez Kobo)
async function getAssetData(assetUid) {
  const response = await axios.get(
    `${BASE_URL}/api/v2/assets/${assetUid}/data/`,
    {
      headers: {
        Authorization: `Token ${TOKEN}`,
      },
    }
  );

  return response.data; // { count, next, previous, results: [...] }
}

async function getStoredSubmissions(assetUid) {
  const [rows] = await db.execute(
    "SELECT data FROM kobo_submissions WHERE asset_uid = ? ORDER BY submission_id",
    [assetUid]
  );
  return rows.map(row => JSON.parse(row.data));
}

// Enregistrer les réponses KoBo dans MySQL
async function saveSubmissions(assetUid, submissions) {
  const sql = `
    INSERT IGNORE INTO kobo_submissions
    (asset_uid, submission_id, data)
    VALUES (?, ?, ?)
  `;

  for (const submission of submissions) {
    await db.execute(sql, [
      assetUid,
      submission._id,
      JSON.stringify(submission),
    ]);
  }
}

// 🔵 3. lire les soumissions déjà synchronisées depuis la base locale
async function getSubmissionsFromDb(assetUid) {
  const [rows] = await db.execute(
    `SELECT data FROM kobo_submissions WHERE asset_uid = ?`,
    [assetUid]
  );
  return rows.map(row =>
    typeof row.data === "string" ? JSON.parse(row.data) : row.data
  );
}

module.exports = {
  getAssets,
  getAssetData,
  saveSubmissions,
  getSubmissionsFromDb,
  getStoredSubmissions, // 👈 à ajouter
};