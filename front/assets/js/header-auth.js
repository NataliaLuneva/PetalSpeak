/**
 * Initsialiseerib päise autentimise oleku.
 * Kontrollib, kas kasutajal on salvestatud JWT token,
 * laadib kasutaja andmed serverist ja uuendab päise elemente.
 */
async function initHeaderAuth() {
    // Võtab tokeni brauseri kohalikust salvestusest
    const token = localStorage.getItem("token");

    // Leiab külalise ja autentitud kasutaja plokid
    const guestBlock = document.getElementById("guestBlock");
    const authBlock = document.getElementById("authBlock");

    // Kui token puudub, kuvatakse külalise plokk ja peidetakse kasutaja plokk
    if (!token) {
        if (guestBlock) guestBlock.style.display = "flex";
        if (authBlock) authBlock.style.display = "none";
        return;
    }

    try {
        // Saadab päringu serverile kasutaja andmete saamiseks
        const res = await fetch("/api/auth/me", {
            headers: {
                // Lisab tokeni Authorization päisesse
                Authorization: `Bearer ${token}`
            }
        });

        // Kui token on vigane või aegunud
        if (!res.ok) {
            // Eemaldab tokeni kohalikust salvestusest
            localStorage.removeItem("token");

            // Kuvab külalise ploki ja peidab kasutaja ploki
            if (guestBlock) guestBlock.style.display = "flex";
            if (authBlock) authBlock.style.display = "none";
            return;
        }

        // Loeb serveri vastusest kasutaja andmed
        const user = await res.json();

        // Peidab külalise ploki ja kuvab autentitud kasutaja ploki
        if (guestBlock) guestBlock.style.display = "none";
        if (authBlock) authBlock.style.display = "flex";

        // Leiab kasutaja nime ja avatari elemendid
        const nameEl = document.getElementById("headerUserName");
        const avatarEl = document.getElementById("headerAvatar");

        // Kuvab kasutaja nime, e-posti või vaikimisi teksti "Profile"
        if (nameEl) {
            nameEl.textContent = user.name || user.email || "Profile";
        }

        // Kui kasutajal on avatar, määratakse selle pildi URL
        if (avatarEl && user.avatar) {
            avatarEl.src = user.avatar;
        }
    } catch (error) {
        // Kuvab veateate konsoolis, kui päringu käigus tekib viga
        console.error("Header auth error:", error);
    }
}

// Käivitab autentimise initsialiseerimise pärast HTML-dokumendi täielikku laadimist
document.addEventListener("DOMContentLoaded", initHeaderAuth);

// Функция initHeaderAuth() проверяет наличие токена авторизации в localStorage. 
// Если токен существует, отправляется запрос на сервер для получения данных пользователя. 
// После этого в шапке сайта отображается либо блок для гостей, либо информация об авторизованном пользователе (имя и аватар). 
// Если токен недействителен, он удаляется, и показывается интерфейс для неавторизованного пользователя.