// Loome middleware'i kasutajarollide kontrollimiseks.
function requireRole(...roles) {
    // Tagastame middleware-funktsiooni.
    return (req, res, next) => {
        // Kontrollime, kas kasutaja on autentitud.
        if (!req.user) {
            return res.status(401).json({ message: "Нет авторизации" });
        }

        // Kontrollime, kas kasutaja roll on lubatud rollide hulgas.
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Нет доступа" });
        }

        // Kui kontroll on edukas, jätkame järgmise middleware'iga.
        next();
    };
}

// Ekspordime middleware'i kasutamiseks teistes moodulites.
module.exports = requireRole;

// Данный middleware проверяет, обладает ли пользователь одной из разрешённых ролей. 
// Функция requireRole(...roles) принимает список допустимых ролей и возвращает middleware-функцию. 
// Сначала проверяется наличие данных пользователя в req.user, которые должны быть установлены после успешной аутентификации. 
// Затем выполняется проверка, входит ли роль пользователя в список разрешённых ролей. 
// Если пользователь не авторизован, возвращается ошибка 401. 
// Если роль не соответствует требованиям, возвращается ошибка 403. 
// При успешной проверке управление передаётся следующему обработчику.