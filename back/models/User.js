// Impordime mongoose teegi MongoDB andmemudelite loomiseks.
const mongoose = require("mongoose");

// Loome kasutaja skeemi.
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,                       // E-posti aadress on kohustuslik.
        unique: true                          // E-posti aadress peab olema unikaalne.
    },
    password: {
        type: String,
        required: true                        // Krüpteeritud parool on kohustuslik.
    },
    role: {
        type: String,
        enum: ["user", "admin"],              // Võimalikud kasutajarollid.
        default: "user"                       // Vaikimisi tavakasutaja.
    },
    createdAt: {
        type: Date,
        default: Date.now                     // Konto loomise kuupäev.
    }
});

// Ekspordime User mudeli.
module.exports = mongoose.model("User", userSchema);

// Данный модуль создаёт схему userSchema для хранения пользователей в базе данных MongoDB с использованием библиотеки mongoose. 
// В схеме сохраняются электронная почта, пароль, роль пользователя и дата создания аккаунта. 
// Поле email является обязательным и должно быть уникальным, чтобы исключить регистрацию нескольких пользователей с одним и тем же адресом. 
// Поле password хранит зашифрованный пароль. 
// Поле role ограничено двумя значениями: user и admin, при этом по умолчанию назначается роль обычного пользователя. 
// На основе схемы создаётся и экспортируется модель User, которая используется для работы с коллекцией пользователей.