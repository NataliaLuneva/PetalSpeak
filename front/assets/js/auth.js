const AUTH_API = "/api/auth";

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
    messageEl.style.color = isError ? "crimson" : "green";
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
        throw new Error(data.message || "Ошибка запроса");
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
        showMessage("Заполни все обязательные поля", true);
        return;
    }

    if (password.length < 6) {
        showMessage("Пароль должен быть не меньше 6 символов", true);
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Пароли не совпадают", true);
        return;
    }

    try {
        setLoading(submitBtn, "Регистрация...");

        await apiRequest(`${AUTH_API}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        showMessage("Регистрация прошла успешно");

        setTimeout(() => {
            switchToLogin();
            document.getElementById("loginEmail").value = email;
        }, 700);
    } catch (error) {
        showMessage(error.message || "Ошибка регистрации", true);
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
        showMessage("Введи email и пароль", true);
        return;
    }

    try {
        setLoading(submitBtn, "Вход...");

        const data = await apiRequest(`${AUTH_API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        if (!data.token) {
            throw new Error("Не удалось выполнить вход");
        }

        saveToken(data.token);
        showMessage("Вход выполнен");

        setTimeout(() => {
            window.location.href = "/index.html";
        }, 500);
    } catch (error) {
        showMessage(error.message || "Ошибка входа", true);
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

async function getCurrentUser() {
    const token = getToken();
    if (!token) return null;

    try {
        const response = await fetch(`${AUTH_API}/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            removeToken();
            return null;
        }

        return await response.json();
    } catch (error) {
        removeToken();
        return null;
    }
}

function logout() {
    removeToken();
    window.location.href = "/index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
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

    const user = await getCurrentUser();
    if (user) {
        window.location.href = "/index.html";
    }
});