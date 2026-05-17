const mysql = require("mysql2/promise");

// This file creates a connection pool to the MySQL database and exports it for use in other parts of the application.

const pool = mysql.createPool({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "petalspeak",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;