const mysql = require('mysql2/promise');

async function test() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'shalom2609',
            database: 'pulselogic_db',
            port: 3306
        });
        console.log('✅ Connection successful!');
        const [rows] = await conn.query('SELECT 1 as test');
        console.log('✅ Query result:', rows);
        await conn.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    }
}

test();
