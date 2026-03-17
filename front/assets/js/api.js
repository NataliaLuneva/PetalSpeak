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