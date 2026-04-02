const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "lunjevanatalja@gmail.com",
        pass: "ydsizlfjcnivnfci"
    }
});

module.exports = transporter;