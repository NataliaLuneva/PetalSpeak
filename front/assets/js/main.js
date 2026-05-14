let translations = {};
let currentLang = localStorage.getItem("lang") || "en";
let currentUser = null;
let editingProductId = null;

/* ===== LANGUAGE ===== */

async function loadLanguage(lang) {
    try {
        currentLang = lang;
        const response = await fetch(`/locales/${lang}.json`);
        translations = await response.json();

        applyTranslations();
        setActiveButton(lang);
        await loadProducts();
    } catch (e) {
        console.error("Ошибка загрузки языка:", e);
    }
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");

        if (translations[key]) {
            el.innerHTML = translations[key];
        }
    });
}

function setActiveButton(lang) {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.classList.remove("active");
    });

    const activeBtn = document.querySelector(`[data-lang="${lang}"]`);
    if (activeBtn) activeBtn.classList.add("active");
}

function t(key) {
    return translations[key] || key;
}

function getToken() {
    return localStorage.getItem("token");
}

function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ===== USER ===== */

async function loadCurrentUser() {
    const token = getToken();
    if (!token) {
        currentUser = null;
        toggleAdminUi();
        return;
    }

    try {
        const res = await fetch("/api/auth/me", {
            headers: authHeaders()
        });

        if (!res.ok) {
            currentUser = null;
            toggleAdminUi();
            return;
        }

        currentUser = await res.json();
        toggleAdminUi();
    } catch (error) {
        console.error("Load current user error:", error);
        currentUser = null;
        toggleAdminUi();
    }
}

function toggleAdminUi() {
    const addBtn = document.getElementById("addProductBtn");
    if (!addBtn) return;

    const isAdmin =
        currentUser &&
        (currentUser.role === "admin" || currentUser.role === "superadmin");

    addBtn.style.display = isAdmin ? "inline-flex" : "none";
}

/* ===== UI ===== */

function initReveal() {
    const elements = document.querySelectorAll(".reveal");

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                obs.unobserve(entry.target);
            }
        });
    });

    elements.forEach((el) => observer.observe(el));
}

function initAccordion() {
    document.querySelectorAll(".accordion-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const content = btn.nextElementSibling;

            btn.classList.toggle("active");

            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
}

/* ===== PRODUCTS ===== */

async function loadProducts() {
    const list = document.getElementById("productsList");
    if (!list) return;

    try {
        const res = await fetch("/api/products?category=assortment");
        const products = await res.json();

        if (!res.ok) {
            throw new Error(products.messageKey ? t(products.messageKey) : products.message || "Ошибка загрузки товаров");
        }

        const isAdmin =
            currentUser &&
            (currentUser.role === "admin" || currentUser.role === "superadmin");

        list.innerHTML = products.map(product => {
            const productTitle =
                product[`title_${currentLang}`] ||
                product.title_ru ||
                t(product.title_key);

            const productText =
                product[`text_${currentLang}`] ||
                product.text_ru ||
                t(product.text_key);

            return `
                <article class="collection-item">
                    <img class="collection-img" src="${product.image}" alt="">
                    <div class="collection-text">
                        <h4>${productTitle}</h4>
                        <p>${productText}</p>

                        <button
                            class="btn buy-btn"
                            data-id="${product.id}"
                            data-type="${product.category}"
                            data-title="${productTitle}"
                            data-img="${product.image}"
                            data-price="${product.price}"
                        >
                            ${t("buy_btn")}
                        </button>

                        ${
                            isAdmin ? `
                                <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
                                    <button
                                        class="profile-btn edit-product-btn"
                                        data-id="${product.id}"
                                        data-title-lang="${product[`title_${currentLang}`] || product.title_ru || product.title_key || ""}"
                                        data-text-lang="${product[`text_${currentLang}`] || product.text_ru || product.text_key || ""}"
                                        data-source-lang="${product[`title_${currentLang}`] ? currentLang : (product.title_ru ? "ru" : currentLang)}"
                                        data-image="${product.image || ""}"
                                        data-price="${product.price}"
                                        data-category="${product.category}"
                                    >
                                        ${t("edit_product_btn")}
                                    </button>

                                    <button
                                        class="profile-btn secondary delete-product-btn"
                                        data-id="${product.id}"
                                    >
                                        ${t("delete_product_btn")}
                                    </button>
                                </div>
                            ` : ""
                        }
                    </div>
                </article>
            `;
        }).join("");

        initBuyButtons();
        initProductActionButtons();
    } catch (error) {
        console.error("Load products error:", error);
        list.innerHTML = `<p>Ошибка загрузки товаров</p>`;
    }
}

function getCart() {
    try {
        return JSON.parse(localStorage.getItem("cart")) || [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const countEl = document.getElementById("cartCount");
    if (!countEl) return;

    const cart = getCart();
    const count = cart.reduce((sum, item) => {
        return sum + Number(item.quantity || 1);
    }, 0);

    countEl.textContent = count;
}

function addToCart(product) {
    const token = getToken();

    if (!token) {
        localStorage.setItem("redirectAfterLogin", window.location.pathname);
        window.location.href = "/login.html";
        return false;
    }

    const cart = getCart();

    const existing = cart.find(item => String(item.id) === String(product.id));

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    saveCart(cart);
    return true;
}

function initBuyButtons() {
    document.querySelectorAll(".buy-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const bouquet = {
                id: btn.dataset.id,
                type: btn.dataset.type,
                title: btn.dataset.title,
                img: btn.dataset.img,
                price: Number(btn.dataset.price) || 0
            };

            const added = addToCart(bouquet);

            if (!added) return;

            showQuantityControl(btn, bouquet.id);
        });
    });

    restoreQuantityControls();
}

function showQuantityControl(btn, id) {
    const cart = getCart();
    const item = cart.find(p => String(p.id) === String(id));
    const quantity = item ? item.quantity : 1;

    btn.outerHTML = `
        <div class="cart-qty-box" data-id="${id}">
            <button type="button" class="qty-minus" data-id="${id}">−</button>
            <input
                class="qty-value qty-input"
                type="number"
                min="1"
                value="${quantity}"
                data-id="${id}"
                style="width:55px; text-align:center;"
            >
            <button type="button" class="qty-plus" data-id="${id}">+</button>
        </div>
    `;

    initQuantityButtons();
}

function restoreQuantityControls() {
    const cart = getCart();

    document.querySelectorAll(".buy-btn").forEach(btn => {
        const id = btn.dataset.id;
        const item = cart.find(p => String(p.id) === String(id));

        if (item) {
            showQuantityControl(btn, id);
        }
    });
}

function initQuantityButtons() {
    document.querySelectorAll(".qty-minus").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const cart = getCart();
            const item = cart.find(p => String(p.id) === String(id));
            if (!item) return;

            item.quantity -= 1;

            if (item.quantity <= 0) {
                const index = cart.findIndex(p => String(p.id) === String(id));
                cart.splice(index, 1);
                saveCart(cart);
                loadProducts();
                return;
            }

            saveCart(cart);

            const box = btn.closest(".cart-qty-box");
            if (box) {
                box.querySelector(".qty-value").value = item.quantity;
            }
        };
    });

    document.querySelectorAll(".qty-plus").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const cart = getCart();
            const item = cart.find(p => String(p.id) === String(id));
            if (!item) return;

            item.quantity += 1;
            saveCart(cart);

            const box = btn.closest(".cart-qty-box");
            if (box) {
                box.querySelector(".qty-value").value = item.quantity;
            }
        };
    });

    document.querySelectorAll(".qty-input").forEach(input => {
        input.onchange = () => {
            const id = input.dataset.id;
            const cart = getCart();
            const item = cart.find(p => String(p.id) === String(id));
            if (!item) return;

            let value = Number(input.value);

            if (!value || value < 1) {
                value = 1;
            }

            value = Math.floor(value);

            item.quantity = value;
            input.value = value;
            saveCart(cart);
        };
    });
}

function initProductActionButtons() {
    document.querySelectorAll(".edit-product-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            openEditProduct(
                btn.dataset.id,
                btn.dataset.titleLang,
                btn.dataset.textLang,
                btn.dataset.sourceLang,
                btn.dataset.image,
                btn.dataset.price,
                btn.dataset.category
            );
        });
    });

    document.querySelectorAll(".delete-product-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            deleteProduct(btn.dataset.id);
        });
    });
}

function openAddProduct() {
    editingProductId = null;
    document.getElementById("productModalTitle").textContent = t("product_modal_title_add");
    document.getElementById("productTitleKey").value = "";
    document.getElementById("productTextKey").value = "";
    document.getElementById("productImage").value = "";
    document.getElementById("productImage").dataset.oldImage = "";
    document.getElementById("productPrice").value = "";
    document.getElementById("productCategory").value = "assortment";
    document.getElementById("productModal").dataset.sourceLang = currentLang || "ru";
    document.getElementById("productModal").style.display = "flex";
}

function openEditProduct(id, titleText, textText, sourceLang, image, price, category) {
    editingProductId = id;
    document.getElementById("productModalTitle").textContent = t("product_modal_title_edit");
    document.getElementById("productTitleKey").value = titleText || "";
    document.getElementById("productTextKey").value = textText || "";
    document.getElementById("productImage").value = "";
    document.getElementById("productImage").dataset.oldImage = image || "";
    document.getElementById("productPrice").value = price || "";
    document.getElementById("productCategory").value = category || "assortment";
    document.getElementById("productModal").dataset.sourceLang = sourceLang || currentLang || "ru";
    document.getElementById("productModal").style.display = "flex";
}

function closeProductModal() {
    document.getElementById("productModal").style.display = "none";
}

async function saveProduct() {
    const formData = new FormData();

    formData.append(
        "title_source",
        document.getElementById("productTitleKey").value.trim()
    );

    formData.append(
        "text_source",
        document.getElementById("productTextKey").value.trim()
    );
    formData.append(
        "src_lang",
        document.getElementById("productModal").dataset.sourceLang || currentLang || "ru"
    );
    formData.append(
        "price",
        document.getElementById("productPrice").value.trim()
    );
    formData.append(
        "category",
        document.getElementById("productCategory").value.trim() || "assortment"
    );

    if (editingProductId) {
        formData.append(
            "old_image",
            document.getElementById("productImage").dataset.oldImage || ""
        );
    }

    const fileInput = document.getElementById("productImage");
    const file = fileInput.files[0];

    if (file) {
        formData.append("image", file);
    }

    try {
        const url = editingProductId
            ? `/api/products/${editingProductId}`
            : "/api/products";

        const method = editingProductId ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: authHeaders(),
            body: formData
        });

        const data = await res.json();

        if (!res.ok) {
            const messageKey = data.messageKey || "error_save";
            throw new Error(t(messageKey) || data.message || "Ошибка сохранения");
        }

        closeProductModal();
        await loadProducts();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteProduct(id) {
    try {
        const res = await fetch(`/api/products/${id}`, {
            method: "DELETE",
            headers: authHeaders()
        });

        const data = await res.json();

        if (!res.ok) {
            const messageKey = data.messageKey || "error_delete";
            throw new Error(t(messageKey) || data.message || t("product_delete_error"));
        }

        await loadProducts();
    } catch (error) {
        alert(error.message);
    }
}

/* ===== QUESTIONS ===== */

const questions = [
    {
        question: "q1",
        answers: [
            { text: "q1_a1", type: "love" },
            { text: "q1_a2", type: "gratitude" },
            { text: "q1_a3", type: "apology" },
            { text: "q1_a4", type: "friendship" }
        ]
    },
    {
        question: "q2",
        answers: [
            { text: "q2_a1", type: "love" },
            { text: "q2_a2", type: "secret_love" },
            { text: "q2_a3", type: "sympathy" },
            { text: "q2_a4", type: "friendship" }
        ]
    },
    {
        question: "q3",
        answers: [
            { text: "q3_a1", type: "love" },
            { text: "q3_a2", type: "gratitude" },
            { text: "q3_a3", type: "friendship" },
            { text: "q3_a4", type: "sympathy" }
        ]
    },
    {
        question: "q4",
        answers: [
            { text: "q4_a1", type: "secret_love" },
            { text: "q4_a2", type: "love" },
            { text: "q4_a3", type: "apology" },
            { text: "q4_a4", type: "sympathy" }
        ]
    },
    {
        question: "q5",
        answers: [
            { text: "q5_a1", type: "love" },
            { text: "q5_a2", type: "friendship" },
            { text: "q5_a3", type: "gratitude" },
            { text: "q5_a4", type: "apology" }
        ]
    },
    {
        question: "q6",
        answers: [
            { text: "q6_a1", type: "sympathy" },
            { text: "q6_a2", type: "love" },
            { text: "q6_a3", type: "friendship" },
            { text: "q6_a4", type: "secret_love" }
        ]
    },
    {
        question: "q7",
        answers: [
            { text: "q7_a1", type: "love" },
            { text: "q7_a2", type: "gratitude" },
            { text: "q7_a3", type: "secret_love" },
            { text: "q7_a4", type: "sympathy" }
        ]
    }
];

const advancedQuestions = [
    {
        question: "q8",
        answers: [
            { text: "q8_a1", type: "love" },
            { text: "q8_a2", type: "sympathy" },
            { text: "q8_a3", type: "apology" },
            { text: "q8_a4", type: "friendship" }
        ]
    },
    {
        question: "q9",
        answers: [
            { text: "q9_a1", type: "secret_love" },
            { text: "q9_a2", type: "love" },
            { text: "q9_a3", type: "gratitude" },
            { text: "q9_a4", type: "sympathy" }
        ]
    },
    {
        question: "q10",
        answers: [
            { text: "q10_a1", type: "love" },
            { text: "q10_a2", type: "apology" },
            { text: "q10_a3", type: "friendship" },
            { text: "q10_a4", type: "gratitude" }
        ]
    },
    {
        question: "q11",
        answers: [
            { text: "q11_a1", type: "sympathy" },
            { text: "q11_a2", type: "love" },
            { text: "q11_a3", type: "secret_love" },
            { text: "q11_a4", type: "friendship" }
        ]
    },
    {
        question: "q12",
        answers: [
            { text: "q12_a1", type: "gratitude" },
            { text: "q12_a2", type: "apology" },
            { text: "q12_a3", type: "love" },
            { text: "q12_a4", type: "sympathy" }
        ]
    },
    {
        question: "q13",
        answers: [
            { text: "q13_a1", type: "secret_love" },
            { text: "q13_a2", type: "friendship" },
            { text: "q13_a3", type: "love" },
            { text: "q13_a4", type: "gratitude" }
        ]
    },
    {
        question: "q14",
        answers: [
            { text: "q14_a1", type: "love" },
            { text: "q14_a2", type: "sympathy" },
            { text: "q14_a3", type: "apology" },
            { text: "q14_a4", type: "secret_love" }
        ]
    }
];
/* ===== STATE ===== */

let currentQuestion = 0;
let selectedType = null;
let answersChosen = [];
let advancedMode = false;
let refinedOnce = false;
let testFinished = false;
let resultProduct = null;
let resultType = null;

let scores = {
    love: 0,
    friendship: 0,
    gratitude: 0,
    apology: 0,
    sympathy: 0,
    secret_love: 0
};

/* ===== TEST ===== */

function showQuestion() {
    const questionEl = document.getElementById("question");
    const answersEl = document.getElementById("answers");
    const prevBtn = document.getElementById("prev-btn");

    if (!questionEl || !answersEl) return;

    const list = advancedMode ? advancedQuestions : questions;
    const q = list[currentQuestion];

    questionEl.textContent = translations[q.question] || q.question;
    answersEl.innerHTML = "";

    selectedType = answersChosen[currentQuestion] || null;

    q.answers.forEach((answer) => {
        const btn = document.createElement("button");
        btn.textContent = translations[answer.text] || answer.text;

        if (answer.type === selectedType) {
            btn.classList.add("active");
        }

        btn.onclick = () => {
            selectedType = answer.type;
            document.querySelectorAll("#answers button").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
        };

        answersEl.appendChild(btn);
    });

    if (prevBtn) {
        prevBtn.style.display = currentQuestion === 0 ? "none" : "block";
    }
}

function nextQuestion() {
    if (!selectedType) {
        alert(translations["choose_answer"] || "Choose an answer");
        return;
    }

    if (answersChosen[currentQuestion]) {
        const oldType = answersChosen[currentQuestion];
        scores[oldType] -= advancedMode ? 2 : 1;
    }

    answersChosen[currentQuestion] = selectedType;
    scores[selectedType] += advancedMode ? 2 : 1;

    const list = advancedMode ? advancedQuestions : questions;

    if (currentQuestion < list.length - 1) {
        currentQuestion++;
        showQuestion();
    } else {
        showResult();
    }
}

function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        showQuestion();
    }
}

function getResult() {
    let max = -Infinity;
    let result = "love";

    for (const key in scores) {
        if (scores[key] > max) {
            max = scores[key];
            result = key;
        }
    }

    return result;
}

async function showResult() {
    const questionEl = document.getElementById("question");
    const answersEl = document.getElementById("answers");
    const nextBtn = document.getElementById("next-btn");
    const prevBtn = document.getElementById("prev-btn");

    if (!questionEl || !answersEl) return;

    const result = getResult();
    resultType = result;
    testFinished = true;

    questionEl.textContent =
        currentLang === "ru" ? "  " :
        currentLang === "et" ? " " :
        " ";

    if (nextBtn) nextBtn.style.display = "none";
    if (prevBtn) prevBtn.style.display = "none";

    try {
        if (!resultProduct) {
            const res = await fetch(`/api/products?category=catalog&feeling_type=${result}`);
            const products = await res.json();

            if (!res.ok) throw new Error("Ошибка загрузки");

            if (!products.length) {
                answersEl.innerHTML = `<p>Букет не найден</p>`;
                return;
            }

            resultProduct = products[Math.floor(Math.random() * products.length)];
        }

        const product = resultProduct;

        const title =
            product[`title_${currentLang}`] ||
            product.title_ru ||
            product.title_en ||
            product.title_et ||
            "Букет";

        const text =
            product[`text_${currentLang}`] ||
            product.text_ru ||
            product.text_en ||
            "";

            await fetch("/api/test-results", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders()
                },
                body: JSON.stringify({
                    result,
                    bouquetTitle: title,
                    bouquetImage: product.image,
                    price: product.price
                })
            });

        const subtitle =
            currentLang === "ru" ? "Ваш идеальный букет" :
            currentLang === "et" ? "Sinu ideaalne kimp" :
            "Your perfect bouquet";

        const orderText =
            currentLang === "ru" ? "Заказать этот букет" :
            currentLang === "et" ? "Telli see kimp" :
            "Order this bouquet";

        const refineText =
            currentLang === "ru" ? "Найти более точное совпадение" :
            currentLang === "et" ? "Leia täpsem sobivus" :
            "Find a more precise match";

        const cartText =
            currentLang === "ru" ? "Добавить в корзину" :
            currentLang === "et" ? "Lisa ostukorvi" :
            "Add to cart";

        answersEl.innerHTML = `
            <div class="result-single">
                <p class="result-subtitle">${subtitle}</p>

                <img src="${product.image}" class="result-img" alt="${title}">

                <h3>${title}</h3>
                <p class="result-description">${text}</p>
                <p class="price">${Number(product.price).toFixed(2)}€</p>

                <button class="btn order-result-btn">${orderText}</button>
                <button class="btn add-cart-result-btn">${cartText}</button>

                ${
                    !refinedOnce
                        ? `<button class="btn refine-result-btn">${refineText}</button>`
                        : ""
                }
            </div>
        `;

        document.querySelector(".order-result-btn").onclick = () => {
            localStorage.removeItem("checkoutCart");

            localStorage.setItem("selectedBouquet", JSON.stringify({
                id: product.id,
                type: product.feeling_type || resultType,
                title,
                img: product.image,
                price: Number(product.price) || 0,
                quantity: 1
            }));

            window.location.href = "/order.html";
        };

        document.querySelector(".add-cart-result-btn").onclick = () => {
            const added = addToCart({
                id: product.id,
                type: product.feeling_type || resultType,
                title,
                img: product.image,
                price: Number(product.price) || 0
            });

            if (added) {
                alert(cartText);
            }
        };

        const refineBtn = document.querySelector(".refine-result-btn");

        if (refineBtn) {
            refineBtn.onclick = () => {
                refinedOnce = true;
                advancedMode = true;
                testFinished = false;
                resultProduct = null;
                resultType = null;

                currentQuestion = 0;
                selectedType = null;
                answersChosen = [];

                for (const key in scores) {
                    scores[key] = 0;
                }

                if (nextBtn) nextBtn.style.display = "block";
                if (prevBtn) prevBtn.style.display = "none";

                showQuestion();
            };
        }

    } catch (error) {
        console.error(error);
        answersEl.innerHTML = `<p>Ошибка загрузки букета</p>`;
    }
}

/* ===== INIT ===== */

document.addEventListener("DOMContentLoaded", async () => {
    initReveal();
    initAccordion();

    await loadCurrentUser();

    const nextBtn = document.getElementById("next-btn");
    const prevBtn = document.getElementById("prev-btn");
    const isTestPage = !!document.getElementById("question");

    await loadLanguage(localStorage.getItem("lang") || "en");

    if (isTestPage) {
        showQuestion();
    }

    if (nextBtn) {
        nextBtn.onclick = nextQuestion;
    }

    if (prevBtn) {
        prevBtn.onclick = prevQuestion;
    }

    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.onclick = async () => {
            const lang = btn.dataset.lang;
            localStorage.setItem("lang", lang);
            await loadLanguage(lang);

            if (isTestPage) {
                if (testFinished && resultProduct) {
                    showResult();
                } else {
                    showQuestion();
                }
            }
        };
    });

    document.getElementById("addProductBtn")?.addEventListener("click", openAddProduct);
    document.getElementById("cancelProductBtn")?.addEventListener("click", closeProductModal);
    document.getElementById("saveProductBtn")?.addEventListener("click", saveProduct);
    updateCartCount();
});