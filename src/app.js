const express = require("express");
require("dotenv").config();
const path = require("path");

const {
  getAssets,
  getAssetData,
  saveSubmissions,
  getStoredSubmissions,
} = require("./services/koboService");

const app = express();

// FRONTEND
app.use(express.static(path.join(__dirname, "public"), {
  index: "index.html"
}));

// ROUTE PRINCIPALE
app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "index.html"));
});

// API test
app.get("/api", (req, res) => {
  res.json({ message: "API KoBo OK" });
});

// KoBo routes

// Liste des formulaires (appelée par le frontend au chargement)
app.get("/assets", async (req, res) => {
  try {
    const data = await getAssets();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur KoBo API" });
  }
});

// Lit les soumissions depuis la base locale (remplie par /sync)
app.get("/assets/:uid/data", async (req, res) => {
  try {
    const submissions = await getStoredSubmissions(req.params.uid);
    res.json(submissions); // tableau, éventuellement vide si pas encore synchronisé
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur data" });
  }
});

// Va chercher les données chez Kobo et les enregistre en local
app.get("/assets/:uid/sync", async (req, res) => {
  try {
    const assetUid = req.params.uid;

    const data = await getAssetData(assetUid);

    await saveSubmissions(assetUid, data.results);

    res.json({
      message: "Synchronisation réussie",
      totalKoBo: data.count,
      enregistrees: data.results.length,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Erreur lors de la synchronisation",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});

module.exports = app;