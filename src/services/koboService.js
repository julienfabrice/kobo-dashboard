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

// 🔵 2. récupérer les données d’un formulaire
async function getAssetData(assetUid) {
  const response = await axios.get(
    `${BASE_URL}/api/v2/assets/${assetUid}/data/`,
    {
      headers: {
        Authorization: `Token ${TOKEN}`,
      },
    }
  );

  return response.data;
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

module.exports = {
  getAssets,
  getAssetData,
  saveSubmissions,
};