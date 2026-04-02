const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const header = req.headers.authorization;

    if (!header) return next();

    const token = header.split(" ")[1];

    try {
        const decoded = jwt.verify(token, "secret123");
        req.user = decoded;
    } catch {}

    next();
};