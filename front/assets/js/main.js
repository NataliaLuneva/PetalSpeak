let translations = {};
let currentLang = localStorage.getItem("lang") || "en";
let currentUser = null;
let editingProductId = null;

const MAX_CART_QTY = 10;

// Returns a message shown when the maximum allowed quantity of bouquets in the cart is exceeded.
// The text is displayed in the currently selected language.

function maxQtyMessage() {
    return currentLang === "ru"
        ? "Для большого заказа напишите нам на почту."
        : currentLang === "et"
            ? "Suure tellimuse jaoks kirjuta meile e-posti."
            : "For a large order, please contact us by email.";
}

const burger = document.querySelector(".burger");
const nav = document.querySelector(".nav");

// Opens and closes the mobile navigation menu.
// Toggles the "open" CSS class on the navigation element when the burger button is clicked.

burger.addEventListener("click", () => {
    nav.classList.toggle("open");
});


// Loads the selected language and updates the page content.
// After loading translations, the function refreshes the product list so that product names and descriptions are displayed in the selected language.

async function loadLanguage(lang) {

    try {
        // Stores the selected language.

        currentLang = lang;

        // Loads the translation file from the /locales folder.

        const response = await fetch(`/locales/${lang}.json`);

        // Converts the JSON response into a JavaScript object.

        translations = await response.json();

        // Applies translations to all page elements.

        applyTranslations();

        // Highlights the selected language button.

        setActiveButton(lang);

        // Reloads products in the selected language.

        await loadProducts();

    } catch (e) {
        console.error("Language loading error:", e);
    }
}

// Applies translations to all elements on the page.
// Finds elements with the data-i18n attribute and replaces their HTML content with translated text.

function applyTranslations() {

    document.querySelectorAll("[data-i18n]").forEach((el) => {

        // Gets the translation key from the element.

        const key = el.getAttribute("data-i18n");

        // Inserts the translated text if it exists.

        if (translations[key]) {
            el.innerHTML = translations[key];
        }
    });
}

// Highlights the selected language button.
// Removes the "active" class from all language buttons and adds it to the button that matches the chosen language.

function setActiveButton(lang) {

    document.querySelectorAll(".lang-btn").forEach((btn) => {

        btn.classList.remove("active");

    });

    // Finds the button for the selected language.

    const activeBtn = document.querySelector(`[data-lang="${lang}"]`);

    // Marks the selected button as active.

    if (activeBtn) activeBtn.classList.add("active");
}

// Returns the translated text for the specified key.
// If no translation is found, the key itself is returned.

function t(key) {
    return translations[key] || key;
}

// Displays a temporary toast notification in the top-right corner of the page.

function showToast(message) {

    // Remove the previous toast if it is still visible.

    const oldToast = document.querySelector(".toast-message");
    if (oldToast) oldToast.remove();

    // Create a new toast element.

    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.textContent = message;

    // Add the toast to the page.

    document.body.appendChild(toast);

    // Show the toast with a CSS animation.

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    // Hide the toast after 3 seconds.

    setTimeout(() => {
        toast.classList.remove("show");

        // Remove the element from the DOM after the animation ends.

        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Retrieves the JWT token from localStorage.
// The token is stored after the user logs in.

function getToken() {
    return localStorage.getItem("token");
}

// Creates authorization headers for API requests.
// If a JWT token exists, it is added to the
// Authorization header using the Bearer format.
// If no token is found, an empty object is returned.

function authHeaders() {

    const token = getToken();

    return token
        ? { Authorization: `Bearer ${token}` }
        : {};
}

// USER

// Loads information about the currently authenticated user.
// If no token is found or the request fails, the current user is set to null.
// After loading, the admin interface is updated.

async function loadCurrentUser() {

    const token = getToken();

    // If the user is not logged in, clears the current user data.

    if (!token) {
        currentUser = null;
        toggleAdminUi();
        return;
    }

    try {

        // Requests data about the current user.

        const res = await fetch("/api/auth/me", {
            headers: authHeaders()
        });

        // If the request fails, clears the current user data.

        if (!res.ok) {
            currentUser = null;
            toggleAdminUi();
            return;
        }

        // Saves the received user information.

        currentUser = await res.json();

        // Updates the admin interface.

        toggleAdminUi();

    } catch (error) {
        console.error("Load current user error:", error);
        currentUser = null;
        toggleAdminUi();
    }
}

// Shows or hides the "Add Product" button depending on the current user's role.
// The button is visible only to users with the admin or superadmin role.

function toggleAdminUi() {

    const addBtn = document.getElementById("addProductBtn");

    // Stops if the button is not found.

    if (!addBtn) return;

    // Checks whether the current user has administrative privileges.

    const isAdmin =
        currentUser &&
        (currentUser.role === "admin" || currentUser.role === "superadmin");

    // Shows the button for administrators, hides it for all other users.

    addBtn.style.display = isAdmin ? "inline-flex" : "none";
}

// UI

// Initializes scroll reveal animations.
// Elements with the "reveal" class become visible when they enter the viewport.

function initReveal() {

    // Selects all elements that should be animated.

    const elements = document.querySelectorAll(".reveal");

    // Creates an observer that monitors when elements appear on the screen.

    const observer = new IntersectionObserver((entries, obs) => {

        entries.forEach((entry) => {

            // If the element is visible in the viewport, adds the "is-visible" class.

            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");

                // Stops observing this element after the animation has been triggered.

                obs.unobserve(entry.target);
            }
        });
    });

    // Starts observing each reveal element.

    elements.forEach((el) => observer.observe(el));
}

// Initializes the accordion component.
// When an accordion button is clicked, its content section is expanded or collapsed.

function initAccordion() {

    document.querySelectorAll(".accordion-btn").forEach((btn) => {

        btn.addEventListener("click", () => {

            // Gets the content block located after the button.

            const content = btn.nextElementSibling;

            // Toggles the active state of the button.

            btn.classList.toggle("active");

            // If the content is already expanded, collapse it.
            
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
}
// PRODUCTS

// Loads products from the server and displays them in the assortment section.
// Product titles and descriptions are shown in the currently selected language.
// If the current user is an administrator,
// Edit and Delete buttons are also displayed.

async function loadProducts() {

    const list = document.getElementById("productsList");

    // Stops if the product container is not found.

    if (!list) return;

    try {

        // Requests products from the backend.

        const res = await fetch("/api/products?category=assortment");
        const products = await res.json();

        // Checks whether the request was successful.

        if (!res.ok) {
            throw new Error(
                products.messageKey
                    ? t(products.messageKey)
                    : products.message || "Product loading error"
            );
        }

        // Determines whether the current user has administrative privileges.

        const isAdmin =
            currentUser &&
            (currentUser.role === "admin" ||
             currentUser.role === "superadmin");

        // Creates HTML for all products.

        list.innerHTML = products.map(product => {

            // Selects the product title in the current language.

            const productTitle =
                product[`title_${currentLang}`] ||
                product.title_ru ||
                t(product.title_key);

            // Selects the product description in the current language.

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

                        <!-- Buy button -->
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
                                <!-- Administrator buttons -->
                                <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">

                                    <!-- Edit product button -->
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

                                    <!-- Delete product button -->
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

        // Initializes Buy buttons.

        initBuyButtons();

        // Initializes Edit and Delete buttons.

        initProductActionButtons();

    } catch (error) {
        // Displays an error in the console and on the page if products cannot be loaded.
        console.error("Load products error:", error);
        list.innerHTML = `<p>Product loading error</p>`;
    }
}

// Retrieves the shopping cart from localStorage.
// If the cart does not exist or contains invalid JSON, an empty array is returned.

function getCart() {

    try {

        // Converts the stored JSON string into a JavaScript array.

        return JSON.parse(localStorage.getItem("cart")) || [];
    } catch {
        return [];
    }
}

// Saves the shopping cart to localStorage.
// After saving, updates the cart item counter in the header.

function saveCart(cart) {

    // Converts the cart array into a JSON string nd stores it in the browser.

    localStorage.setItem("cart", JSON.stringify(cart));

    // Refreshes the displayed number of items in the cart.
    
    updateCartCount();
}

// Updates the cart item counter displayed in the header.
// Calculates the total quantity of all products in the cart.

function updateCartCount() {

    // Gets the element that displays the cart count.

    const countEl = document.getElementById("cartCount");

    // Stops if the counter element is not found.

    if (!countEl) return;

    // Loads the current shopping cart.

    const cart = getCart();

    // Calculates the total number of items in the cart.

    const count = cart.reduce((sum, item) => {
        return sum + Number(item.quantity || 1);
    }, 0);
    countEl.textContent = count;
}

// Adds a product to the shopping cart.
// If the product is already in the cart, its quantity is increased by one.
// If the maximum allowed quantity is reached, a warning message is displayed.

function addToCart(product) {

    // Loads the current shopping cart.

    const cart = getCart();

    // Searches for the same product in the cart.

    const existing = cart.find(
        item => String(item.id) === String(product.id)
    );

    if (existing) {

        // Checks whether the maximum quantity is reached.

        if (existing.quantity >= MAX_CART_QTY) {
            showToast(maxQtyMessage());
            return false;
        }

        // Increases the product quantity.
        
        existing.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    // Saves the updated cart.

    saveCart(cart);
    return true;
}

// Initializes all "Buy" buttons on the page.
// When a button is clicked, the selected product is added to the shopping cart.
// After successful addition, the quantity controls are displayed instead of the Buy button.

function initBuyButtons() {

    document.querySelectorAll(".buy-btn").forEach((btn) => {
        btn.addEventListener("click", () => {

            // Creates a product object from the button's data attributes.

            const bouquet = {
                id: btn.dataset.id,
                type: btn.dataset.type,
                title: btn.dataset.title,
                img: btn.dataset.img,
                price: Number(btn.dataset.price) || 0
            };

            // Adds the product to the cart.

            const added = addToCart(bouquet);

            // Stops if the product could not be added.

            if (!added) return;

            // Replaces the Buy button with quantity controls.

            showQuantityControl(btn, bouquet.id);
        });
    });

    // Restores quantity controls for products already in the cart.
    restoreQuantityControls();

}

// Replaces the "Buy" button with quantity controls.
// Displays minus and plus buttons and an input field showing the current quantity of the selected product.

function showQuantityControl(btn, id) {

    // Loads the shopping cart.

    const cart = getCart();

    // Finds the selected product in the cart.

    const item = cart.find(
        p => String(p.id) === String(id)
    );

    // Uses the current quantity if the product exists, otherwise defaults to 1.
    
    const quantity = item ? item.quantity : 1;

    // Replaces the Buy button with quantity controls.

    btn.outerHTML = `
        <div class="cart-qty-box" data-id="${id}">
            <!-- Button to decrease quantity -->
            <button
                type="button"
                class="qty-minus"
                data-id="${id}"
                title="Decrease quantity"
            >
                −
            </button>

            <!-- Input field for manual quantity editing -->
            <input
                class="qty-value qty-input"
                type="number"
                min="1"
                value="${quantity}"
                data-id="${id}"
            >

            <!-- Button to increase quantity -->
            <button
                type="button"
                class="qty-plus"
                data-id="${id}"
                title="Increase quantity"
            >
                +
            </button>
        </div>
    `;

    // Attaches event handlers to the new quantity controls.

    initQuantityButtons();
}

// Restores quantity controls for products that are already present in the shopping cart.
// If a product exists in the cart,  its "Buy" button is replaced with quantity controls.

function restoreQuantityControls() {

    // Loads the current shopping cart.

    const cart = getCart();

    // Checks all "Buy" buttons on the page.

    document.querySelectorAll(".buy-btn").forEach((btn) => {
        const id = btn.dataset.id;

        // Searches for the product in the cart.

        const item = cart.find(
            p => String(p.id) === String(id)
        );

        // If the product is found, replaces the button with quantity controls.

        if (item) {
            showQuantityControl(btn, id);
        }
    });
}

// Initializes quantity controls for products in the cart.
// Allows the user to decrease, increase, or manually enter the product quantity.

function initQuantityButtons() {

    // Handles clicks on the minus buttons.

    document.querySelectorAll(".qty-minus").forEach((btn) => {

        btn.onclick = () => {
            const id = btn.dataset.id;

            // Loads the shopping cart.

            const cart = getCart();

            // Finds the selected product.

            const item = cart.find(
                p => String(p.id) === String(id)
            );

            if (!item) return;

            // Decreases the quantity by one.

            item.quantity -= 1;

            // Removes the product if quantity becomes zero.

            if (item.quantity <= 0) {
                const index = cart.findIndex(
                    p => String(p.id) === String(id)
                );

                cart.splice(index, 1);
                saveCart(cart);

                // Reloads products to restore the Buy button.

                loadProducts();
                return;
            }

            // Saves the updated cart.

            saveCart(cart);

            // Updates the displayed quantity.

            const box = btn.closest(".cart-qty-box");
            if (box) {
                box.querySelector(".qty-value").value =
                    item.quantity;
            }
        };
    });

    // Handles clicks on the plus buttons.

    document.querySelectorAll(".qty-plus").forEach((btn) => {

        btn.onclick = () => {
            const id = btn.dataset.id;
            const cart = getCart();

            // Finds the selected product.

            const item = cart.find(
                p => String(p.id) === String(id)
            );

            if (!item) return;

            // Prevents exceeding the maximum quantity.

            if (item.quantity >= MAX_CART_QTY) {
                showToast(maxQtyMessage());
                return;
            }

            // Increases the quantity by one.

            item.quantity += 1;
            saveCart(cart);

            // Updates the displayed quantity.

            const box = btn.closest(".cart-qty-box");
            if (box) {
                box.querySelector(".qty-value").value =
                    item.quantity;
            }
        };
    });

    // Handles manual quantity changes.

    document.querySelectorAll(".qty-input").forEach((input) => {

        input.onchange = () => {
            const id = input.dataset.id;
            const cart = getCart();

            // Finds the selected product.

            const item = cart.find(
                p => String(p.id) === String(id)
            );

            if (!item) return;

            // Reads the entered value.

            let value = Number(input.value);

            // Sets the minimum quantity to 1.

            if (!value || value < 1) {
                value = 1;
            }

            // Removes any decimal part.

            value = Math.floor(value);

            // Limits the value to the maximum quantity.

            if (value > MAX_CART_QTY) {
                value = MAX_CART_QTY;
                showToast(maxQtyMessage());
            }

            // Saves the new quantity.

            item.quantity = value;
            input.value = value;
            saveCart(cart);
        };
    });
}

// Initializes product action buttons for administrators.
// The Edit button opens the product editing form, and the Delete button removes the selected product.

function initProductActionButtons() {

    // Adds click handlers to all Edit buttons.

    document.querySelectorAll(".edit-product-btn").forEach((btn) => {

        btn.addEventListener("click", () => {

            // Opens the edit form and passes the product data from data attributes.

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

    // Adds click handlers to all Delete buttons.

    document.querySelectorAll(".delete-product-btn").forEach((btn) => {

        btn.addEventListener("click", () => {
            // Deletes the selected product.

            deleteProduct(btn.dataset.id);
        });
    });
}

// Opens the modal window for adding a new product.
// Clears all form fields, resets the editing state, and displays the modal dialog.

function openAddProduct() {

    // Indicates that a new product is being created.

    editingProductId = null;

    // Sets the modal window title.

    document.getElementById("productModalTitle").textContent = t("product_modal_title_add");

    // Clears all input fields.

    document.getElementById("productTitleKey").value = "";
    document.getElementById("productTextKey").value = "";
    document.getElementById("productImage").value = "";
    document.getElementById("productPrice").value = "";

    // Removes the previously stored image path.

    document.getElementById("productImage").dataset.oldImage = "";

    // Sets the default product category.

    document.getElementById("productCategory").value = "assortment";

    // Stores the current language used for editing.

    document.getElementById("productModal").dataset.sourceLang = currentLang || "ru";

    // Displays the modal window.

    document.getElementById("productModal").style.display = "flex";
}

// Opens the modal window for editing an existing product.
// Fills the form with the selected product data and displays the modal dialog.

function openEditProduct(
    id,
    titleText,
    textText,
    sourceLang,
    image,
    price,
    category
) {

    // Stores the ID of the product being edited.

    editingProductId = id;

    // Sets the modal window title.

    document.getElementById("productModalTitle").textContent = t("product_modal_title_edit");

    // Fills the form fields with existing product data.

    document.getElementById("productTitleKey").value = titleText || "";

    document.getElementById("productTextKey").value = textText || "";

    // Clears the file input for a new image.

    document.getElementById("productImage").value = "";

    // Stores the current image path in case a new image is not uploaded.
    document.getElementById("productImage").dataset.oldImage = image || "";

    // Sets the product price.

    document.getElementById("productPrice").value = price || "";

    // Sets the product category.

    document.getElementById("productCategory").value = category || "assortment";

    // Stores the language used for editing.

    document.getElementById("productModal").dataset.sourceLang = sourceLang || currentLang || "ru";

    // Displays the modal window.

    document.getElementById("productModal").style.display = "flex";
}

// Closes the product modal window.
// Hides the dialog used for adding or editing products.

function closeProductModal() {
    document.getElementById("productModal").style.display = "none";
}

// Saves a new product or updates an existing one.
// Collects data from the modal form, uploads an optional image, and sends the information to the server.

async function saveProduct() {

    // Creates a FormData object for sending text fields and file uploads.

    const formData = new FormData();

    // Adds the product title entered by the administrator.

    formData.append(
        "title_source",
        document.getElementById("productTitleKey").value.trim()
    );

    // Adds the product description.

    formData.append(
        "text_source",
        document.getElementById("productTextKey").value.trim()
    );

    // Adds the language of the entered text.

    formData.append(
        "src_lang",
        document.getElementById("productModal").dataset.sourceLang ||
            currentLang ||
            "ru"
    );

    // Adds the product price.

    formData.append(
        "price",
        document.getElementById("productPrice").value.trim()
    );

    // Adds the product category.

    formData.append(
        "category",
        document.getElementById("productCategory").value.trim() ||
            "assortment"
    );

    // If a product is being edited, keeps the existing image path.

    if (editingProductId) {
        formData.append(
            "old_image",
            document.getElementById("productImage").dataset.oldImage || ""
        );
    }

    // Gets the selected image file.

    const fileInput = document.getElementById("productImage");
    const file = fileInput.files[0];

    // Adds the new image if one was selected.

    if (file) {
        formData.append("image", file);
    }

    try {

        // Selects the API endpoint.

        const url = editingProductId
            ? `/api/products/${editingProductId}`
            : "/api/products";

        // Selects the HTTP method.

        const method = editingProductId ? "PUT" : "POST";

        // Sends the product data to the server.

        const res = await fetch(url, {
            method,
            headers: authHeaders(),
            body: formData
        });

        // Reads the server response.

        const data = await res.json();

        // Handles server errors.

        if (!res.ok) {
            const messageKey = data.messageKey || "error_save";

            throw new Error(
                t(messageKey) ||
                data.message ||
                "Save error"
            );
        }

        // Closes the modal window.

        closeProductModal();

        // Reloads the product list.

        await loadProducts();

    } catch (error) {
        showToast(error.message);
    }
}

// Deletes a product from the database.
// Sends a DELETE request to the server and reloads the product list after successful deletion.

async function deleteProduct(id) {

    try {

        // Sends a request to delete the selected product.

        const res = await fetch(`/api/products/${id}`, {
            method: "DELETE",
            headers: authHeaders()
        });

        // Reads the server response.

        const data = await res.json();

        // Handles server errors.

        if (!res.ok) {
            const messageKey = data.messageKey || "error_delete";

            throw new Error(
                t(messageKey) ||
                data.message ||
                t("product_delete_error")
            );
        }

        // Reloads the product list.

        await loadProducts();

    } catch (error) {
        showToast(error.message);
    }
}

// QUESTIONS

// Contains all quiz questions and answer options.
// Each question has a translation key and four possible answers.
// Every answer is associated with a bouquet type that is used to calculate the final quiz result.

const questions = [

    {

        // Translation key for the first question.
        
        question: "q1",

        // Answer options and their corresponding result types.
        
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

// Contains additional quiz questions used in the advanced version of the test.
// Each question has a translation key and four answer options linked to bouquet types.

const advancedQuestions = [

    {

        // Translation key for question 8.

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

// STATE

// Stores the current state of the bouquet recommendation test.

// Index of the currently displayed question.

let currentQuestion = 0;

// Type selected in the latest answer.

let selectedType = null;

// Array containing all answer types chosen by the user.

let answersChosen = [];

// Indicates whether the advanced set of questions is being used.

let advancedMode = false;

// Prevents the test from being refined more than once.

let refinedOnce = false;

// Indicates whether the test has been completed.

let testFinished = false;

// Stores the product object selected as the final result.

let resultProduct = null;

// Stores the resulting bouquet type.

let resultType = null;

// Stores the score for each bouquet category.
// Each selected answer increases the score of its corresponding type.

let scores = {
    love: 0,
    friendship: 0,
    gratitude: 0,
    apology: 0,
    sympathy: 0,
    secret_love: 0
};

// TEST

// Displays the current quiz question and its answer options.
// Restores the previously selected answer if the user navigates back to an earlier question.

function showQuestion() {

    // Gets the page elements.

    const questionEl = document.getElementById("question");
    const answersEl = document.getElementById("answers");
    const prevBtn = document.getElementById("prev-btn");

    // Stops if the required elements are not found.

    if (!questionEl || !answersEl) return;

    // Selects the appropriate question list.
    // Advanced mode uses additional questions.

    const list = advancedMode ? advancedQuestions : questions;

    // Gets the current question object.

    const q = list[currentQuestion];

    // Displays the translated question text.

    questionEl.textContent =
        translations[q.question] || q.question;

    // Clears previous answer buttons.

    answersEl.innerHTML = "";

    // Restores the previously selected answer type.

    selectedType = answersChosen[currentQuestion] || null;

    // Creates buttons for each answer option.

    q.answers.forEach((answer) => {
        const btn = document.createElement("button");

        // Displays the translated answer text.

        btn.textContent =
            translations[answer.text] || answer.text;

        // Highlights the selected answer.

        if (answer.type === selectedType) {
            btn.classList.add("active");
        }

        // Handles answer selection.

        btn.onclick = () => {
            // Saves the selected bouquet type.

            selectedType = answer.type;

            // Removes the active class from all answer buttons.

            document
                .querySelectorAll("#answers button")
                .forEach((b) => b.classList.remove("active"));

            // Highlights the selected button.

            btn.classList.add("active");
        };

        // Adds the answer button to the page.

        answersEl.appendChild(btn);
    });

    // Shows or hides the Previous button.

    if (prevBtn) {
        prevBtn.style.display =
            currentQuestion === 0 ? "none" : "block";
    }
}

// Moves the quiz to the next question.
// Saves the selected answer, updates the score, and shows the final result when the test is finished.

function nextQuestion() {

    // Requires the user to choose an answer first.

    if (!selectedType) {
        showToast(translations["choose_answer"] || "Choose an answer");
        return;
    }

    // If the current question was already answered, removes the old score before saving the new answer.
    
    if (answersChosen[currentQuestion]) {
        const oldType = answersChosen[currentQuestion];
        scores[oldType] -= advancedMode ? 2 : 1;
    }

    // Saves the selected answer type.

    answersChosen[currentQuestion] = selectedType;

    // Adds points to the selected bouquet type.

    scores[selectedType] += advancedMode ? 2 : 1;

    // Selects the current question list.

    const list = advancedMode ? advancedQuestions : questions;

    // Shows the next question or finishes the quiz.

    if (currentQuestion < list.length - 1) {
        currentQuestion++;
        showQuestion();
    } else {
        showResult();
    }
}

// Returns to the previous quiz question.
// Restores the saved answer for that question.

function prevQuestion() {
    // Checks that the current question is not the first one.

    if (currentQuestion > 0) {
        // Moves to the previous question.

        currentQuestion--;
        showQuestion();
    }
}

// Determines the final bouquet type based on the highest score.
// Returns the type with the greatest number of points.

function getResult() {

    // Stores the current highest score.

    let max = -Infinity;

    // Default result type.

    let result = "love";

    // Checks all bouquet categories.

    for (const key in scores) {
        // Updates the result if a higher score is found.

        if (scores[key] > max) {
            max = scores[key];
            result = key;
        }
    }

    return result;
}

// Shows the final quiz result.
// Calculates the result type, loads a matching bouquet, saves the test result, and displays the bouquet to the user.

async function showResult() {

    // Gets quiz page elements.

    const questionEl = document.getElementById("question");
    const answersEl = document.getElementById("answers");
    const nextBtn = document.getElementById("next-btn");
    const prevBtn = document.getElementById("prev-btn");

    // Stops if required elements are missing.

    if (!questionEl || !answersEl) return;

    // Gets the final bouquet type.

    const result = getResult();

    // Saves the result state.

    resultType = result;
    testFinished = true;

    // Clears the question text.

    questionEl.textContent =
        currentLang === "ru" ? "  " :
        currentLang === "et" ? " " :
        " ";

    // Hides navigation buttons.

    if (nextBtn) nextBtn.style.display = "none";
    if (prevBtn) prevBtn.style.display = "none";

    try {

        // Loads a matching bouquet only once.

        if (!resultProduct) {
            const res = await fetch(
                `/api/products?category=catalog&feeling_type=${result}`
            );

            const products = await res.json();

            // Handles loading error.

            if (!res.ok) throw new Error("Product loading error");

            // Shows a message if no bouquet was found.

            if (!products.length) {
                answersEl.innerHTML = `<p>Bouquet not found</p>`;
                return;
            }

            // Selects a random bouquet from matching products.

            resultProduct =
                products[Math.floor(Math.random() * products.length)];
        }

        const product = resultProduct;

        // Gets the bouquet title in the current language.

        const title =
            product[`title_${currentLang}`] ||
            product.title_ru ||
            product.title_en ||
            product.title_et ||
            "Bouquet";

        // Gets the bouquet description in the current language.

        const text =
            product[`text_${currentLang}`] ||
            product.text_ru ||
            product.text_en ||
            "";

        // Saves the test result in the database.

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

        // Creates translated button and subtitle texts for the final quiz result.

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
            currentLang === "ru" ? "Добавлено в корзину" :
            currentLang === "et" ? "Lisa ostukorvi" :
            "Add to cart";

        // Displays the final bouquet result on the page.
        // Shows the bouquet image, title, description, price and action buttons.

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

        // Handles clicks on the "Order this bouquet" button.
        // Saves the selected bouquet in localStorage and redirects the user to the order page.

        document.querySelector(".order-result-btn").onclick = () => {

            // Removes any previously prepared checkout cart.

            localStorage.removeItem("checkoutCart");

            // Saves the recommended bouquet as the selected product.

            localStorage.setItem(
                "selectedBouquet",
                JSON.stringify({
                    id: product.id,
                    type: product.feeling_type || resultType,
                    title,
                    img: product.image,
                    price: Number(product.price) || 0,
                    quantity: 1
                })
            );

            // Redirects the user to the order page.

            window.location.href = "/order.html";
        };

        // Handles clicks on the "Add to cart" button.
        // Adds the recommended bouquet to the shopping cart.

        let testResultAddedToCart = false;

        document.querySelector(".add-cart-result-btn").onclick = () => {
            const cartBtn = document.querySelector(".add-cart-result-btn");

            // Показываем сообщение, если этот букет уже был добавлен из результата теста.
            if (testResultAddedToCart) {
                showToast(
                    currentLang === "ru"
                        ? "Букет из результата теста можно добавить в корзину только один раз"
                        : currentLang === "et"
                            ? "Testi tulemusena saadud kimpu saab ostukorvi lisada ainult ühe korra"
                            : "The bouquet from the test result can only be added to the cart once"
                );
                return;
            }

            // Блокируем кнопку и показываем состояние загрузки.
            cartBtn.disabled = true;
            cartBtn.textContent =
                currentLang === "ru"
                    ? "Добавление..."
                    : currentLang === "et"
                        ? "Lisamine..."
                        : "Adding...";

            setTimeout(() => {
                const added = addToCart({
                    id: product.id,
                    type: product.feeling_type || resultType,
                    title,
                    img: product.image,
                    price: Number(product.price) || 0
                });

                if (added) {
                    // Запоминаем, что этот букет уже был добавлен.
                    testResultAddedToCart = true;

                    // Меняем текст кнопки.
                    cartBtn.disabled = false;

                    cartBtn.textContent =
                        currentLang === "ru"
                            ? "Добавлено в корзину"
                            : currentLang === "et"
                                ? "Lisatud ostukorvi"
                                : "Added to cart";

                    // Показываем уведомление.
                    showToast(
                        currentLang === "ru"
                            ? "Добавлено в корзину"
                            : currentLang === "et"
                                ? "Lisatud ostukorvi"
                                : "Added to cart"
                    );
                } else {
                    // Если добавить не удалось, возвращаем кнопку в исходное состояние.
                    cartBtn.disabled = false;
                    cartBtn.textContent = cartText;
                }
            }, 500);
        };

        // Finds the button for improving the quiz result.

        const refineBtn = document.querySelector(".refine-result-btn");

        if (refineBtn) {
            refineBtn.onclick = () => {

                testResultAddedToCart = false;

                // Enables advanced quiz mode.

                refinedOnce = true;
                advancedMode = true;

                // Resets the previous result.

                testFinished = false;
                resultProduct = null;
                resultType = null;

                // Resets quiz progress.

                currentQuestion = 0;
                selectedType = null;
                answersChosen = [];

                // Clears all scores.

                for (const key in scores) {
                    scores[key] = 0;
                }

                // Shows quiz navigation buttons again.

                if (nextBtn) nextBtn.style.display = "block";
                if (prevBtn) prevBtn.style.display = "none";

                showQuestion();
            };
        }

        } catch (error) {
            console.error(error);
            answersEl.innerHTML = `<p>Bouquet loading error</p>`;
        }
        }

// INIT

// Runs after the page has fully loaded.
// Initializes animations, accordion blocks, user data, language settings, quiz buttons, product modal buttons, and the cart counter.

document.addEventListener("DOMContentLoaded", async () => {

    // Starts scroll reveal animations.

    initReveal();

    // Starts accordion functionality.

    initAccordion();

    // Loads the current logged-in user.

    await loadCurrentUser();

    // Gets quiz navigation buttons.

    const nextBtn = document.getElementById("next-btn");
    const prevBtn = document.getElementById("prev-btn");

    // Checks whether the current page is the test page.

    const isTestPage = !!document.getElementById("question");

    // Loads the saved language or English by default.

    await loadLanguage(localStorage.getItem("lang") || "en");

    // Shows the first quiz question.

    if (isTestPage) {
        showQuestion();
    }

    // Adds handler for the Next button.

    if (nextBtn) {
        nextBtn.onclick = nextQuestion;
    }

    // Adds handler for the Previous button.

    if (prevBtn) {
        prevBtn.onclick = prevQuestion;
    }

    // Adds handlers to language buttons.

    document.querySelectorAll(".lang-btn").forEach((btn) => {

        btn.onclick = async () => {

            const lang = btn.dataset.lang;

            // Saves selected language.

            localStorage.setItem("lang", lang);

            // Reloads translations and page content.

            await loadLanguage(lang);

            // Updates quiz content after language change.

            if (isTestPage) {
                if (testFinished && resultProduct) {
                    showResult();
                } else {
                    showQuestion();
                }
            }
        };
    });

    // Opens the product adding modal.

    document.getElementById("addProductBtn") ?.addEventListener("click", openAddProduct);

    // Closes the product modal.

    document.getElementById("cancelProductBtn")?.addEventListener("click", closeProductModal);

    // Saves a new or edited product.

    document.getElementById("saveProductBtn")?.addEventListener("click", saveProduct);

    // Updates the cart counter in the header.

    updateCartCount();
});