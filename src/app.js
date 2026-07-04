const express = require("express");
require("dotenv").config();
const path = require("path");
const {
  getAssets,
  getAssetData,
  saveSubmissions,
} = require("./services/koboService");

const app = express();

app.get("/assets/:uid/data", async (req, res) => {
  try {
    const data = await getAssetData(req.params.uid);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Erreur data" });
  }
});
app.get("/", (req, res) => {
  res.send("API KoBo OK");
});
app.use(express.static(path.join(__dirname, "public")));
app.get("/assets", async (req, res) => {
  try {
    const data = await getAssets();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Erreur KoBo API" });
  }
});

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

module.exports = app;