const AUTH_API = "/api/auth";

// Hoiame tõlkeid ja aktiivset keelt.
let translations = {};
let currentLang = localStorage.getItem("lang") || "ru";

/* ===== MENU TOGGLE ===== */

function toggleMenu() {
    document.getElementById("nav").classList.toggle("active");
}

// Tagastab tõlgitud teksti võtme järgi.
function t(key) {
    return translations[key] || key;
}

// Laadib valitud keele tõlkefaili.
async function loadLanguage(lang) {
    try {
        const response = await fetch(`/locales/${lang}.json`);
        translations = await response.json();
        currentLang = lang;
        localStorage.setItem("lang", lang);

        applyTranslations();
        setActiveLangButton(lang);
    } catch (error) {
        console.error("Language load error:", error);
    }
}

// Rakendab tõlked lehe tekstidele ja placeholderitele.
function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (translations[key]) {
            el.textContent = translations[key];
        }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (translations[key]) {
            el.placeholder = translations[key];
        }
    });
}

// Märgib aktiivse keelenupu.
function setActiveLangButton(lang) {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.lang === lang);
    });
}

// Võtab tokeni localStorage'ist.
function getToken() {
    return localStorage.getItem("token");
}

// Salvestab tokeni localStorage'isse.
function saveToken(token) {
    localStorage.setItem("token", token);
}

// Eemaldab tokeni localStorage'ist.
function removeToken() {
    localStorage.removeItem("token");
}

// Kuvab kasutajale teate.
function showMessage(text, isError = false) {
    const messageEl = document.getElementById("authMessage");
    if (!messageEl) return;

    messageEl.textContent = text;
    messageEl.style.color = isError ? "crimson" : "#567a67";
}

// Paneb nupu laadimisolekusse.
function setLoading(button, text) {
    if (!button) return;

    button.disabled = true;
    button.dataset.oldText = button.textContent;
    button.textContent = text;
}

// Eemaldab nupu laadimisoleku.
function resetLoading(button) {
    if (!button) return;

    button.disabled = false;

    if (button.dataset.oldText) {
        button.textContent = button.dataset.oldText;
    }
}

// Teeb API päringu ja töötleb vastuse.
async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const messageKey = data.messageKey || "request_error";
        let message = t(messageKey) || data.message || "Ошибка запроса";

        if (data.count !== undefined) {
            message = message.replace("{count}", data.count);
        }

        throw new Error(message);
    }

    // Tõlgime eduteate, kui server tagastab messageKey.
    if (data.messageKey) {
        let message = t(data.messageKey);

        if (data.count !== undefined) {
            message = message.replace("{count}", data.count);
        }

        data.message = message;
    }

    return data;
}

// Registreerib uue kasutaja.
async function register(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');

    const name = document.getElementById("registerName")?.value.trim() || "";
    const email = document.getElementById("registerEmail")?.value.trim() || "";
    const password = document.getElementById("registerPassword")?.value || "";
    const confirmPassword =
        document.getElementById("registerConfirmPassword")?.value || "";

    showMessage("");

    // Kontrollime kohustuslikke välju.
    if (!name || !email || !password || !confirmPassword) {
        showMessage(t("fill_required"), true);
        return;
    }

    // Kontrollime parooli minimaalset pikkust.
    if (password.length < 6) {
        showMessage(t("password_short"), true);
        return;
    }

    // Kontrollime, kas paroolid kattuvad.
    if (password !== confirmPassword) {
        showMessage(t("password_mismatch"), true);
        return;
    }

    try {
        setLoading(submitBtn, t("register_loading"));

        const data = await apiRequest(`${AUTH_API}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        showMessage(t("register_success"));

        // Pärast edukat registreerimist avame sisselogimise vormi.
        setTimeout(() => {
            switchToLogin();

            const loginEmail = document.getElementById("loginEmail");
            if (loginEmail) {
                loginEmail.value = email;
            }
        }, 700);
    } catch (error) {
        showMessage(t("request_error"));
    } finally {
        resetLoading(submitBtn);
    }
}

// Logib kasutaja sisse.
async function login(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');

    const email = document.getElementById("loginEmail")?.value.trim() || "";
    const password = document.getElementById("loginPassword")?.value || "";

    showMessage("");

    if (!email || !password) {
        showMessage(t("login_error"), true);
        return;
    }

    try {
        setLoading(submitBtn, t("login_loading"));

        const data = await apiRequest(`${AUTH_API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        if (!data.token) {
            throw new Error(t("request_error"));
        }

        // Salvestame tokeni ja suuname kasutaja avalehele.
        saveToken(data.token);
        showMessage(t("login_success"));

        setTimeout(() => {
            window.location.href = "/index.html";
        }, 500);
    } catch (error) {
        showMessage(error.message || t("request_error"), true);
    } finally {
        resetLoading(submitBtn);
    }
}

// Kuvab sisselogimise vormi.
function switchToLogin() {
    const loginBlock = document.getElementById("loginBlock");
    const registerBlock = document.getElementById("registerBlock");
    const message = document.getElementById("authMessage");

    if (loginBlock) loginBlock.classList.remove("hidden");
    if (registerBlock) registerBlock.classList.add("hidden");
    if (message) message.textContent = "";
}

// Kuvab registreerimise vormi.
function switchToRegister() {
    const loginBlock = document.getElementById("loginBlock");
    const registerBlock = document.getElementById("registerBlock");
    const message = document.getElementById("authMessage");

    if (loginBlock) loginBlock.classList.add("hidden");
    if (registerBlock) registerBlock.classList.remove("hidden");
    if (message) message.textContent = "";
}

// Logib kasutaja välja.
function logout() {
    removeToken();
    window.location.href = "/index.html";
}

// Käivitub pärast HTML-i laadimist.
document.addEventListener("DOMContentLoaded", async () => {
    await loadLanguage(currentLang);

    const registerForm = document.getElementById("registerForm");
    const loginForm = document.getElementById("loginForm");
    const showLoginBtn = document.getElementById("showLogin");
    const showRegisterBtn = document.getElementById("showRegister");

    // Seome vormid ja nupud sündmustega.
    if (registerForm) {
        registerForm.addEventListener("submit", register);
    }

    if (loginForm) {
        loginForm.addEventListener("submit", login);
    }

    if (showLoginBtn) {
        showLoginBtn.addEventListener("click", switchToLogin);
    }

    if (showRegisterBtn) {
        showRegisterBtn.addEventListener("click", switchToRegister);
    }

    // Seome keelenupud keele vahetamisega.
    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            await loadLanguage(btn.dataset.lang);
        });
    });
});

// Этот файл отвечает за авторизацию и регистрацию пользователя на фронтенде. 
// Он загружает переводы, применяет их к элементам страницы, переключает язык интерфейса, показывает сообщения об ошибках и успешных действиях, а также управляет состоянием кнопок во время загрузки. 
// При регистрации данные отправляются на сервер, а после успешной регистрации пользователь автоматически переключается на форму входа. 
// При входе сервер возвращает JWT-токен, который сохраняется в localStorage, после чего пользователь перенаправляется на главную страницу.