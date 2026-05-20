// Initializes the authentication section in the website header.
// Checks whether the user is logged in and displays either guest links or the authenticated user block.

async function initHeaderAuth() {

    // Gets the saved JWT token.

    const token = localStorage.getItem("token");

    // Gets header elements.

    const guestBlock = document.getElementById("guestBlock");
    const authBlock = document.getElementById("authBlock");

    // If there is no token, shows the guest section.

    if (!token) {
        if (guestBlock) guestBlock.style.display = "flex";
        if (authBlock) authBlock.style.display = "none";
        return;
    }

    try {

        // Requests information about the current user.

        const res = await fetch("/api/auth/me", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        // If the token is invalid, removes it and shows the guest section.
        if (!res.ok) {
            localStorage.removeItem("token");

            if (guestBlock) guestBlock.style.display = "flex";
            if (authBlock) authBlock.style.display = "none";
            return;
        }

        // Reads user data from the response.

        const user = await res.json();

        // Shows the authenticated user section.

        if (guestBlock) guestBlock.style.display = "none";
        if (authBlock) authBlock.style.display = "flex";

        // Gets elements for displaying the user's name and avatar.

        const nameEl = document.getElementById("headerUserName");
        const avatarEl = document.getElementById("headerAvatar");

        // Displays the user's name, email, or a default label if no name is available.
        if (nameEl) {
            nameEl.textContent = user.name || user.email || "Profile";
        }

        // Displays the user's avatar if one exists.

        if (avatarEl && user.avatar) {
            avatarEl.src = user.avatar;
        }

    } catch (error) {
        console.error("Header auth error:", error);
    }
}

document.addEventListener("DOMContentLoaded", initHeaderAuth);