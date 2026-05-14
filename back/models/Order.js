// Impordime mongoose teegi MongoDB andmemudelite loomiseks.
const mongoose = require("mongoose");

// Loome tellimuse skeemi.
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, // Viide kasutaja ID-le.
        ref: "User",                          // Seos User mudeliga.
        default: null                         // Võib olla tühi külalistellimuste puhul.
    },
    customerName: {
        type: String,
        required: true                        // Kliendi nimi on kohustuslik.
    },
    email: {
        type: String,
        required: true                        // Kliendi e-post on kohustuslik.
    },
    bouquetType: {
        type: String,
        required: true                        // Kimbu tüüp.
    },
    bouquetTitle: {
        type: String,
        required: true                        // Kimbu nimetus.
    },
    message: {
        type: String,
        default: ""                           // Lisasoov või kommentaar.
    },
    status: {
        type: String,
        enum: ["new", "processing", "done"],  // Võimalikud tellimuse staatused.
        default: "new"                        // Vaikimisi uus tellimus.
    },
    createdAt: {
        type: Date,
        default: Date.now                     // Loomise kuupäev.
    }
});

// Ekspordime Order mudeli.
module.exports = mongoose.model("Order", orderSchema);

// Данный модуль создаёт схему orderSchema для хранения заказов в базе данных MongoDB с использованием библиотеки mongoose. 
// В схеме содержатся данные о пользователе, имени клиента, электронной почте, типе и названии букета, дополнительном сообщении, статусе заказа и дате создания. 
// Поле user является ссылкой на модель User и может быть пустым, если заказ оформлен без регистрации. 
// Поле status ограничено тремя возможными значениями: new, processing и done. 
// На основе схемы создаётся и экспортируется модель Order, которая используется для работы с коллекцией заказов.