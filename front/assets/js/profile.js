// MENU TOGGLE

// Toggles the visibility of the navigation menu.

function toggleMenu() {

    // Get the navigation element from the page.

    const nav = document.getElementById('nav');

    // Add or remove the 'open' class if the element exists.

    if (nav) {
        nav.classList.toggle('open');
    }
}

// Base path for all backend API requests.

const API_BASE = "/api";

// Current website origin used to build absolute URLs.

const BASE_URL = window.location.origin;

// Object that stores loaded translation strings.

let translations = {};

// Currently selected language, loaded from local storage or set to English by default.

let currentLang = localStorage.getItem("lang") || "en";

// Object containing information about the authenticated user.

let currentUser = null;

// Returns the translated text for the given key.
// If the translation is not found, the key itself is returned.

function t(key) {
    return translations[key] || key;
}

// Loads translation data for the selected language.

async function loadLanguage(lang) {

    try {

        // Request the corresponding language JSON file.
        
        const response = await fetch(`/locales/${lang}.json`);

        // Store the loaded translations.

        translations = await response.json();

        // Update the current language and save it in local storage.

        currentLang = lang;
        localStorage.setItem("lang", lang);

        // Apply translations to page elements.

        applyTranslations();

        // Highlight the active language button.

        setActiveLangButton(lang);
    } catch (error) {
        console.error("Language load error:", error);
    }
}

// Applies translated text to all elements marked for localization.

function applyTranslations() {

    // Update text content for elements with the data-i18n attribute.

    document.querySelectorAll("[data-i18n]").forEach((el) => {

        const key = el.getAttribute("data-i18n");

        // Replace the element text if a translation exists.

        if (translations[key]) {
            el.textContent = translations[key];
        }
    });

    // Update placeholder text for form fields with the data-i18n-placeholder attribute.

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {

        const key = el.getAttribute("data-i18n-placeholder");

        // Replace the placeholder if a translation exists.

        if (translations[key]) {
            el.placeholder = translations[key];
        }
    });
}

// Highlights the currently selected language button.

function setActiveLangButton(lang) {

    // Loop through all language switch buttons.

    document.querySelectorAll(".lang-btn").forEach((btn) => {

        // Add the 'active' class to the selected language button.

        btn.classList.toggle("active", btn.dataset.lang === lang);
    });
}

// Retrieves the authentication token from local storage.

function getToken() {
    return localStorage.getItem("token");
}

// Creates authorization headers for authenticated API requests.

function authHeaders() {

    // Retrieve the stored authentication token.

    const token = getToken();

    // Return the Authorization header in Bearer token format.

    return {
        Authorization: `Bearer ${token}`
    };
}

// Creates request headers for sending JSON data with authentication.

function jsonHeaders() {
    return {
        // Specify that the request body contains JSON data.

        "Content-Type": "application/json",

        // Include the authorization header.

        ...authHeaders()
    };
}

// Builds a date range query string for admin API requests.

function getAdminDateQuery() {

    // Get selected start and end dates from the form.

    const from = document.getElementById("dateFrom")?.value;
    const to = document.getElementById("dateTo")?.value;

    // Return the query string if both dates are provided.

    if (from && to) {
        return `?from=${from}&to=${to}`;
    }

    // Return an empty string if no valid date range is selected.

    return "";
}

// Displays a message in the specified element.

function showMessage(id, text, isError = false) {

    // Find the target element by its ID.

    const el = document.getElementById(id);
    if (!el) return;

    // Set the message text.

    el.textContent = text;

    // Apply a color depending on whether the message is an error.

    el.style.color = isError ? "crimson" : "#567a67";
}

// Converts a date string into a localized date and time format.

function formatDate(dateString) {

    // Return an empty string if no date is provided.

    if (!dateString) return "";

    // Create a Date object from the input string.

    const date = new Date(dateString);

    // Format the date according to the user's locale settings.

    return date.toLocaleString();
}

// Returns the correct URL for the user's avatar image.

function getAvatarUrl(avatarPath) {

    // Use the default avatar if no custom image is provided.

    if (!avatarPath) {

        return "/assets/img/user.png";
    }

    // Return the path directly if it is already an absolute URL.

    if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {

        return avatarPath;
    }

    // Build a full URL for locally stored avatar images.

    return `${BASE_URL}${avatarPath}`;
}

// Loads the authenticated user's profile data and updates the page.

async function loadUser() {

    // Check whether an authentication token exists.

    const token = getToken();
    if (!token) {

        // Redirect to the login page if the user is not authenticated.

        window.location.href = "/login.html";
        return;
    }

    try {

        // Request the current user's information from the server.

        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: authHeaders()
        });

        // Remove the token and redirect if authentication fails.

        if (!res.ok) {
            localStorage.removeItem("token");
            window.location.href = "/login.html";
            return;
        }

        // Store the received user data.

        const user = await res.json();
        currentUser = user;

        // Fill profile fields with user information.
        
        document.getElementById("profileName").textContent = user.name || "User";
        document.getElementById("profileEmail").textContent = user.email || "";
        document.getElementById("profileNameInput").value = user.name || "";
        document.getElementById("profileEmailInput").value = user.email || "";
        document.getElementById("headerUserName").textContent = user.name || user.email || "Profile";
        document.getElementById("profileRole").textContent = `${t("role_label")}: ${user.role || "user"}`;

        // Load and display the user's avatar.

        const avatarUrl = getAvatarUrl(user.avatar);
        document.getElementById("avatarPreview").src = avatarUrl;
        document.getElementById("headerAvatar").src = avatarUrl;

        // Show admin panels and load additional data for super administrators.

        if (user.role === "superadmin") {
            document.getElementById("adminUsersCard").style.display = "block";
            document.getElementById("adminOrdersCard").style.display = "block";
            document.getElementById("adminStatsCard").style.display = "block";

            const dateCard = document.getElementById("adminDateFilterCard");
            if (dateCard) {
                dateCard.style.display = "block";
            }

            // Load administrative data.

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

// Saves updated profile information for the current user.

async function saveProfile(event) {

    // Prevent the form from reloading the page.

    event.preventDefault();

    // Read and clean the entered profile data.

    const name = document.getElementById("profileNameInput").value.trim();
    const email = document.getElementById("profileEmailInput").value.trim();

    try {

        // Send updated profile data to the server.

        const res = await fetch(`${API_BASE}/auth/profile`, {

            method: "PUT",
            headers: jsonHeaders(),
            body: JSON.stringify({ name, email })
        });

        const data = await res.json();

        // Stop execution if the server returns an error.

        if (!res.ok) {
            throw new Error(data.message || t("profile_update_error"));
        }

        // Show success message and reload user data.

        showMessage("profileMessage", t("profile_updated"));
        await loadUser();
    } catch (error) {
        showMessage("profileMessage", error.message, true);
    }
}

// Sends a request to change the current user's password.

async function changePassword(event) {

    // Prevent the form from reloading the page.

    event.preventDefault();

    // Get the entered password values.

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    try {

        // Send the password update request to the server.

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

        // Throw an error if the password update fails.

        if (!res.ok) {
            throw new Error(data.message || t("password_update_error"));
        }

        // Clear the form and show a success message.

        document.getElementById("passwordForm").reset();

        showMessage("passwordMessage", t("password_updated"));
    } catch (error) {
        showMessage("passwordMessage", error.message, true);
    }
}

// Uploads a new avatar image for the current user.

async function uploadAvatar(event) {
    
    // Get the selected file from the file input.

    const file = event.target.files[0];
    if (!file) return;

    // Create a FormData object for file upload.

    const formData = new FormData();
    formData.append("avatar", file);

    try {

        // Show upload progress message.

        showMessage("avatarMessage", "Uploading...");

        // Send the avatar file to the server.

        const res = await fetch(`${API_BASE}/auth/avatar`, {

            method: "POST",
            headers: authHeaders(),
            body: formData
        });

        const data = await res.json();

        // Throw an error if the upload fails.

        if (!res.ok) {
            throw new Error(data.message || t("avatar_upload_error"));
        }

        // Update avatar images if a new path is returned.

        if (data.avatar) {
            const avatarUrl = getAvatarUrl(data.avatar);
            document.getElementById("avatarPreview").src = avatarUrl;
            document.getElementById("headerAvatar").src = avatarUrl;
        }

        // Show success message and reload user data.

        showMessage("avatarMessage", t("avatar_updated"));
        await loadUser();
    } catch (error) {
        showMessage("avatarMessage", error.message, true);
    }
}

// Loads and displays all orders of the authenticated user.

async function loadOrders() {

    // Get the container where orders will be rendered.

    const list = document.getElementById("ordersList");

    try {

        // Request the user's orders from the server.

        const res = await fetch(`${API_BASE}/orders/my`, {
            headers: authHeaders()
        });

        const data = await res.json();

        // Throw an error if the request fails.

        if (!res.ok) {
            throw new Error(data.message || t("orders_load_error"));
        }

        // Show a message if the user has no orders.

        if (!Array.isArray(data) || !data.length) {
            list.innerHTML = `<p class="empty">${t("no_orders_yet")}</p>`;
            return;
        }

        // Generate HTML for each order.

        list.innerHTML = data.map(order => {

            // Use the order items array or create a fallback item for older orders.

            const items = Array.isArray(order.items) && order.items.length
                ? order.items
                : [{
                    bouquet_title: order.bouquet_title,
                    bouquet_type: order.bouquet_type,
                    price: order.price,
                    quantity: 1
                }];

            return `
                <div class="item">
                    <div class="item-title">
                        ${items.map(item => `
                            <div>
                                ${item.bouquet_title || t("bouquet_default")} × ${item.quantity || 1}
                            </div>
                        `).join("")}
                    </div>

                    <div class="item-meta">${t("email_label")}: ${order.email || "-"}</div>
                    <div class="item-meta">${t("price_label")}: €${order.price || "-"}</div>
                    <div class="item-meta">${t("message_label")}: ${order.message || "-"}</div>
                    <div class="item-meta">${t("date_label")}: ${formatDate(order.created_at)}</div>
                </div>
            `;
        }).join("");
    } catch (error) {
        list.innerHTML = `<p class="empty">${error.message}</p>`;
    }
}

// Translates a bouquet feeling type into the currently selected language.

function translateFeelingType(type) {

    // Mapping of feeling types and their translations.

    const map = {
        love: {
            ru: "Любовь",
            en: "Love",
            et: "Armastus"
        },
        friendship: {
            ru: "Дружба",
            en: "Friendship",
            et: "Sõprus"
        },
        gratitude: {
            ru: "Благодарность",
            en: "Gratitude",
            et: "Tänulikkus"
        },
        apology: {
            ru: "Извинение",
            en: "Apology",
            et: "Vabandus"
        },
        sympathy: {
            ru: "Сочувствие",
            en: "Sympathy",
            et: "Kaastunne"
        },
        secret_love: {
            ru: "Тайная любовь",
            en: "Secret love",
            et: "Salajane armastus"
        },
        comfort: {
            ru: "Поддержка",
            en: "Comfort",
            et: "Lohutus"
        }
    };

    // Return the translation for the selected language or a fallback value.

    return map[type]?.[currentLang] || type || "Bouquet";
}

// Loads and displays the user's saved test results.

async function loadTests() {

    // Get the container where test results will be displayed.

    const list = document.getElementById("testsList");

    try {

        // Request the user's test history from the server.

        const res = await fetch(`${API_BASE}/tests/my`, {
            headers: authHeaders()
        });

        const data = await res.json();

        // Throw an error if the request fails.

        if (!res.ok) {
            throw new Error(data.message || "Ошибка загрузки тестов");
        }

        // Show a message if there are no saved test results.

        if (!Array.isArray(data) || !data.length) {
            list.innerHTML = `<p class="empty">${t("no_tests_yet") || "Нет истории тестов"}</p>`;
            return;
        }

        // Generate HTML for each saved test result.

        list.innerHTML = data.map(test => {
            return `
                <div class="item">
                    ${

                        // Display the bouquet image if available.

                        test.bouquet_image
                            ? `<img src="${test.bouquet_image}" style="width:100%; max-width:200px; border-radius:12px; margin-bottom:10px;">`
                            : ""
                    }

                    <div class="item-title">
                        ${test.bouquet_title || translateFeelingType(test.result)}
                    </div>

                    <div class="item-meta">
                        ${t("result_label") || "Результат"}: ${translateFeelingType(test.result)}
                    </div>

                    <div class="item-meta">
                        ${t("price_label") || "Цена"}: €${test.price || "-"}
                    </div>

                    <div class="item-meta">
                        ${t("date_label") || "Дата"}: ${formatDate(test.created_at)}
                    </div>
                </div>
            `;
        }).join("");
    } catch (error) {
        list.innerHTML = `<p class="empty">${error.message}</p>`;
    }
}

// Loads and displays all users in the admin panel.

async function loadAdminUsers() {

    // Get the container where the user list will be rendered.

    const list = document.getElementById("adminUsersList");

    try {

        // Request the list of users from the server.

        const res = await fetch(`${API_BASE}/admin/users`, {
            headers: authHeaders()
        });

        const users = await res.json();

        // Throw an error if the request fails.

        if (!res.ok) {
            throw new Error(users.message || "Ошибка загрузки пользователей");
        }

        // Generate HTML for each user record.

        list.innerHTML = users.map(user => `
        <div class="item">
            <div><b>${user.name || t("no_name_label")}</b> (${user.email})</div>
            <div>${t("role_label")}: ${user.role}</div>
            <div>${t("blocked_label")}: ${user.is_blocked ? t("yes_label") : t("no_label")}</div>
            <div>${t("deleted_label")}: ${user.is_deleted ? t("yes_label") : t("no_label")}</div>
            <div>${t("date_label")}: ${formatDate(user.created_at)}</div>

            <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
                ${

                    // Show the button for assigning administrator rights.

                    user.role === "user" && !user.is_deleted
                        ? `<button class="profile-btn" onclick="makeAdmin(${user.id})">${t("make_admin_btn")}</button>`
                        : ""
                }

                ${

                    // Show the button for removing administrator rights.

                    user.role === "admin" && !user.is_deleted
                        ? `<button class="profile-btn" onclick="removeAdmin(${user.id})">${t("remove_admin_btn")}</button>`
                        : ""
                }

                ${

                    // Show block or unblock controls.

                    !user.is_deleted
                        ? (
                            user.is_blocked
                                ? `<button class="profile-btn secondary" onclick="unblockUser(${user.id})">${t("unblock_btn")}</button>`
                                : `<button class="profile-btn secondary" onclick="blockUser(${user.id})">${t("block_btn")}</button>`
                        )
                        : ""
                }

                ${

                    // Show the delete button for active users.

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

// Grants administrator rights to the selected user.

async function makeAdmin(id) {

    try {
        
        // Send a request to update the user's role to administrator.

        await fetch(`${API_BASE}/admin/users/${id}/make-admin`, {
            
            method: "PUT",
            headers: authHeaders()
        });

        // Reload the user list to display updated information.

        await loadAdminUsers();
    } catch (error) {
        console.error(error);
    }
}

// Removes administrator rights from the selected user.

async function removeAdmin(id) {

    try {

        // Send a request to change the user's role back to a regular user.

        await fetch(`${API_BASE}/admin/users/${id}/remove-admin`, {
            method: "PUT",
            headers: authHeaders()
        });

        // Reload the user list to display updated information.

        await loadAdminUsers();
    } catch (error) {
        console.error(error);
    }
}

// Blocks the selected user from accessing the system.

async function blockUser(id) {

    try {

        // Send a request to mark the user as blocked.

        await fetch(`${API_BASE}/admin/users/${id}/block`, {
            method: "PUT",
            headers: authHeaders()
        });

        // Reload the user list to reflect the updated status.

        await loadAdminUsers();
    } catch (error) {
        console.error(error);
    }
}

// Removes the blocked status from the selected user.

async function unblockUser(id) {

    try {

        // Send a request to restore the user's access.

        await fetch(`${API_BASE}/admin/users/${id}/unblock`, {
            method: "PUT",
            headers: authHeaders()
        });

        // Reload the user list to reflect the updated status.

        await loadAdminUsers();
    } catch (error) {
        console.error(error);
    }
}

// Marks the selected user as deleted in the system.

async function deleteUser(id) {

    try {

        // Send a request to perform a soft delete of the user account.

        await fetch(`${API_BASE}/admin/users/${id}/delete`, {
            method: "PUT",
            headers: authHeaders()
        });

        // Reload the user list to display the updated status.

        await loadAdminUsers();
    } catch (error) {
        console.error(error);
    }
}

// Loads and displays all orders in the admin panel.

async function loadAdminOrders() {

    // Get the container where orders will be rendered.
    
    const list = document.getElementById("adminOrdersList");

    try {

        // Build an optional date range query.

        const dateQuery = getAdminDateQuery();

        // Request the order list from the server.

        const res = await fetch(`${API_BASE}/admin/orders${dateQuery}`, {
            headers: authHeaders()
        });

        const orders = await res.json();

        // Throw an error if the request fails.

        if (!res.ok) {
            throw new Error(orders.message || "Ошибка загрузки заказов");
        }

        // Show a message if no orders are found.

        if (!orders.length) {
            list.innerHTML = `<p class="empty">No orders</p>`;
            return;
        }

        // Generate HTML for each order.

        list.innerHTML = orders.map(order => {

            // Use the order items array or create a fallback item for older orders.

            const items = Array.isArray(order.items) && order.items.length
                ? order.items
                : [{
                    bouquet_title: order.bouquet_title,
                    bouquet_type: order.bouquet_type,
                    price: order.price,
                    quantity: 1
                }];

            return `
                <div class="item">
                    <div><b>Order #${order.id}</b></div>

                    <div style="margin-top:8px;">
                        ${items.map(item => `
                            <div>
                                <b>${item.bouquet_title || "-"}</b> × ${item.quantity || 1}
                                — €${item.price || "-"}
                            </div>
                        `).join("")}
                    </div>

                    <div>${t("user_label")}: ${order.user_name || t("guest_label")}</div>
                    <div>${t("email_label")}: ${order.email || "-"}</div>
                    <div>${t("price_label")}: €${order.price || "-"}</div>
                    <div>${t("message_label")}: ${order.message || "-"}</div>
                    <div>${t("date_label")}: ${formatDate(order.created_at)}</div>
                </div>
            `;
        }).join("");
    } catch (error) {
        list.innerHTML = `<p class="empty">${t("no_orders_admin")}</p>`;
    }
}

// Loads and displays order statistics in the admin panel.

async function loadAdminStats() {

    // Get the container where statistics will be rendered.

    const list = document.getElementById("adminStatsList");

    try {

        // Build an optional date range query.

        const dateQuery = getAdminDateQuery();

        // Request statistics from the server.

        const res = await fetch(`${API_BASE}/admin/stats${dateQuery}`, {
            headers: authHeaders()
        });

        const stats = await res.json();

        // Throw an error if the request fails.

        if (!res.ok) {
            throw new Error(stats.message || "Ошибка загрузки статистики");
        }

        // Render general statistics and top-selling bouquets.

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

// Logs the user out by removing the authentication token.

function logout() {

    // Delete the stored token from local storage.

    localStorage.removeItem("token");

    // Redirect the user to the home page.

    window.location.href = "/index.html";
}

// Initializes the profile page after the HTML document is loaded.

document.addEventListener("DOMContentLoaded", async () => {

    // Load the saved interface language.

    await loadLanguage(currentLang);

    // Attach event handlers to profile forms and buttons.

    document.getElementById("profileForm")?.addEventListener("submit", saveProfile);
    document.getElementById("passwordForm")?.addEventListener("submit", changePassword);
    document.getElementById("avatarInput")?.addEventListener("change", uploadAvatar);
    document.getElementById("logoutBtn")?.addEventListener("click", logout);

    // Reload admin data when the date filter is applied.

    document.getElementById("applyDateFilter")?.addEventListener("click", async () => {
        await loadAdminOrders();
        await loadAdminStats();
    });

    // Handle language switching and refresh displayed data.

    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            await loadLanguage(btn.dataset.lang);
            await loadOrders();
            await loadTests();

            // Reload admin data for super administrators.

            if (currentUser?.role === "superadmin") {
                await loadAdminUsers();
                await loadAdminOrders();
                await loadAdminStats();
            }
        });
    });

    // Load all user and page data.

    await loadUser();
    await loadOrders();
    await loadTests();

    // Update the shopping cart item counter.

    updateCartCount();
});

// Updates the shopping cart item counter in the page header.

function updateCartCount() {

    // Retrieve cart data from local storage.

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    // Calculate the total number of items in the cart.

    const count = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

    // Update the counter element if it exists.
    
    const cartCount = document.getElementById("cartCount");
    if (cartCount) {
        cartCount.textContent = count;
    }
}