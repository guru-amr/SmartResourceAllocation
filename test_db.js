const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    console.log('Testing connection with:');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('Password:', process.env.DB_PASSWORD ? '******' : 'EMPTY');

    try {
        const rootConnection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });
        console.log('Successfully connected to MySQL Root.');
        
        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'miniproject'}\``);
        console.log('Database ensured.');
        await rootConnection.end();
    } catch (err) {
        console.error('FAILED:', err.message);
    }
}

test();
