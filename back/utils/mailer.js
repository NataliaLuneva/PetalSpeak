const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "lunjevanatalja@gmail.com", // ← твоя Gmail
        pass: "risxcwhufuuhqvso"     // ← app password БЕЗ ПРОБЕЛОВ
    }
});

module.exports = transporter;