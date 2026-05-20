const API = "http://localhost:3000/api";

// Retrieves the JWT token from localStorage.
// The token is saved after the user logs in.

function getToken() {
    return localStorage.getItem("token");
}

// Creates HTTP headers for requests.
// If the user is authenticated, the Authorization header is added.
// Otherwise, only the Content-Type header is returned.

function getHeaders() {

    const token = getToken();

    if (token) {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    }

    return {
        "Content-Type": "application/json"
    };
}

// Saves the user's test result to the database.
// Sends a POST request to /api/tests with the test data.

export async function saveTestResult(data) {

    const res = await fetch(`${API}/tests`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data)
    });

    // Returns the server response in JSON format.

    return res.json();
}

// Retrieves all orders for the administrator.
// Optional date range parameters (from and to) can be used to filter orders.
export async function getAdminOrders(from, to) {

    let url = `${API}/admin/orders`;

    // Adds date filter parameters to the URL.

    if (from && to) {
        url += `?from=${from}&to=${to}`;
    }

    const res = await fetch(url, {
        method: "GET",
        headers: getHeaders()
    });

    // Returns the list of orders.

    return res.json();
}

// Retrieves statistical data for the admin dashboard.
// Optional date range parameters can be used to filter the statistics.
export async function getAdminStats(from, to) {

    let url = `${API}/admin/stats`;

    // Adds date filter parameters to the URL.

    if (from && to) {
        url += `?from=${from}&to=${to}`;
    }

    const res = await fetch(url, {
        method: "GET",
        headers: getHeaders()
    });

    // Returns the statistical data.
    
    return res.json();
}