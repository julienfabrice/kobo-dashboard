const db = require("./config/db");

async function testConnection() {
  try {
    const connection = await db.getConnection();

    console.log("✅ Connexion MySQL réussie !");

    const [rows] = await connection.query("SELECT NOW() AS dateServeur");

    console.log(rows);

    connection.release();
  } catch (error) {
    console.error("❌ Erreur de connexion :", error.message);
  }
}

testConnection();