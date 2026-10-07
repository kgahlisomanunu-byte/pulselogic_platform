// backend/src/config/db.js
// =====================================================
// PULSE LOGIC - DATABASE CONFIGURATION
// =====================================================

const mysql = require('mysql2');
require('dotenv').config();

// =====================================================
// DATABASE CONFIGURATION
// =====================================================
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pulselogic_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
};

// Display config (without password for security)
console.log('📋 Database Config:');
console.log(`   Host: ${dbConfig.host}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   Password: ${dbConfig.password ? '✅ Set' : '❌ Not Set'}`);

// =====================================================
// CREATE CONNECTION POOL
// =====================================================
const pool = mysql.createPool(dbConfig);

// Promisify the pool
const promisePool = pool.promise();

// =====================================================
// DATABASE WRAPPER WITH QUERY METHODS
// =====================================================
const db = {
    /**
     * Execute a SELECT query and return rows
     * @param {string} sql - SQL query string
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} - Query results
     */
    query: async (sql, params = []) => {
        try {
            const [rows] = await promisePool.query(sql, params);
            return rows;
        } catch (error) {
            console.error('❌ Database query error:', error);
            console.error('   SQL:', sql);
            console.error('   Params:', params);
            throw error;
        }
    },

    /**
     * Execute an INSERT, UPDATE, DELETE query
     * @param {string} sql - SQL query string
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} - Query result with insertId, affectedRows, etc.
     */
    execute: async (sql, params = []) => {
        try {
            const [result] = await promisePool.execute(sql, params);
            return result;
        } catch (error) {
            console.error('❌ Database execute error:', error);
            console.error('   SQL:', sql);
            console.error('   Params:', params);
            throw error;
        }
    },

    /**
     * Begin a transaction
     * @returns {Promise<void>}
     */
    beginTransaction: async () => {
        const connection = await promisePool.getConnection();
        await connection.beginTransaction();
        return connection;
    },

    /**
     * Commit a transaction
     * @param {Object} connection - Connection object
     * @returns {Promise<void>}
     */
    commit: async (connection) => {
        await connection.commit();
        connection.release();
    },

    /**
     * Rollback a transaction
     * @param {Object} connection - Connection object
     * @returns {Promise<void>}
     */
    rollback: async (connection) => {
        await connection.rollback();
        connection.release();
    },

    /**
     * Get a connection from the pool
     * @returns {Promise<Object>} - Connection object
     */
    getConnection: async () => {
        return await promisePool.getConnection();
    },

    /**
     * Get the raw pool (for advanced use)
     * @returns {Object} - MySQL pool
     */
    getPool: () => {
        return promisePool;
    },

    /**
     * Check if database is connected
     * @returns {Promise<boolean>}
     */
    testConnection: async () => {
        try {
            await db.query('SELECT 1');
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Escape a string for SQL
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    escape: (str) => {
        return pool.escape(str);
    },

    /**
     * Escape an identifier (table/column name)
     * @param {string} str - Identifier to escape
     * @returns {string} - Escaped identifier
     */
    escapeId: (str) => {
        return pool.escapeId(str);
    },

    /**
     * Build WHERE clause from object
     * @param {Object} conditions - Key-value pairs
     * @returns {Object} - { whereClause, values }
     */
    buildWhere: (conditions) => {
        const keys = Object.keys(conditions);
        if (keys.length === 0) {
            return { whereClause: '', values: [] };
        }
        const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
        const values = keys.map(key => conditions[key]);
        return { whereClause, values };
    },

    /**
     * Build SET clause from object
     * @param {Object} data - Key-value pairs
     * @returns {Object} - { setClause, values }
     */
    buildSet: (data) => {
        const keys = Object.keys(data);
        const setClause = keys.map(key => `${key} = ?`).join(', ');
        const values = keys.map(key => data[key]);
        return { setClause, values };
    },

    /**
     * Build INSERT query
     * @param {string} table - Table name
     * @param {Object} data - Data to insert
     * @returns {Object} - { sql, values }
     */
    buildInsert: (table, data) => {
        const keys = Object.keys(data);
        const columns = keys.join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(key => data[key]);
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        return { sql, values };
    },

    /**
     * Build UPDATE query
     * @param {string} table - Table name
     * @param {Object} data - Data to update
     * @param {Object} conditions - WHERE conditions
     * @returns {Object} - { sql, values }
     */
    buildUpdate: (table, data, conditions) => {
        const setResult = db.buildSet(data);
        const whereResult = db.buildWhere(conditions);
        const sql = `UPDATE ${table} SET ${setResult.setClause} WHERE ${whereResult.whereClause}`;
        const values = [...setResult.values, ...whereResult.values];
        return { sql, values };
    },

    /**
     * Build DELETE query
     * @param {string} table - Table name
     * @param {Object} conditions - WHERE conditions
     * @returns {Object} - { sql, values }
     */
    buildDelete: (table, conditions) => {
        const whereResult = db.buildWhere(conditions);
        const sql = `DELETE FROM ${table} WHERE ${whereResult.whereClause}`;
        return { sql, values: whereResult.values };
    },

    /**
     * Build SELECT query
     * @param {string} table - Table name
     * @param {Array} columns - Columns to select
     * @param {Object} conditions - WHERE conditions
     * @param {string} orderBy - ORDER BY clause
     * @param {number} limit - LIMIT number
     * @param {number} offset - OFFSET number
     * @returns {Object} - { sql, values }
     */
    buildSelect: (table, columns = ['*'], conditions = {}, orderBy = '', limit = null, offset = null) => {
        const colStr = columns.join(', ');
        let sql = `SELECT ${colStr} FROM ${table}`;
        const values = [];

        const whereResult = db.buildWhere(conditions);
        if (whereResult.whereClause) {
            sql += ` WHERE ${whereResult.whereClause}`;
            values.push(...whereResult.values);
        }

        if (orderBy) {
            sql += ` ORDER BY ${orderBy}`;
        }

        if (limit !== null) {
            sql += ` LIMIT ${limit}`;
            if (offset !== null) {
                sql += ` OFFSET ${offset}`;
            }
        }

        return { sql, values };
    }
};

// =====================================================
// TEST CONNECTION ON STARTUP
// =====================================================
(async () => {
    try {
        await db.testConnection();
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('   Please check your database configuration');
        process.exit(1);
    }
})();

// =====================================================
// HANDLE PROCESS EXIT
// =====================================================
process.on('SIGINT', async () => {
    console.log('\n🔄 Closing database pool...');
    try {
        await pool.end();
        console.log('✅ Database pool closed');
    } catch (error) {
        console.error('❌ Error closing pool:', error);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Closing database pool...');
    try {
        await pool.end();
        console.log('✅ Database pool closed');
    } catch (error) {
        console.error('❌ Error closing pool:', error);
    }
    process.exit(0);
});

// =====================================================
// EXPORT
// =====================================================
module.exports = db;