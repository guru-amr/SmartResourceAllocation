const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_alloc',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initDB() {
    try {
        // First, connect without a specific database to ensure it exists
        const rootConnection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'miniproject'}\``);
        await rootConnection.end();

        const connection = await pool.getConnection();
        console.log('Connected to MySQL database.');

        // Table for historical snapshots (for ML)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS resource_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                resource_type VARCHAR(50),
                usage_value FLOAT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table for allocation logs
        await connection.query(`
            CREATE TABLE IF NOT EXISTS allocation_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                process_id VARCHAR(50),
                resource_type VARCHAR(50),
                amount VARCHAR(100),
                status ENUM('GRANTED', 'DENIED', 'RELEASED'),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration: Ensure existing table is updated if already exists
        await connection.query(`ALTER TABLE allocation_logs MODIFY COLUMN amount VARCHAR(100)`);

        connection.release();
        console.log('Database tables initialized.');
    } catch (err) {
        console.error('Error initializing database:', err.message);
        console.warn('Proceeding without persistent storage. (Check MySQL configuration)');
    }
}

module.exports = { pool, initDB };
