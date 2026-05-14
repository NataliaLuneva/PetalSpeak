// API serveri põhiaadress.
const API = "http://localhost:3000/api";

// Tagastab JWT tokeni brauseri localStorage'ist.
function getToken(){
    return localStorage.getItem("token");
}

// Loob HTTP päringute päised.
// Kui token on olemas, lisatakse Authorization päis.
function getHeaders(){
    const token = getToken();

    if(token){
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    }

    return {
        "Content-Type": "application/json"
    };
}

// Salvestab kasutaja testi tulemuse serverisse.
export async function saveTestResult(data){
    const res = await fetch(`${API}/tests`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data)
    });

    return res.json();
}

// Tagastab superadmini jaoks kõik tellimused.
// Vajadusel lisatakse kuupäevavahemiku filter.
export async function getAdminOrders(from, to) {
    let url = `${API}/admin/orders`;

    // Kui kuupäevad on valitud, lisame need päringu parameetritena.
    if (from && to) {
        url += `?from=${from}&to=${to}`;
    }

    const res = await fetch(url, {
        method: "GET",
        headers: getHeaders()
    });

    return res.json();
}

// Tagastab superadmini statistika.
// Vajadusel lisatakse kuupäevavahemiku filter.
export async function getAdminStats(from, to) {
    let url = `${API}/admin/stats`;

    // Kui kuupäevad on valitud, lisame need päringu parameetritena.
    if (from && to) {
        url += `?from=${from}&to=${to}`;
    }

    const res = await fetch(url, {
        method: "GET",
        headers: getHeaders()
    });

    return res.json();
}

// Этот модуль содержит функции для взаимодействия с серверным API. 
// Сначала определяется базовый адрес API, затем реализуются вспомогательные функции для получения JWT-токена из localStorage и формирования HTTP-заголовков. 
// Если пользователь авторизован, в заголовки автоматически добавляется Authorization: Bearer <token>. 
// Далее реализованы функции для сохранения результата теста, получения списка заказов для супер-администратора и получения статистики с возможностью фильтрации по диапазону дат.