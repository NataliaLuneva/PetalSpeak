const AUTH_API = "/api/auth";

let translations = {};
let currentLang = localStorage.getItem("lang") || "ru";

function t(key) {
    return translations[key] || key;
}

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

function setActiveLangButton(lang) {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.lang === lang);
    });
}

function getToken() {
    return localStorage.getItem("token");
}

function saveToken(token) {
    localStorage.setItem("token", token);
}

function removeToken() {
    localStorage.removeItem("token");
}

function showMessage(text, isError = false) {
    const messageEl = document.getElementById("authMessage");
    if (!messageEl) return;

    messageEl.textContent = text;
    messageEl.style.color = isError ? "crimson" : "#567a67";
}

function setLoading(button, text) {
    if (!button) return;

    button.disabled = true;
    button.dataset.oldText = button.textContent;
    button.textContent = text;
}

function resetLoading(button) {
    if (!button) return;

    button.disabled = false;

    if (button.dataset.oldText) {
        button.textContent = button.dataset.oldText;
    }
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || t("request_error") || "Ошибка запроса");
    }

    return data;
}

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

    if (!name || !email || !password || !confirmPassword) {
        showMessage(t("fill_required"), true);
        return;
    }

    if (password.length < 6) {
        showMessage(t("password_short"), true);
        return;
    }

    if (password !== confirmPassword) {
        showMessage(t("password_mismatch"), true);
        return;
    }

    try {
        setLoading(submitBtn, t("register_loading"));

        await apiRequest(`${AUTH_API}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        showMessage(t("register_success"));

        setTimeout(() => {
            switchToLogin();

            const loginEmail = document.getElementById("loginEmail");
            if (loginEmail) {
                loginEmail.value = email;
            }
        }, 700);
    } catch (error) {
        showMessage(error.message || t("request_error"), true);
    } finally {
        resetLoading(submitBtn);
    }
}

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

function switchToLogin() {
    const loginBlock = document.getElementById("loginBlock");
    const registerBlock = document.getElementById("registerBlock");
    const message = document.getElementById("authMessage");

    if (loginBlock) loginBlock.classList.remove("hidden");
    if (registerBlock) registerBlock.classList.add("hidden");
    if (message) message.textContent = "";
}

function switchToRegister() {
    const loginBlock = document.getElementById("loginBlock");
    const registerBlock = document.getElementById("registerBlock");
    const message = document.getElementById("authMessage");

    if (loginBlock) loginBlock.classList.add("hidden");
    if (registerBlock) registerBlock.classList.remove("hidden");
    if (message) message.textContent = "";
}

function logout() {
    removeToken();
    window.location.href = "/index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadLanguage(currentLang);

    const registerForm = document.getElementById("registerForm");
    const loginForm = document.getElementById("loginForm");
    const showLoginBtn = document.getElementById("showLogin");
    const showRegisterBtn = document.getElementById("showRegister");

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

    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            await loadLanguage(btn.dataset.lang);
        });
    });
});