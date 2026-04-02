async function initHeaderAuth() {
    const token = localStorage.getItem("token");
    const guestBlock = document.getElementById("guestBlock");
    const authBlock = document.getElementById("authBlock");

    if (!token) {
        if (guestBlock) guestBlock.style.display = "flex";
        if (authBlock) authBlock.style.display = "none";
        return;
    }

    try {
        const res = await fetch("/api/auth/me", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) {
            localStorage.removeItem("token");
            if (guestBlock) guestBlock.style.display = "flex";
            if (authBlock) authBlock.style.display = "none";
            return;
        }

        const user = await res.json();

        if (guestBlock) guestBlock.style.display = "none";
        if (authBlock) authBlock.style.display = "flex";

        const nameEl = document.getElementById("headerUserName");
        const avatarEl = document.getElementById("headerAvatar");

        if (nameEl) {
            nameEl.textContent = user.name || user.email || "Profile";
        }

        if (avatarEl && user.avatar) {
            avatarEl.src = user.avatar;
        }
    } catch (error) {
        console.error("Header auth error:", error);
    }
}

document.addEventListener("DOMContentLoaded", initHeaderAuth);