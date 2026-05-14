// Impordime nodemailer teegi e-kirjade saatmiseks.
const nodemailer = require("nodemailer");

// Loome transpordiobjekti Gmaili kaudu kirjade saatmiseks.
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "lunjevanatalja@gmail.com", // Saatja e-posti aadress.
        pass: "ydsizlfjcnivnfci"                          // Rakenduse parool või juurdepääsutoken.
    }
});

// Ekspordime transpordiobjekti teiste moodulite jaoks.
module.exports = transporter;

// Данный модуль настраивает объект transporter с помощью библиотеки nodemailer для отправки электронных писем через сервис Gmail. 
// В настройках указываются адрес электронной почты отправителя и пароль приложения. 
// Созданный объект экспортируется и используется в других частях проекта для отправки уведомлений и писем пользователям.