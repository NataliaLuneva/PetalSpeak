const AUTH_API = "/api/auth";

let translations = {};
let currentLang = localStorage.getItem("lang") || "ru";

// Opens and closes the mobile navigation menu.
// Adds or removes the "active" CSS class from the navigation element.

function toggleMenu() {

    document.getElementById("nav").classList.toggle("active");

}

// Returns the translated text for the given key.
// If the translation is not found, the key itself is returned.

function t(key) {

    return translations[key] || key;

}

// Loads the selected language file from the /locales folder.
// Saves the chosen language in localStorage and updates all texts on the page.

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

// Applies translations to all elements on the page.
// Elements with data-i18n receive translated text content.
// Elements with data-i18n-placeholder receive translated placeholder text.

function applyTranslations() {

    // Translates regular text content.

    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (translations[key]) {
            el.textContent = translations[key];
        }
    });

    // Translates placeholder text in input fields.

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (translations[key]) {
            el.placeholder = translations[key];
        }
    });
}

// Highlights the currently selected language button.
// Adds the "active" class to the button whose data-lang attribute matches the selected language.

function setActiveLangButton(lang) {

    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.lang === lang);
    });
}

// Retrieves the JWT token from localStorage.
// The token is stored after the user logs in.

function getToken() {

    return localStorage.getItem("token");
}

// Saves the JWT token to localStorage.
// The token is used to keep the user authenticated.

function saveToken(token) {

    localStorage.setItem("token", token);
}

// Removes the JWT token from localStorage.
// Used when the user logs out of the system.

function removeToken() {

    localStorage.removeItem("token");
}

// Displays a message on the authentication page.
// If isError is true, the message is shown in red.
// Otherwise, it is displayed in the default success color.

function showMessage(text, isError = false) {

    const messageEl = document.getElementById("authMessage");
    if (!messageEl) return;

    messageEl.textContent = text;
    messageEl.style.color = isError ? "crimson" : "#567a67";
}

// Shows a loading state for a button.
// Disables the button, saves its current text, and replaces it with the loading text.

function setLoading(button, text) {

    if (!button) return;

    button.disabled = true;
    button.dataset.oldText = button.textContent;
    button.textContent = text;
}

// Restores the button after the loading state.
// Enables the button and returns its original text.

function resetLoading(button) {

    if (!button) return;

    button.disabled = false;

    if (button.dataset.oldText) {
        button.textContent = button.dataset.oldText;
    }
}

// Sends an HTTP request and processes the server response.
// If the request fails, an error with a translated message is thrown.
// If the response contains a messageKey, it is translated and added to the returned data object.

async function apiRequest(url, options = {}) {

    const response = await fetch(url, options);

    // Converts the response to JSON.
    // If the response body is empty, returns an empty object.

    const data = await response.json().catch(() => ({}));

    // Handles server errors.

    if (!response.ok) {

        // Gets the translation key from the response or uses a default error key.

        const messageKey = data.messageKey || "request_error";
        let message = t(messageKey) || data.message || "Request error";

        if (data.count !== undefined) {

            message = message.replace("{count}", data.count);
        }

        throw new Error(message);
    }

    // Translates successful response messages.

    if (data.messageKey) {

        let message = t(data.messageKey);

        if (data.count !== undefined) {
            message = message.replace("{count}", data.count);
        }

        data.message = message;
    }

    return data;
}

// Handles user registration form submission.
// Checks the entered data, validates the password, sends registration data to the server, and switches the user to the login form after success.

async function register(event) {

    event.preventDefault();

    // Gets the form and its submit button.

    const form = event.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');

    const name = document.getElementById("registerName")?.value.trim() || "";
    const email = document.getElementById("registerEmail")?.value.trim() || "";
    const password = document.getElementById("registerPassword")?.value || "";
    const confirmPassword =
        document.getElementById("registerConfirmPassword")?.value || "";

    showMessage("");

    // Checks that all required fields are filled.

    if (!name || !email || !password || !confirmPassword) {

        showMessage(t("fill_required"), true);
        return;
    }

    // Checks that both passwords match.

    if (password !== confirmPassword) {

        showMessage(t("password_mismatch"), true);
        return;
    }

    // Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character.

    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;


    // Validates the password strength.

    if (!passwordRegex.test(password)) {

        showMessage(t("password_short"), true);
        return;
    }

    try {

        // Shows loading state on the submit button.

        setLoading(submitBtn, t("register_loading"));

        // Sends registration data to the backend.

        const data = await apiRequest(`${AUTH_API}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        showMessage(t("register_success"));

        // After a short delay, switches to the login form and fills in the registered email.

        setTimeout(() => {
            switchToLogin();

            const loginEmail = document.getElementById("loginEmail");
            if (loginEmail) {
                loginEmail.value = email;
            }
        }, 700);
    } catch (error) {
        showMessage(error.message || t("request_error"), true);
    }finally {
        resetLoading(submitBtn);
    }
}

// Handles user login form submission.
// Checks the entered credentials, sends them to the server, saves the received JWT token, and redirects the user to the main page after successful login.

async function login(event) {

    event.preventDefault();

    const form = event.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');

    const email = document.getElementById("loginEmail")?.value.trim() || "";
    const password = document.getElementById("loginPassword")?.value || "";

    showMessage("");

    // Checks that both email and password are entered.

    if (!email || !password) {

        showMessage(t("login_error"), true);
        return;
    }

    try {

        // Show loading state on submit button

        setLoading(submitBtn, t("login_loading"));

        // Send login request to server

        const data = await apiRequest(`${AUTH_API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        // Check if token exists in response

        if (!data.token) {
            throw new Error(t("request_error"));
        }

        // Save user token in local storage

        saveToken(data.token);

        // Show success message

        showMessage(t("login_success"));

        // Redirect user to home page

        setTimeout(() => {
            window.location.href = "/index.html";
        }, 500);

    } catch (error) {
        showMessage(error.message || t("request_error"), true);
    } finally {
        resetLoading(submitBtn);
    }
}

// Switches the authentication page to the login form.
// Shows the login block, hides the registration block, and clears any displayed message.

function switchToLogin() {

    // Gets the page elements.

    const loginBlock = document.getElementById("loginBlock");
    const registerBlock = document.getElementById("registerBlock");
    const message = document.getElementById("authMessage");

    // Shows the login form.

    if (loginBlock) loginBlock.classList.remove("hidden");

    // Hides the registration form.

    if (registerBlock) registerBlock.classList.add("hidden");

    // Clears the message text.

    if (message) message.textContent = "";
}

// Switches the authentication page to the registration form.
// Hides the login block, shows the registration block, and clears any displayed message.

function switchToRegister() {

    const loginBlock = document.getElementById("loginBlock");
    const registerBlock = document.getElementById("registerBlock");
    const message = document.getElementById("authMessage");

    // Hides the login form.

    if (loginBlock) loginBlock.classList.add("hidden");

    // Shows the registration form.

    if (registerBlock) registerBlock.classList.remove("hidden");

    // Clears the message text.

    if (message) message.textContent = "";
}

// Logs the user out of the system.
// Removes the JWT token from localStorage and redirects the user to the homepage.

function logout() {

    removeToken();
    window.location.href = "/index.html";
}

// Runs after the HTML page has been fully loaded.
// Loads the saved language, connects form handlers, and adds event listeners to language buttons.

document.addEventListener("DOMContentLoaded", async () => {

    // Loads the current language and applies translations.

    await loadLanguage(currentLang);

    // Gets page elements.
    
    const registerForm = document.getElementById("registerForm");
    const loginForm = document.getElementById("loginForm");
    const showLoginBtn = document.getElementById("showLogin");
    const showRegisterBtn = document.getElementById("showRegister");

    // Attaches the registration form submit handler.

    if (registerForm) {
        registerForm.addEventListener("submit", register);
    }

    // Attaches the login form submit handler.

    if (loginForm) {
        loginForm.addEventListener("submit", login);
    }

    // Adds a click handler to switch to the login form.

    if (showLoginBtn) {
        showLoginBtn.addEventListener("click", switchToLogin);
    }

    // Adds a click handler to switch to the registration form.

    if (showRegisterBtn) {
        showRegisterBtn.addEventListener("click", switchToRegister);
    }

    // Adds click handlers to all language buttons.
    // When clicked, the selected language is loaded.
    
    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            await loadLanguage(btn.dataset.lang);
        });
    });
});