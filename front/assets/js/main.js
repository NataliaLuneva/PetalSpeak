let translations = {};

/* ===== ЗАГРУЗКА ЯЗЫКА ===== */

async function loadLanguage(lang){
    try{
        const response = await fetch(`/locales/${lang}.json`);
        translations = await response.json();

        applyTranslations();
        setActiveButton(lang);

    }catch(e){
        console.error("Ошибка загрузки языка:", e);
    }
}

/* ===== ПЕРЕВОДЫ ===== */

function applyTranslations(){
    document.querySelectorAll("[data-i18n]").forEach(el=>{
        const key = el.getAttribute("data-i18n");

        if(translations[key]){
            el.innerHTML = translations[key];
        }
    });
}

/* ===== АКТИВНАЯ КНОПКА ===== */

function setActiveButton(lang){
    const buttons = document.querySelectorAll(".lang-btn");

    buttons.forEach(btn => btn.classList.remove("active"));

    const activeBtn = document.querySelector(`[data-lang="${lang}"]`);
    if(activeBtn){
        activeBtn.classList.add("active");
    }
}

/* ===== REVEAL ===== */

function initReveal(){
    const elements = document.querySelectorAll(".reveal");

    const observer = new IntersectionObserver((entries, obs)=>{
        entries.forEach(entry=>{
            if(entry.isIntersecting){
                entry.target.classList.add("is-visible");
                obs.unobserve(entry.target);
            }
        });
    });

    elements.forEach(el => observer.observe(el));
}

/* ===== ACCORDION ===== */

function initAccordion(){
    document.querySelectorAll(".accordion-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const content = btn.nextElementSibling;

            btn.classList.toggle("active");

            if(content.style.maxHeight){
                content.style.maxHeight = null;
            }else{
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
}

/* ===== ВОПРОСЫ ===== */

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

/* ===== СОСТОЯНИЕ ===== */

let currentQuestion = 0;
let selectedType = null;
let answersChosen = [];

let scores = {
    love: 0,
    gratitude: 0,
    admiration: 0,
    friendship: 0,
    comfort: 0,
    celebration: 0
};

/* ===== БУКЕТЫ ===== */

const bouquets = {
    love: {
        title: "bq_love",
        img: "/assets/img/b1.jpg"
    },
    friendship: {
        title: "bq_friendship",
        img: "/assets/img/b8.jpg"
    },
    gratitude: {
        title: "bq_gratitude",
        img: "/assets/img/b15.jpg"
    },
    admiration: {
        title: "bq_admiration",
        img: "/assets/img/b3.jpg"
    },
    comfort: {
        title: "bq_comfort",
        img: "/assets/img/b29.jpg"
    },
    celebration: {
        title: "bq_celebration",
        img: "/assets/img/b20.jpg"
    }
};

/* ===== ПОКАЗ ВОПРОСА ===== */

function showQuestion() {
    const questionEl = document.getElementById("question");
    const answersEl = document.getElementById("answers");
    const prevBtn = document.getElementById("prev-btn");

    if (!questionEl) return;

    const q = questions[currentQuestion];

    questionEl.textContent = translations[q.question];
    answersEl.innerHTML = "";

    selectedType = answersChosen[currentQuestion] || null;

    q.answers.forEach(answer => {
        const btn = document.createElement("button");
        btn.textContent = translations[answer.text];

        if (answer.type === selectedType) {
            btn.classList.add("active");
        }

        btn.onclick = () => {
            selectedType = answer.type;

            document.querySelectorAll("#answers button")
                .forEach(b => b.classList.remove("active"));

            btn.classList.add("active");
        };

        answersEl.appendChild(btn);
    });

    if (prevBtn) {
        prevBtn.style.display = currentQuestion === 0 ? "none" : "block";
    }
}

/* ===== NEXT ===== */

function nextQuestion() {
    if (!selectedType) {
        alert(translations["choose_answer"]);
        return;
    }

    // если уже был ответ — убираем старый score
    if (answersChosen[currentQuestion]) {
        scores[answersChosen[currentQuestion]]--;
    }

    answersChosen[currentQuestion] = selectedType;
    scores[selectedType]++;

    currentQuestion++;

    if (currentQuestion < questions.length) {
        showQuestion();
    } else {
        showResult();
    }
}

/* ===== PREVIOUS ===== */

function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        showQuestion();
    }
}

/* ===== РЕЗУЛЬТАТ ===== */

function getResult() {
    let max = 0;
    let result = "love";

    for (let key in scores) {
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

    const result = getResult();
    const bouquet = bouquets[result];

    questionEl.textContent = translations["result_title"];

    answersEl.innerHTML = `
        <img src="${bouquet.img}" style="width:100%; border-radius:10px; margin-bottom:15px;">
        <h3>${translations[bouquet.title]}</h3>
    `;

    if (nextBtn) nextBtn.style.display = "none";
    if (prevBtn) prevBtn.style.display = "none";
}

/* ===== СТАРТ ===== */

document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initAccordion();

    const nextBtn = document.getElementById("next-btn");
    const prevBtn = document.getElementById("prev-btn");

    const savedLang = localStorage.getItem("lang") || "en";

    loadLanguage(savedLang).then(() => {
        showQuestion();
    });

    if (nextBtn) nextBtn.onclick = nextQuestion;
    if (prevBtn) prevBtn.onclick = prevQuestion;

    const buttons = document.querySelectorAll(".lang-btn");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const lang = btn.dataset.lang;

            localStorage.setItem("lang", lang);

            loadLanguage(lang).then(() => {
                currentQuestion = 0;
                answersChosen = [];
                selectedType = null;

                // сброс scores
                for (let key in scores) {
                    scores[key] = 0;
                }

                if (nextBtn) nextBtn.style.display = "block";

                showQuestion();
            });
        });
    });
});