const translations = {

en:{

about:"About Us",
test:"Feelings Test",

about_title:"About PetalSpeak",

about_text1:"PetalSpeak is a space where emotions become flowers. Instead of choosing bouquets by occasion, we focus on what you feel.",

about_text2:"Through our interactive feelings test, we translate emotions into floral arrangements that express your message naturally and beautifully.",

about_text3:"Every bouquet tells a story — love, admiration, gratitude, celebration or quiet affection.",

about_text4:"Because sometimes flowers say what words cannot.",

tagline:"BOUQUETS THAT SAY WHAT YOU FEEL",

cta:"Take The Feelings Test",

hint:"Not sure what to say?<br/>Flowers know.",

section_title:"Where Feelings Find Their Flower",

section_text1:"We design bouquets based on emotion, not occasion.",

section_text2:"Each arrangement is thoughtfully crafted using fresh seasonal blooms.",

test_title:"Feelings Test",

how:"How It Works",

li1:"Answer a few heartfelt questions",
li2:"We decode your emotions",
li3:"You get a bouquet that speaks for you",

collection_title:"Bouquet Collection",
collection_subtitle:"Love & Romance",

b1_title:"Red Roses",
b1_text:"The purest expression of deep passionate love.",

b2_title:"Peonies",
b2_text:"A symbol of romance and tenderness.",

b3_title:"Tulips",
b3_text:"A symbol of happiness and new beginnings.",

b4_title:"Orchids",
b4_text:"A symbol of rare and elegant love.",

b5_title:"Gerberas",
b5_text:"Bright flowers symbolising joy and sincerity.",

b6_title:"Lisianthus",
b6_text:"A flower expressing admiration and grace.",

b7_title:"Alstroemeria",
b7_text:"A symbol of friendship and loyalty.",

collection_footer:
"Each flower carries its own meaning —<br>but together, they tell one story.<br><br>Yours."

},



et:{

about:"Meist",
test:"Tunnete Test",

about_title:"PetalSpeakist",

about_text1:"PetalSpeak on koht, kus emotsioonid muutuvad lilledeks.",

about_text2:"Meie tunnete test aitab leida kimbu, mis peegeldab sinu emotsioone.",

about_text3:"Iga kimp jutustab loo — armastusest, imetlusest või hoolimisest.",

about_text4:"Mõnikord ütlevad lilled rohkem kui sõnad.",

tagline:"KIMBUD, MIS RÄÄGIVAD SINU TUNDETEST",

cta:"Tee Tunnete Test",

hint:"Ei tea mida öelda?<br>Lilled teavad.",

section_title:"Kus tunded leiavad oma lille",

section_text1:"Loome kimpe emotsiooni põhjal.",

section_text2:"Iga kimp on loodud värsketest hooajalistest lilledest.",

test_title:"Tunnete Test",

how:"Kuidas see töötab",

li1:"Vasta mõnele küsimusele",
li2:"Me tõlgendame sinu emotsioonid",
li3:"Saad sobiva kimbu",

collection_title:"Kimpude kollektsioon",
collection_subtitle:"Armastus ja romantika",

b1_title:"Punased roosid",
b1_text:"Sügava ja kirgliku armastuse sümbol.",

b2_title:"Pojengid",
b2_text:"Romantika ja õnne sümbol.",

b3_title:"Tulbid",
b3_text:"Õnne ja uue alguse sümbol.",

b4_title:"Orhideed",
b4_text:"Elegantsi ja haruldase armastuse sümbol.",

b5_title:"Gerberad",
b5_text:"Rõõmu ja siiruse sümbol.",

b6_title:"Lisianthus",
b6_text:"Õrnuse ja imetluse sümbol.",

b7_title:"Alstroomeeria",
b7_text:"Sõpruse ja lojaalsuse sümbol.",

collection_footer:
"Igal lillel on oma tähendus —<br>kuid koos jutustavad nad ühe loo.<br><br>Sinu."

},



ru:{

about:"О нас",
test:"Тест чувств",

about_title:"О PetalSpeak",

about_text1:"PetalSpeak — место, где эмоции становятся цветами.",

about_text2:"Наш тест помогает подобрать букет, который отражает ваши чувства.",

about_text3:"Каждый букет рассказывает свою историю.",

about_text4:"Иногда цветы говорят больше, чем слова.",

tagline:"БУКЕТЫ, КОТОРЫЕ ГОВОРЯТ О ВАШИХ ЧУВСТВАХ",

cta:"Пройти тест",

hint:"Не знаете что сказать?<br>Цветы знают.",

section_title:"Где чувства находят свой цветок",

section_text1:"Мы создаем букеты исходя из эмоций.",

section_text2:"Каждая композиция создается из свежих цветов.",

test_title:"Тест чувств",

how:"Как это работает",

li1:"Ответьте на несколько вопросов",
li2:"Мы расшифруем эмоции",
li3:"Вы получите рекомендацию букета",

collection_title:"Коллекция букетов",
collection_subtitle:"Любовь и романтика",

b1_title:"Красные розы",
b1_text:"Символ глубокой и страстной любви.",

b2_title:"Пионы",
b2_text:"Символ романтики и счастья.",

b3_title:"Тюльпаны",
b3_text:"Символ счастья и нового начала.",

b4_title:"Орхидеи",
b4_text:"Символ редкой и изысканной любви.",

b5_title:"Герберы",
b5_text:"Символ радости и искренности.",

b6_title:"Лизиантус",
b6_text:"Символ нежности и восхищения.",

b7_title:"Альстромерия",
b7_text:"Символ дружбы и преданности.",

collection_footer:
"У каждого цветка своё значение —<br>но вместе они рассказывают одну историю.<br><br>Твою."

}

};



const buttons = document.querySelectorAll(".lang-btn");



function setLanguage(lang){

document.querySelectorAll("[data-i18n]").forEach(el=>{

const key = el.getAttribute("data-i18n");

if(translations[lang] && translations[lang][key]){
el.innerHTML = translations[lang][key];
}

});

buttons.forEach(btn=>{
btn.classList.remove("active");
});

const activeBtn = document.querySelector(`[data-lang="${lang}"]`);

if(activeBtn){
activeBtn.classList.add("active");
}

}



/* загрузка сохраненного языка */

const savedLang = localStorage.getItem("lang") || "en";

setLanguage(savedLang);



/* переключение языка */

buttons.forEach(btn=>{

btn.addEventListener("click",()=>{

const lang = btn.dataset.lang;

localStorage.setItem("lang",lang);

setLanguage(lang);

});

});



/* reveal animation */

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

initReveal();