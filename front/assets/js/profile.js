const API_BASE = "/api";

let translations = {};
let currentLang = localStorage.getItem("lang") || "en";

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

function authHeaders() {
    const token = getToken();
    return {
        Authorization: `Bearer ${token}`
    };
}

function jsonHeaders() {
    return {
        "Content-Type": "application/json",
        ...authHeaders()
    };
}

function showMessage(id, text, isError = false) {
    const el = document.getElementById(id);
    if (!el) return;

    el.textContent = text;
    el.style.color = isError ? "crimson" : "#567a67";
}

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString();
}

async function loadUser() {
    const token = getToken();
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    const res = await fetch(`${API_BASE}/auth/me`, {
        headers: authHeaders()
    });

    if (!res.ok) {
        localStorage.removeItem("token");
        window.location.href = "/login.html";
        return;
    }

    const user = await res.json();

    document.getElementById("profileName").textContent = user.name || "User";
    document.getElementById("profileEmail").textContent = user.email || "";
    document.getElementById("profileNameInput").value = user.name || "";
    document.getElementById("profileEmailInput").value = user.email || "";
    document.getElementById("headerUserName").textContent = user.name || user.email || "Profile";

    if (user.avatar) {
        document.getElementById("avatarPreview").src = user.avatar;
        document.getElementById("headerAvatar").src = user.avatar;
    }
}

async function saveProfile(event) {
    event.preventDefault();

    const name = document.getElementById("profileNameInput").value.trim();
    const email = document.getElementById("profileEmailInput").value.trim();

    try {
        const res = await fetch(`${API_BASE}/auth/profile`, {
            method: "PUT",
            headers: jsonHeaders(),
            body: JSON.stringify({ name, email })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || t("profile_update_error"));
        }

        showMessage("profileMessage", data.message || t("profile_updated"));
        await loadUser();
    } catch (error) {
        showMessage("profileMessage", error.message, true);
    }
}

async function changePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    try {
        const res = await fetch(`${API_BASE}/auth/password`, {
            method: "PUT",
            headers: jsonHeaders(),
            body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || t("password_update_error"));
        }

        document.getElementById("passwordForm").reset();
        showMessage("passwordMessage", data.message || t("password_updated"));
    } catch (error) {
        showMessage("passwordMessage", error.message, true);
    }
}

async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
        const res = await fetch(`${API_BASE}/auth/avatar`, {
            method: "POST",
            headers: authHeaders(),
            body: formData
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || t("avatar_upload_error"));
        }

        if (data.avatar) {
            document.getElementById("avatarPreview").src = data.avatar;
            document.getElementById("headerAvatar").src = data.avatar;
        }

        showMessage("avatarMessage", data.message || t("avatar_updated"));
        await loadUser();
    } catch (error) {
        showMessage("avatarMessage", error.message, true);
    }
}

async function loadOrders() {
    const list = document.getElementById("ordersList");

    try {
        const res = await fetch(`${API_BASE}/orders/my`, {
            headers: authHeaders()
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || t("orders_load_error"));
        }

        if (!Array.isArray(data) || !data.length) {
            list.innerHTML = `<p class="empty">${t("no_orders_yet")}</p>`;
            return;
        }

        list.innerHTML = data.map(order => `
            <div class="item">
                <div class="item-title">${order.bouquet_title || t("bouquet_default")}</div>
                <div class="item-meta">${t("email_label")}: ${order.email || "-"}</div>
                <div class="item-meta">${t("type_label")}: ${order.bouquet_type || "-"}</div>
                <div class="item-meta">${t("price_label")}: ${order.price || "-"}</div>
                <div class="item-meta">${t("message_label")}: ${order.message || "-"}</div>
                <div class="item-meta">${t("date_label")}: ${formatDate(order.created_at)}</div>
            </div>
        `).join("");
    } catch (error) {
        list.innerHTML = `<p class="empty">${error.message}</p>`;
    }
}

async function loadTests() {
    const list = document.getElementById("testsList");

    try {
        const res = await fetch(`${API_BASE}/tests/my`, {
            headers: authHeaders()
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || t("tests_load_error"));
        }

        if (!Array.isArray(data) || !data.length) {
            list.innerHTML = `<p class="empty">${t("no_test_history")}</p>`;
            return;
        }

        list.innerHTML = data.map(test => `
            <div class="item">
                <div class="item-title">${test.result || t("bouquet_result")}</div>
                <div class="item-meta">${t("date_label")}: ${formatDate(test.created_at)}</div>
            </div>
        `).join("");
    } catch (error) {
        list.innerHTML = `<p class="empty">${error.message}</p>`;
    }
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "/index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadLanguage(currentLang);

    document.getElementById("profileForm")?.addEventListener("submit", saveProfile);
    document.getElementById("passwordForm")?.addEventListener("submit", changePassword);
    document.getElementById("avatarInput")?.addEventListener("change", uploadAvatar);
    document.getElementById("logoutBtn")?.addEventListener("click", logout);

    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            await loadLanguage(btn.dataset.lang);
            await loadOrders();
            await loadTests();
        });
    });

    await loadUser();
    await loadOrders();
    await loadTests();
});