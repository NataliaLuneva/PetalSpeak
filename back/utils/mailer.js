const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "ТВОЯ_ПОЧТА@gmail.com",
        pass: "ТВОЙ_APP_PASSWORD"
    }
});

module.exports = transporter;