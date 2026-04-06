let translations = {};

/* ===== LANGUAGE ===== */

async function loadLanguage(lang) {
    try {
        const response = await fetch(`/locales/${lang}.json`);
        translations = await response.json();

        applyTranslations();
        setActiveButton(lang);
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

function initBuyButtons() {
    document.querySelectorAll(".buy-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const bouquet = {
                type: btn.dataset.type,
                title: btn.dataset.title,
                img: btn.dataset.img,
                price: btn.dataset.price
            };

            localStorage.setItem("selectedBouquet", JSON.stringify(bouquet));
            window.location.href = "/order.html";
        });
    });
}

/* ===== QUESTIONS ===== */

const questions = [
    {
        question: "q1",
        answers: [
            { text: "q1_a1", type: "love" },
            { text: "q1_a2", type: "gratitude" },
            { text: "q1_a3", type: "admiration" },
            { text: "q1_a4", type: "friendship" }
        ]
    },
    {
        question: "q2",
        answers: [
            { text: "q2_a1", type: "love" },
            { text: "q2_a2", type: "celebration" },
            { text: "q2_a3", type: "comfort" },
            { text: "q2_a4", type: "friendship" }
        ]
    },
    {
        question: "q3",
        answers: [
            { text: "q3_a1", type: "love" },
            { text: "q3_a2", type: "gratitude" },
            { text: "q3_a3", type: "friendship" },
            { text: "q3_a4", type: "comfort" }
        ]
    },
    {
        question: "q4",
        answers: [
            { text: "q4_a1", type: "celebration" },
            { text: "q4_a2", type: "love" },
            { text: "q4_a3", type: "admiration" },
            { text: "q4_a4", type: "comfort" }
        ]
    },
    {
        question: "q5",
        answers: [
            { text: "q5_a1", type: "love" },
            { text: "q5_a2", type: "friendship" },
            { text: "q5_a3", type: "gratitude" },
            { text: "q5_a4", type: "admiration" }
        ]
    },
    {
        question: "q6",
        answers: [
            { text: "q6_a1", type: "comfort" },
            { text: "q6_a2", type: "love" },
            { text: "q6_a3", type: "friendship" },
            { text: "q6_a4", type: "celebration" }
        ]
    },
    {
        question: "q7",
        answers: [
            { text: "q7_a1", type: "love" },
            { text: "q7_a2", type: "gratitude" },
            { text: "q7_a3", type: "celebration" },
            { text: "q7_a4", type: "comfort" }
        ]
    }
];

const advancedQuestions = [
    {
        question: "q8",
        answers: [
            { text: "q8_a1", type: "love" },
            { text: "q8_a2", type: "comfort" },
            { text: "q8_a3", type: "admiration" },
            { text: "q8_a4", type: "friendship" }
        ]
    },
    {
        question: "q9",
        answers: [
            { text: "q9_a1", type: "celebration" },
            { text: "q9_a2", type: "love" },
            { text: "q9_a3", type: "gratitude" },
            { text: "q9_a4", type: "comfort" }
        ]
    },
    {
        question: "q10",
        answers: [
            { text: "q10_a1", type: "love" },
            { text: "q10_a2", type: "admiration" },
            { text: "q10_a3", type: "friendship" },
            { text: "q10_a4", type: "gratitude" }
        ]
    },
    {
        question: "q11",
        answers: [
            { text: "q11_a1", type: "comfort" },
            { text: "q11_a2", type: "love" },
            { text: "q11_a3", type: "celebration" },
            { text: "q11_a4", type: "friendship" }
        ]
    },
    {
        question: "q12",
        answers: [
            { text: "q12_a1", type: "gratitude" },
            { text: "q12_a2", type: "admiration" },
            { text: "q12_a3", type: "love" },
            { text: "q12_a4", type: "comfort" }
        ]
    },
    {
        question: "q13",
        answers: [
            { text: "q13_a1", type: "celebration" },
            { text: "q13_a2", type: "friendship" },
            { text: "q13_a3", type: "love" },
            { text: "q13_a4", type: "gratitude" }
        ]
    },
    {
        question: "q14",
        answers: [
            { text: "q14_a1", type: "love" },
            { text: "q14_a2", type: "comfort" },
            { text: "q14_a3", type: "admiration" },
            { text: "q14_a4", type: "celebration" }
        ]
    }
];

/* ===== STATE ===== */

let currentQuestion = 0;
let selectedType = null;
let answersChosen = [];
let advancedMode = false;
let refinedOnce = false;

let scores = {
    love: 0,
    gratitude: 0,
    admiration: 0,
    friendship: 0,
    comfort: 0,
    celebration: 0
};

/* ===== BOUQUETS ===== */

const bouquets = {
    love: { title: "bq_love", img: "/assets/img/b1.jpg", price: 45 },
    friendship: { title: "bq_friendship", img: "/assets/img/b8.jpg", price: 38 },
    gratitude: { title: "bq_gratitude", img: "/assets/img/b15.jpg", price: 42 },
    admiration: { title: "bq_admiration", img: "/assets/img/b3.jpg", price: 47 },
    comfort: { title: "bq_comfort", img: "/assets/img/b29.jpg", price: 40 },
    celebration: { title: "bq_celebration", img: "/assets/img/b20.jpg", price: 50 }
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

function showResult() {
    const questionEl = document.getElementById("question");
    const answersEl = document.getElementById("answers");
    const nextBtn = document.getElementById("next-btn");
    const prevBtn = document.getElementById("prev-btn");

    if (!questionEl || !answersEl) return;

    const result = getResult();
    const bouquet = bouquets[result];
    if (localStorage.getItem("token")) {
        import("/assets/js/test-api.js")
            .then(({ saveTest }) => saveTest({ result }))
            .catch((err) => console.error("Save test error:", err));
    }

    questionEl.textContent = translations["result_title"] || "Your Result";

    let refineHTML = "";

    if (!refinedOnce) {
        refineHTML = `
            <button id="refine-btn" style="margin-top:20px;">
                ${translations["refine_btn"] || "Refine result"}
            </button>
        `;
    }

    answersEl.innerHTML = `
        <img src="${bouquet.img}" style="width:100%; border-radius:10px;">
        <h3>${translations[bouquet.title] || bouquet.title}</h3>
        <p style="margin-top:10px; font-size:18px;">€${bouquet.price}</p>

        <button id="order-btn" style="margin-top:20px;">
            ${translations["order_btn"] || "Order this bouquet"}
        </button>

        ${refineHTML}
    `;

    if (nextBtn) nextBtn.style.display = "none";
    if (prevBtn) prevBtn.style.display = "none";

    const orderBtn = document.getElementById("order-btn");
    if (orderBtn) {
        orderBtn.onclick = () => {
            localStorage.setItem("selectedBouquet", JSON.stringify({
                type: result,
                title: bouquet.title,
                img: bouquet.img,
                price: bouquet.price
            }));

            window.location.href = "/order.html";
        };
    }

    const refineBtn = document.getElementById("refine-btn");
    if (refineBtn) {
        refineBtn.onclick = () => {
            refinedOnce = true;
            advancedMode = true;
            currentQuestion = 0;
            answersChosen = [];

            for (const key in scores) {
                scores[key] = 0;
            }

            if (nextBtn) nextBtn.style.display = "block";
            if (prevBtn) prevBtn.style.display = "none";

            showQuestion();
        };
    }
}

/* ===== INIT ===== */

document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initAccordion();
    initBuyButtons();

    const nextBtn = document.getElementById("next-btn");
    const prevBtn = document.getElementById("prev-btn");
    const isTestPage = !!document.getElementById("question");

    loadLanguage(localStorage.getItem("lang") || "en").then(() => {
        if (isTestPage) {
            showQuestion();
        }
    });

    if (nextBtn) {
        nextBtn.onclick = nextQuestion;
    }

    if (prevBtn) {
        prevBtn.onclick = prevQuestion;
    }

    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.onclick = () => {
            const lang = btn.dataset.lang;
            localStorage.setItem("lang", lang);

            loadLanguage(lang).then(() => {
                if (isTestPage) {
                    showQuestion();
                }
            });
        };
    });
});