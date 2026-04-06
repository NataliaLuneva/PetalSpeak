const API_BASE = "/api";

function getToken() {
    return localStorage.getItem("token");
}

function getAuthHeaders() {
    const headers = {
        "Content-Type": "application/json"
    };

    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

async function loadCurrentUser() {
    const token = getToken();
    if (!token) return null;

    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) return null;

        return await res.json();
    } catch (error) {
        console.error("Load current user error:", error);
        return null;
    }
}

function getSelectedBouquet() {
    const raw = localStorage.getItem("selectedBouquet");
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (error) {
        console.error("Selected bouquet parse error:", error);
        return null;
    }
}

function fillBouquetInfo() {
    const bouquet = getSelectedBouquet();
    if (!bouquet) return;

    const titleEl = document.getElementById("bouquetTitle");
    const typeEl = document.getElementById("bouquetType");
    const priceEl = document.getElementById("bouquetPrice");
    const imageEl = document.getElementById("bouquetImagePreview");

    if (titleEl) {
        titleEl.textContent = bouquet.title || "";
    }

    if (typeEl) {
        typeEl.textContent = bouquet.type || "";
    }

    if (priceEl) {
        priceEl.textContent = bouquet.price ? `€${bouquet.price}` : "";
    }

    if (imageEl && bouquet.img) {
        imageEl.src = bouquet.img;
    }
}

async function autofillUserData() {
    const user = await loadCurrentUser();
    if (!user) return;

    const nameInput = document.getElementById("customerName");
    const emailInput = document.getElementById("email");

    if (nameInput && !nameInput.value.trim()) {
        nameInput.value = user.name || "";
    }

    if (emailInput && !emailInput.value.trim()) {
        emailInput.value = user.email || "";
    }
}

function showMessage(text, isError = false) {
    const el = document.getElementById("orderMessage");
    if (!el) return;

    el.textContent = text;
    el.style.color = isError ? "crimson" : "#567a67";
}

function setLoading(isLoading) {
    const submitBtn = document.getElementById("orderSubmitBtn");
    if (!submitBtn) return;

    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = "Processing...";
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText || "Order";
    }
}

async function submitOrder(event) {
    event.preventDefault();

    const bouquet = getSelectedBouquet();

    if (!bouquet) {
        showMessage("Bouquet not found", true);
        return;
    }

    const customerName = document.getElementById("customerName")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const message = document.getElementById("message")?.value.trim() || "";

    if (!customerName || !email) {
        showMessage("Please fill in name and email", true);
        return;
    }

    setLoading(true);
    showMessage("");

    try {
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
                message
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Order error");
        }

        showMessage(data.message || "Order placed successfully");
        localStorage.setItem("lastOrder", JSON.stringify({
            customerName,
            email,
            bouquetTitle: bouquet.title || "",
            bouquetType: bouquet.type || "",
            bouquetImage: bouquet.img || "",
            price: bouquet.price || "",
            message
        }));

        window.location.href = "/success.html";
    } catch (error) {
        console.error("Submit order error:", error);
        showMessage(error.message || "Order error", true);
    } finally {
        setLoading(false);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    fillBouquetInfo();
    await autofillUserData();

    const form = document.getElementById("orderForm");
    if (form) {
        form.addEventListener("submit", submitOrder);
    }
});