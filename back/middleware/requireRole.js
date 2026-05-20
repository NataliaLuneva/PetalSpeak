// Function that creates middleware for role-based access control.
// It accepts one or more allowed roles as arguments.
function requireRole(...roles) {

    // Return middleware function.
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "No authorization."
            });
        }

        // Check whether the user's role is included in the list of allowed roles.
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied."
            });
        }
        next();
    };
}

module.exports = requireRole;