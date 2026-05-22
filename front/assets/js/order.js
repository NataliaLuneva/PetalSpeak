const API_BASE = "/api";

// Retrieves the JWT token from localStorage.
// The token is stored after the user logs in and is used for authenticated API requests.

function getToken() {
    return localStorage.getItem("token");
}

// Creates HTTP headers for API requests.
// Always includes the Content-Type header.
// If the user is authenticated, adds the JWT token to the Authorization header.

function getAuthHeaders() {

    // Creates the default headers.

    const headers = {
        "Content-Type": "application/json"
    };

    // Gets the saved JWT token.

    const token = getToken();

    // Adds the Authorization header if a token exists.

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    // Returns the completed headers object.

    return headers;
}

// Loads information about the currently authenticated user.
// If no token is found or the request fails, the function returns null.

async function loadCurrentUser() {

    // Gets the saved JWT token.

    const token = getToken();

    // Returns null if the user is not logged in.

    if (!token) return null;

    try {

        // Requests information about the current user.

        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        // Returns null if the request was unsuccessful.

        if (!res.ok) return null;

        // Returns the user data from the server.

        return await res.json();

    } catch (error) {
        console.error("Load current user error:", error);
        return null;
    }
}

// Retrieves the bouquet selected for ordering from localStorage.
// If no bouquet is stored or the data is invalid, the function returns null.

function getSelectedBouquet() {

    // Reads the saved bouquet data.

    const raw = localStorage.getItem("selectedBouquet");

    // Returns null if no data is found.

    if (!raw) return null;

    try {

        // Converts the JSON string into a JavaScript object.

        return JSON.parse(raw);

    } catch (error) {
        console.error("Selected bouquet parse error:", error);
        return null;
    }
}

// Displays information about the selected bouquet on the order page.
// Shows the bouquet title, type, price, and image.

function fillBouquetInfo() {

    // Loads the selected bouquet from localStorage.

    const bouquet = getSelectedBouquet();

    // Stops if no bouquet is stored.

    if (!bouquet) return;

    // Gets page elements.

    const titleEl = document.getElementById("bouquetTitle");
    const typeEl = document.getElementById("bouquetType");
    const priceEl = document.getElementById("bouquetPrice");
    const imageEl = document.getElementById("bouquetImagePreview");

    // Displays the bouquet title.

    if (titleEl) {
        titleEl.textContent = bouquet.title || "";
    }

    // Displays the bouquet type.

    if (typeEl) {
        typeEl.textContent = bouquet.type || "";
    }

    // Displays the bouquet price.

    if (priceEl) {
        priceEl.textContent =
            bouquet.price ? `€${bouquet.price}` : "";
    }

    // Displays the bouquet image.

    if (imageEl && bouquet.img) {
        imageEl.src = bouquet.img;
    }
}

// Automatically fills the order form with the current user's name and email.
// Existing values entered by the user are not overwritten.

async function autofillUserData() {

    // Loads information about the authenticated user.

    const user = await loadCurrentUser();

    // Stops if the user is not logged in.

    if (!user) return;

    // Gets form input fields.

    const nameInput = document.getElementById("customerName");
    const emailInput = document.getElementById("email");

    // Fills the name field if it is empty.
    
    if (nameInput && !nameInput.value.trim()) {
        nameInput.value = user.name || "";
    }

    // Fills the email field if it is empty.

    if (emailInput && !emailInput.value.trim()) {
        emailInput.value = user.email || "";
    }
}

// Displays a message on the order page.
// Error messages are shown in red, while success messages are displayed in green.

function showMessage(text, isError = false) {

    // Gets the element used for displaying messages.

    const el = document.getElementById("orderMessage");

    // Stops if the element is not found.

    if (!el) return;

    // Sets the message text.

    el.textContent = text;

    // Changes the text color depending on the message type.

    el.style.color = isError ? "crimson" : "#567a67";
}

// Enables or disables the order submit button.
// While the order is being processed, the button is disabled and its text is changed.

function setLoading(isLoading) {

    // Gets the order submit button.

    const submitBtn = document.getElementById("orderSubmitBtn");

    // Stops if the button is not found.
    
    if (!submitBtn) return;

    if (isLoading) {

        // Disables the button to prevent repeated submissions.

        submitBtn.disabled = true;

        // Saves the original button text.

        submitBtn.dataset.originalText = submitBtn.textContent;

        // Displays the loading text.

        submitBtn.textContent = t("processing");
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText || t("order_btn");
    }
}

// Handles order form submission.
// Validates the entered data, sends the order to the server, saves the order information in localStorage, and redirects the user to the success page.

async function submitOrder(event) {

    // Prevents the page from reloading after form submission.

    event.preventDefault();

    // Loads the bouquet selected for ordering.

    const bouquet = getSelectedBouquet();

    // Stops if no bouquet is available.

    if (!bouquet) {
        showMessage(t("bouquet_not_found"), true);
        return;
    }

    // Gets values from the order form.

    const customerName = document.getElementById("customerName")?.value.trim() || "";

    const email = document.getElementById("email")?.value.trim() || "";

    const message = document.getElementById("message")?.value.trim() || "";

    // Checks that required fields are filled.

    if (!customerName || !email) {
        showMessage(t("fill_required_fields"), true);
        return;
    }

    const privacyConsent = document.getElementById("privacyConsent");

    if (!privacyConsent || !privacyConsent.checked) {
        showToast(t("privacy_required"));
        return;
    }

    // Enables the loading state.

    setLoading(true);

    // Clears previous messages.

    showMessage("");

    try {

        // Sends the order data to the backend.

        const res = await fetch(`${API_BASE}/orders`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                customerName,
                email,
                bouquetType: bouquet.type || "",
                bouquetTitle: bouquet.title || "",
                bouquetImage: bouquet.img || "",
                price: bouquet.price || null,
                message,

                cardNumber: document.getElementById("cardNumber")?.value.trim() || "",
                cardDate: document.getElementById("cardDate")?.value.trim() || "",
                cardCvv: document.getElementById("cardCvv")?.value.trim() || ""
            })
        });

        // Reads the server response.

        const data = await res.json();

        // Handles server errors.

        if (!res.ok) {
            throw new Error(
                data.messageKey
                    ? t(data.messageKey)
                    : data.message || t("order_error")
            );
        }

        // Displays a success message.

        showMessage(t("order_success"));

        // Saves the order information for the success page.

        localStorage.setItem(
            "lastOrder",
            JSON.stringify({
                customerName,
                email,
                bouquetTitle: bouquet.title || "",
                bouquetType: bouquet.type || "",
                bouquetImage: bouquet.img || "",
                price: bouquet.price || "",
                message
            })
        );

        // Redirects the user to the success page.

        window.location.href = "/success.html";

    } catch (error) {

        // Logs and displays the error.

        console.error("Submit order error:", error);
        showMessage(
            error.message || t("order_error"),
            true
        );

    } finally {

        // Restores the submit button.

        setLoading(false);
    }
}

// Runs after the page has fully loaded.
// Displays the selected bouquet information, fills in user data automatically, and connects the order form submission handler.

document.addEventListener("DOMContentLoaded", async () => {

    // Shows the selected bouquet on the page.

    fillBouquetInfo();

    // Fills the customer's name and email if the user is logged in.

    await autofillUserData();

    // Gets the order form.

    const form = document.getElementById("orderForm");

    // Attaches the submit handler.
    
    if (form) {
        form.addEventListener("submit", submitOrder);
    }
});