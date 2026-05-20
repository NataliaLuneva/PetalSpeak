const nodemailer = require("nodemailer");

// Create a transporter object that defines how emails will be sent.

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "lunjevanatalja@gmail.com",
        pass: "ydsizlfjcnivnfci"
    }
});

module.exports = transporter;