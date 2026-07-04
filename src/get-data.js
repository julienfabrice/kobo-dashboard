const axios = require("axios");
require("dotenv").config();

const TOKEN = process.env.KOBO_TOKEN;
const BASE_URL = "https://kf.kobotoolbox.org";
const assetUid = "aaMvFod8oGkAmw8iQWVkae";

async function getAssets() {
  try {
    const response = await axios.get(`${BASE_URL}/api/v2/assets/`, {
      headers: {
        Authorization: `Token ${TOKEN}`,
      },
    });

    const assets = response.data.results;

    console.log("\n📌 LISTE DES FORMULAIRES KOBO\n");

    assets.forEach((asset, index) => {
      console.log(`--- FORMULAIRE ${index + 1} ---`);
      console.log("Nom :", asset.name);
      console.log("UID :", asset.uid);
      console.log("---------------------------\n");
    });

  } catch (error) {
    console.error("❌ Erreur :", error.response?.data || error.message);
  }
}

getAssets();