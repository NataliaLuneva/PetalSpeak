let translations = {};
let isSubmitting = false;

async function loadLanguage(lang) {
    try {
        const response = await fetch(`/locales/${lang}.json`);
        translations = await response.json();

        applyTranslations();
        setActiveButton(lang);
        await loadOrderPreview();
        await autofillUserData();
    } catch (error) {
        console.error("Language load error:", error);
    }
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (translations[key]) {
            el.innerHTML = translations[key];
        }
    });

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const messageInput = document.getElementById("message");
    const orderBtn = document.getElementById("orderBtn");

    if (nameInput) {
        nameInput.placeholder = translations["name_placeholder"] || "Your name";
    }

    if (emailInput) {
        emailInput.placeholder = translations["email_placeholder"] || "Email";
    }

    if (messageInput) {
        messageInput.placeholder =
            translations["message_placeholder"] || "Message for recipient";
    }

    if (orderBtn && !isSubmitting) {
        orderBtn.textContent = translations["pay_now"] || "Pay now";
    }
}

function setActiveButton(lang) {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.classList.remove("active");
    });

    const activeBtn = document.querySelector(`[data-lang="${lang}"]`);
    if (activeBtn) {
        activeBtn.classList.add("active");
    }
}

async function getCurrentUser() {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
        const response = await fetch("/api/auth/me", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) return null;

        return await response.json();
    } catch (error) {
        console.error("User fetch error:", error);
        return null;
    }
}

async function autofillUserData() {
    const user = await getCurrentUser();
    if (!user) return;

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");

    if (nameInput && user.name && !nameInput.value.trim()) {
        nameInput.value = user.name;
    }

    if (emailInput && user.email && !emailInput.value.trim()) {
        emailInput.value = user.email;
    }
}

async function loadOrderPreview() {
    const bouquet = JSON.parse(localStorage.getItem("selectedBouquet"));
    if (!bouquet) return;

    const preview = document.getElementById("preview");
    const title = document.getElementById("title");

    if (preview) {
        preview.src = bouquet.img;
        preview.alt = translations[bouquet.title] || bouquet.title || "Bouquet";
    }

    if (title) {
        title.textContent = translations[bouquet.title] || bouquet.title;
    }
}

function setSubmittingState(submitting) {
    isSubmitting = submitting;

    const orderBtn = document.getElementById("orderBtn");
    if (!orderBtn) return;

    orderBtn.disabled = submitting;
    orderBtn.style.pointerEvents = submitting ? "none" : "auto";
    orderBtn.textContent = submitting
        ? (translations["sending_order"] || "Sending...")
        : (translations["pay_now"] || "Pay now");
}

function showResult(message, isError = false) {
    const resultEl = document.getElementById("result");
    if (!resultEl) return;

    resultEl.textContent = message;
    resultEl.style.color = isError ? "crimson" : "green";
}

async function sendOrder() {
    if (isSubmitting) return;

    const bouquet = JSON.parse(localStorage.getItem("selectedBouquet"));

    if (!bouquet) {
        showResult(
            translations["no_bouquet_selected"] || "No bouquet selected",
            true
        );
        return;
    }

    const token = localStorage.getItem("token");
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const messageInput = document.getElementById("message");

    let customerName = nameInput ? nameInput.value.trim() : "";
    let email = emailInput ? emailInput.value.trim() : "";
    const message = messageInput ? messageInput.value.trim() : "";

    const user = await getCurrentUser();

    if (user) {
        customerName = user.name || customerName;
        email = user.email || email;

        if (nameInput && user.name) {
            nameInput.value = user.name;
        }

        if (emailInput && user.email) {
            emailInput.value = user.email;
        }
    }

    if (!customerName || !email) {
        showResult(
            translations["fill_required_fields"] ||
                "Please fill in all required fields",
            true
        );
        return;
    }

    const data = {
        customerName,
        email,
        bouquetType: bouquet.type || "",
        bouquetTitle: translations[bouquet.title] || bouquet.title || "",
        bouquetImage: bouquet.img || "",
        price: bouquet.price || null,
        message
    };

    try {
        setSubmittingState(true);
        showResult("");

        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            showResult(
                result.message ||
                    result.error ||
                    translations["order_error"] ||
                    "Error sending order",
                true
            );
            return;
        }

        localStorage.removeItem("selectedBouquet");
        showResult(
            result.message ||
                translations["order_success"] ||
                "Order sent successfully"
        );

        setTimeout(() => {
            window.location.href = "/success.html";
        }, 700);
    } catch (error) {
        console.error("Order send error:", error);
        showResult(
            translations["order_error"] || "Error sending order",
            true
        );
    } finally {
        setSubmittingState(false);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const savedLang = localStorage.getItem("lang") || "en";
    await loadLanguage(savedLang);

    const orderBtn = document.getElementById("orderBtn");
    if (orderBtn) {
        orderBtn.addEventListener("click", sendOrder);
    }

    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const lang = btn.dataset.lang;
            localStorage.setItem("lang", lang);
            await loadLanguage(lang);
        });
    });
});