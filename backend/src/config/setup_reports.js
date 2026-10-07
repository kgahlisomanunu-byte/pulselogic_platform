// backend/src/config/setup_reports.js
// Run this script to setup reports database: node src/config/setup_reports.js

const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function setupReportsDatabase() {
    let connection;
    try {
        console.log('📦 Setting up reports database...\n');

        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'pulselogic_db',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('✅ Connected to database\n');

        // Read schema file
        const schemaPath = path.join(__dirname, 'reports_schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        await connection.query(schema);

        console.log('✅ Reports database schema created successfully!\n');
        console.log('📊 Tables created:');
        console.log('   - departments');
        console.log('   - queue');
        console.log('   - appointments');
        console.log('   - maternity_medications');
        console.log('   - chronic_diseases');
        console.log('   - diagnoses');
        console.log('   - maternity_deliveries');
        console.log('   - maternity_visits');
        console.log('   - maternity_lab_tests');
        console.log('   - sms_queue');
        console.log('   - report_snapshots');
        console.log('   - report_schedules\n');
        console.log('🎉 Setup complete!\n');

    } catch (error) {
        console.error('❌ Setup error:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

setupReportsDatabase();