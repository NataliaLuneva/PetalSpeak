let translations = {};

async function loadLanguage(lang) {
    try {
        const response = await fetch(`/locales/${lang}.json`);
        translations = await response.json();
        applyTranslations();
        setActiveButton(lang);
        await loadOrderPreview();
    } catch (e) {
        console.error("Language load error:", e);
    }
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (translations[key]) {
            el.innerHTML = translations[key];
        }
    });

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const messageInput = document.getElementById("message");

    if (nameInput) nameInput.placeholder = translations["name_placeholder"] || "Your name";
    if (emailInput) emailInput.placeholder = translations["email_placeholder"] || "Email";
    if (messageInput) messageInput.placeholder = translations["message_placeholder"] || "Message for recipient";
}

function setActiveButton(lang) {
    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    const activeBtn = document.querySelector(`[data-lang="${lang}"]`);
    if (activeBtn) activeBtn.classList.add("active");
}

async function loadOrderPreview() {
    const bouquet = JSON.parse(localStorage.getItem("selectedBouquet"));

    if (!bouquet) return;

    const preview = document.getElementById("preview");
    const title = document.getElementById("title");

    if (preview) preview.src = bouquet.img;
    if (title) title.textContent = translations[bouquet.title] || bouquet.title;
}

async function sendOrder() {
    const bouquet = JSON.parse(localStorage.getItem("selectedBouquet"));
    const resultEl = document.getElementById("result");

    if (!bouquet) {
        if (resultEl) resultEl.textContent = translations["no_bouquet_selected"] || "No bouquet selected";
        return;
    }

    const data = {
        customerName: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        bouquetType: bouquet.type,
        bouquetTitle: translations[bouquet.title] || bouquet.title,
        bouquetImage: bouquet.img,
        message: document.getElementById("message").value.trim()
    };

    if (!data.customerName || !data.email) {
        if (resultEl) resultEl.textContent = translations["fill_required_fields"] || "Please fill in all required fields";
        return;
    }

    try {
        const res = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        resultEl.textContent = result.message || result.error || "Order sent";

        if (res.ok) {
            localStorage.removeItem("selectedBouquet");
        }
    } catch (e) {
        console.error(e);
        resultEl.textContent = translations["order_error"] || "Error sending order";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const savedLang = localStorage.getItem("lang") || "en";
    await loadLanguage(savedLang);

    const orderBtn = document.getElementById("orderBtn");
    if (orderBtn) {
        orderBtn.addEventListener("click", sendOrder);
    }

    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const lang = btn.dataset.lang;
            localStorage.setItem("lang", lang);
            await loadLanguage(lang);
        });
    });
});