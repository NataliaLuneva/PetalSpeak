// Impordime jsonwebtoken teegi JWT tokenite töötlemiseks.
const jwt = require("jsonwebtoken");

// Ekspordime middleware'i kasutaja autentimiseks.
module.exports = (req, res, next) => {
    try {
        // Võtame Authorization päise.
        const authHeader = req.headers.authorization;

        // Kontrollime, kas token on olemas ja algab sõnaga "Bearer ".
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Нет токена"
            });
        }

        // Eraldame tokeni päisest.
        const token = authHeader.split(" ")[1];

        // Kontrollime tokeni kehtivust ja dekodeerime selle.
        const decoded = jwt.verify(token, "secret123");

        // Salvestame kasutaja andmed päringu objekti.
        req.user = {
            id: decoded.id,
            email: decoded.email || null,
            role: decoded.role || "user"
        };

        // Anname juhtimise järgmisele middleware'ile.
        next();
    } catch (error) {
        // Kuvame vea serveri konsoolis.
        console.error("Auth middleware error:", error);

        // Tagastame veateate, kui token on vigane või aegunud.
        return res.status(401).json({
            message: "Сессия истекла. Войдите снова"
        });
    }
};

// Данный middleware выполняет проверку JWT-токена, переданного в заголовке Authorization. 
// Сначала проверяется наличие токена и его корректный формат (Bearer <token>). 
// Затем токен декодируется и проверяется с помощью секретного ключа. 
// Если токен действителен, данные пользователя (id, email, role) сохраняются в объект req.user, чтобы они были доступны в следующих обработчиках. 
// Если токен отсутствует, повреждён или срок его действия истёк, сервер возвращает ошибку авторизации со статусом 401.