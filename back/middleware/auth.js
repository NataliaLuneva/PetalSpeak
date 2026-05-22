// Import the jsonwebtoken library, which is used to verify JWT authentication tokens.
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Export middleware function for checking user authentication.
module.exports = (req, res, next) => {

    // Get the Authorization header from the request.
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            message: "No token provided"
        });
    }

    // Extract the token from the "Bearer <token>" format.
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        // If the token is invalid or expired, return an error.
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};