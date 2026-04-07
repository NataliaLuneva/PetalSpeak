const API_BASE = "/api";
const BASE_URL = window.location.origin;

let translations = {};
let currentLang = localStorage.getItem("lang") || "en";
let currentUser = null;

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

function getAvatarUrl(avatarPath) {
    if (!avatarPath) {
        return "/assets/img/user.png";
    }

    if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
        return avatarPath;
    }

    return `${BASE_URL}${avatarPath}`;
}

async function loadUser() {
    const token = getToken();
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: authHeaders()
        });

        if (!res.ok) {
            localStorage.removeItem("token");
            window.location.href = "/login.html";
            return;
        }

        const user = await res.json();
        currentUser = user;

        document.getElementById("profileName").textContent = user.name || "User";
        document.getElementById("profileEmail").textContent = user.email || "";
        document.getElementById("profileNameInput").value = user.name || "";
        document.getElementById("profileEmailInput").value = user.email || "";
        document.getElementById("headerUserName").textContent = user.name || user.email || "Profile";
        document.getElementById("profileRole").textContent = `${t("role_label")}: ${user.role || "user"}`;

        const avatarUrl = getAvatarUrl(user.avatar);
        document.getElementById("avatarPreview").src = avatarUrl;
        document.getElementById("headerAvatar").src = avatarUrl;

        if (user.role === "superadmin") {
            document.getElementById("adminUsersCard").style.display = "block";
            document.getElementById("adminOrdersCard").style.display = "block";
            document.getElementById("adminStatsCard").style.display = "block";

            await loadAdminUsers();
            await loadAdminOrders();
            await loadAdminStats();
        }
    } catch (error) {
        console.error("Load user error:", error);
        localStorage.removeItem("token");
        window.location.href = "/login.html";
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
        showMessage("avatarMessage", "Uploading...");

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
            const avatarUrl = getAvatarUrl(data.avatar);
            document.getElementById("avatarPreview").src = avatarUrl;
            document.getElementById("headerAvatar").src = avatarUrl;
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

    const bouquets = {
        love: { title: "bq_love", img: "/assets/img/b1.jpg" },
        friendship: { title: "bq_friendship", img: "/assets/img/b8.jpg" },
        gratitude: { title: "bq_gratitude", img: "/assets/img/b15.jpg" },
        admiration: { title: "bq_admiration", img: "/assets/img/b3.jpg" },
        comfort: { title: "bq_comfort", img: "/assets/img/b29.jpg" },
        celebration: { title: "bq_celebration", img: "/assets/img/b20.jpg" }
    };

    try {
        const res = await fetch(`${API_BASE}/tests/my`, {
            headers: authHeaders()
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Ошибка загрузки тестов");
        }

        if (!Array.isArray(data) || !data.length) {
            list.innerHTML = `<p class="empty">Нет истории тестов</p>`;
            return;
        }

        list.innerHTML = data.map(test => {
            const bouquet = bouquets[test.result] || {};

            return `
                <div class="item">
                    ${
                        bouquet.img
                            ? `<img src="${bouquet.img}" style="width:100%; max-width:200px; border-radius:12px; margin-bottom:10px;">`
                            : ""
                    }
                    <div class="item-title">
                        ${translations[bouquet.title] || bouquet.title}
                    </div>
                    <div class="item-meta">
                        ${translations["date_label"] || "Date"}: ${formatDate(test.created_at)}
                    </div>
                </div>
            `;
        }).join("");
    } catch (error) {
        list.innerHTML = `<p class="empty">${error.message}</p>`;
    }
}

async function loadAdminUsers() {
    const list = document.getElementById("adminUsersList");

    try {
        const res = await fetch(`${API_BASE}/admin/users`, {
            headers: authHeaders()
        });

        const users = await res.json();

        if (!res.ok) {
            throw new Error(users.message || "Ошибка загрузки пользователей");
        }

        list.innerHTML = users.map(user => `
        <div class="item">
            <div><b>${user.name || t("no_name_label")}</b> (${user.email})</div>
            <div>${t("role_label")}: ${user.role}</div>
            <div>${t("blocked_label")}: ${user.is_blocked ? t("yes_label") : t("no_label")}</div>
            <div>${t("deleted_label")}: ${user.is_deleted ? t("yes_label") : t("no_label")}</div>
            <div>${t("date_label")}: ${formatDate(user.created_at)}</div>

            <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
                ${
                    user.role === "user" && !user.is_deleted
                        ? `<button class="profile-btn" onclick="makeAdmin(${user.id})">${t("make_admin_btn")}</button>`
                        : ""
                }

                ${
                    user.role === "admin" && !user.is_deleted
                        ? `<button class="profile-btn" onclick="removeAdmin(${user.id})">${t("remove_admin_btn")}</button>`
                        : ""
                }

                ${
                    !user.is_deleted
                        ? (
                            user.is_blocked
                                ? `<button class="profile-btn secondary" onclick="unblockUser(${user.id})">${t("unblock_btn")}</button>`
                                : `<button class="profile-btn secondary" onclick="blockUser(${user.id})">${t("block_btn")}</button>`
                        )
                        : ""
                }

                ${
                    !user.is_deleted
                        ? `<button class="profile-btn secondary" onclick="deleteUser(${user.id})">${t("delete_btn")}</button>`
                        : ""
                }
            </div>
        </div>
    `).join("");
    } catch (error) {
        list.innerHTML = `<p class="empty">${error.message}</p>`;
    }
}

async function makeAdmin(id) {
    try {
        await fetch(`${API_BASE}/admin/users/${id}/make-admin`, {
            method: "PUT",
            headers: authHeaders()
        });
        await loadAdminUsers();
    } catch (error) {
        console.error(error);
    }
}

async function removeAdmin(id) {
    try {
        await fetch(`${API_BASE}/admin/users/${id}/remove-admin`, {
            method: "PUT",
            headers: authHeaders()
        });
        await loadAdminUsers();
    } catch (error) {
        console.error(error);
    }
}

async function blockUser(id) {
    try {
        await fetch(`${API_BASE}/admin/users/${id}/block`, {
            method: "PUT",
            headers: authHeaders()
        });
        await loadAdminUsers();
    } catch (error) {
        console.error(error);
    }
}

async function unblockUser(id) {
    try {
        await fetch(`${API_BASE}/admin/users/${id}/unblock`, {
            method: "PUT",
            headers: authHeaders()
        });
        await loadAdminUsers();
    } catch (error) {
        console.error(error);
    }
}

async function deleteUser(id) {
    try {
        await fetch(`${API_BASE}/admin/users/${id}/delete`, {
            method: "PUT",
            headers: authHeaders()
        });
        await loadAdminUsers();
    } catch (error) {
        console.error(error);
    }
}

async function loadAdminOrders() {
    const list = document.getElementById("adminOrdersList");

    try {
        const res = await fetch(`${API_BASE}/admin/orders`, {
            headers: authHeaders()
        });

        const orders = await res.json();

        if (!res.ok) {
            throw new Error(orders.message || "Ошибка загрузки заказов");
        }

        if (!orders.length) {
            list.innerHTML = `<p class="empty">No orders</p>`;
            return;
        }

        list.innerHTML = orders.map(order => `
            <div class="item">
                <div><b>${order.bouquet_title || "-"}</b></div>
                <div>${t("user_label")}: ${order.user_name || t("guest_label")}</div>
                <div>${t("email_label")}: ${order.email || "-"}</div>
                <div>${t("type_label")}: ${order.bouquet_type || "-"}</div>
                <div>${t("price_label")}: €${order.price || "-"}</div>
                <div>${t("message_label")}: ${order.message || "-"}</div>
                <div>${t("date_label")}: ${formatDate(order.created_at)}</div>
            </div>
        `).join("");
    } catch (error) {
        list.innerHTML = `<p class="empty">${t("no_orders_admin")}</p>`;;
    }
}

async function loadAdminStats() {
    const list = document.getElementById("adminStatsList");

    try {
        const res = await fetch(`${API_BASE}/admin/stats`, {
            headers: authHeaders()
        });

        const stats = await res.json();

        if (!res.ok) {
            throw new Error(stats.message || "Ошибка загрузки статистики");
        }

        list.innerHTML = `
            <div class="item">${t("total_orders_label")}: ${stats.totalOrders}</div>
            <div class="item">${t("total_revenue_label")}: €${stats.totalRevenue}</div>
            <div class="item">${t("month_revenue_label")}: €${stats.monthRevenue}</div>
            <h3 style="margin-top:16px;">${t("top_sales_title")}</h3>
            ${stats.topSales.map(item => `
                <div class="item">
                    ${item.bouquet_title} — ${item.total_sales}
                </div>
            `).join("")}
        `;
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

            if (currentUser?.role === "superadmin") {
                await loadAdminUsers();
                await loadAdminOrders();
                await loadAdminStats();
            }
        });
    });

    await loadUser();
    await loadOrders();
    await loadTests();
});