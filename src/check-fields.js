require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const [rows] = await connection.query(
      'SELECT data FROM kobo_submissions LIMIT 1;'
    );

    if (rows.length === 0) {
      console.log('Aucune soumission trouvée.');
      return;
    }

    const data = typeof rows[0].data === 'string'
      ? JSON.parse(rows[0].data)
      : rows[0].data;

    console.log('=== TOUS LES CHAMPS ET LEURS VALEURS ===\n');
    for (const [key, value] of Object.entries(data)) {
      console.log(`${key} => ${JSON.stringify(value)}`);
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  } finally {
    await connection.end();
  }
}

checkFields();
