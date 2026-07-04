require("dotenv").config();
const axios = require("axios");

const KOBO_TOKEN = process.env.KOBO_TOKEN;
const BASE_URL = "https://kf.kobotoolbox.org/api/v2";

console.log("TOKEN chargé =", KOBO_TOKEN ? "OK" : "MANQUANT");

async function testKobo() {
  try {
    const response = await axios.get(`${BASE_URL}/assets.json`, {
      headers: {
        Authorization: `Token ${KOBO_TOKEN}`,
      },
    });

    console.log("✅ Connexion KoBo réussie !");
    console.log("Nombre de formulaires :", response.data.count);
  } catch (error) {
    console.error("❌ Erreur KoBo API :", error.response?.data || error.message);
  }
}

testKobo();