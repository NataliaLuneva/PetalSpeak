// This middleware checks whether the user has one of the required roles.

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "No authorization." });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied." });
        }
        next();
    };
}

module.exports = requireRole;