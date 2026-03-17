function adminMiddleware(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
    }

    next();
}

module.exports = adminMiddleware;