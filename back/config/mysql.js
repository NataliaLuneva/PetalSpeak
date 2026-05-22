// Import the mysql2 library with Promise support, which allows using async/await for database queries.
const mysql = require("mysql2/promise");

// Create a connection pool to the MySQL database.
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