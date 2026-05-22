const nodemailer = require("nodemailer");

// Create a transporter object that defines how emails will be sent.

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

module.exports = transporter;