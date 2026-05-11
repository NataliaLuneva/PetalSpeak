const API = "http://localhost:3000/api";

function getToken(){
    return localStorage.getItem("token");
}

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

// сохранить тест
export async function saveTestResult(data){
    const res = await fetch(`${API}/tests`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data)
    });

    return res.json();
}

export async function getAdminOrders(from, to) {
    let url = `${API}/admin/orders`;

    // если выбран период, добавляем параметры ?from=YYYY-MM-DD&to=YYYY-MM-DD
    if (from && to) {
        url += `?from=${from}&to=${to}`;
    }

    const res = await fetch(url, {
        method: "GET",
        headers: getHeaders()
    });

    return res.json();
}

// получить статистику для супер-админа
export async function getAdminStats(from, to) {
    let url = `${API}/admin/stats`;

    // если выбран период, добавляем параметры ?from=YYYY-MM-DD&to=YYYY-MM-DD
    if (from && to) {
        url += `?from=${from}&to=${to}`;
    }

    const res = await fetch(url, {
        method: "GET",
        headers: getHeaders()
    });

    return res.json();
}