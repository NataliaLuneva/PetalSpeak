const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Нет токена"
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, "secret123");

        req.user = {
            id: decoded.id,
            email: decoded.email || null,
            role: decoded.role || "user"
        };

        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(401).json({
            message: "Недействительный токен"
        });
    }
};