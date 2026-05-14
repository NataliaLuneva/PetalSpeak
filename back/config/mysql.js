// Impordime mysql2 teegi Promise-toega.
const mysql = require("mysql2/promise");

// Loome andmebaasi ühenduste kogumi (connection pool).
const pool = mysql.createPool({
    host: "127.0.0.1",      // MySQL serveri aadress.
    user: "root",           // Kasutajanimi.
    password: "",           // Parool.
    database: "petalspeak", // Andmebaasi nimi.
    waitForConnections: true, // Oota vaba ühendust.
    connectionLimit: 10,      // Maksimaalne ühenduste arv.
    queueLimit: 0             // Piiramatu päringute järjekord.
});

// Ekspordime ühenduste kogumi teiste moodulite jaoks.
module.exports = pool;

// В данном модуле подключается библиотека mysql2 с поддержкой Promise, что позволяет выполнять запросы к базе данных с использованием async/await. 
// Создаётся пул подключений к базе данных petalspeak, который управляет несколькими соединениями одновременно и повышает производительность приложения. 
// Затем созданный пул экспортируется, чтобы его можно было использовать в других модулях проекта для выполнения SQL-запросов.