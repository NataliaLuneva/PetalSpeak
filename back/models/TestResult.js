// Impordime mongoose teegi MongoDB andmemudelite loomiseks.
const mongoose = require("mongoose");

// Loome testi tulemuste skeemi.
const testResultSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, // Viide kasutaja ID-le.
        ref: "User",                          // Seos User mudeliga.
        default: null                         // Võib olla tühi, kui kasutaja pole sisse logitud.
    },
    resultType: {
        type: String,
        required: true                        // Testi tulemuse tüüp.
    },
    bouquetTitle: {
        type: String,
        required: true                        // Soovitatud buketi nimetus.
    },
    refined: {
        type: Boolean,
        default: false                        // Kas tulemust on täpsustatud.
    },
    answers: {
        type: Array,
        default: []                           // Kasutaja vastused testiküsimustele.
    },
    createdAt: {
        type: Date,
        default: Date.now                     // Tulemuse loomise kuupäev.
    }
});

// Ekspordime TestResult mudeli.
module.exports = mongoose.model("TestResult", testResultSchema);

// Данный модуль создаёт схему testResultSchema для хранения результатов теста в базе данных MongoDBс использованием библиотеки mongoose. 
// В схеме сохраняются данные о пользователе, типе полученного результата, названии рекомендованного букета, информации о том, был ли результат уточнён, ответах пользователя и дате создания записи. 
// Поле user содержит ссылку на модель User и может быть пустым для неавторизованных пользователей. 
// На основе схемы создаётся и экспортируется модель TestResult, которая используется для работы с коллекцией результатов тестирования.