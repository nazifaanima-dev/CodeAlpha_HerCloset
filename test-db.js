const pool = require('./config/db');

async function testConnection() {
    try {
        const [rows] = await pool.query('SELECT DATABASE() AS db');
        console.log('MySQL connected successfully!');
        console.log('Database:', rows[0].db);
    } catch (error) {
        console.error('Connection failed:', error.message);
    } finally {
        await pool.end();
    }
}

testConnection();