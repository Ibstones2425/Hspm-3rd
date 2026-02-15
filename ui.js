// ui.js — UI interactions, modals, mobile menu, and utilities

/* ===========================
   COPY TO CLIPBOARD
=========================== */
export function copyText(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    navigator.clipboard.writeText(el.innerText).then(() => {
        showToast("Copied to clipboard!");
    });
}

/* ===========================
   TOAST NOTIFICATION
=========================== */
export function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.innerText = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

/* ===========================
   TESTIMONY MODAL
=========================== */
export function toggleTestimonyModal() {
    const modal = document.getElementById("testimony-modal");
    if (!modal) return;

    modal.style.display =
        modal.style.display === "flex" ? "none" : "flex";
}

/* ===========================
   MOBILE NAVIGATION
=========================== */
function setupMobileMenu() {
    const menuToggle = document.getElementById("mobile-menu-toggle");
    const navLinks = document.getElementById("nav-links");
    const navItems = document.querySelectorAll("#nav-links a");

    if (!menuToggle || !navLinks) return;

    // Toggle menu
    menuToggle.addEventListener("click", e => {
        e.stopPropagation();
        navLinks.classList.toggle("active");
    });

    // Close menu when clicking a link
    navItems.forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
        });
    });

    // Close menu when clicking outside
    document.addEventListener("click", e => {
        if (
            !navLinks.contains(e.target) &&
            !menuToggle.contains(e.target)
        ) {
            navLinks.classList.remove("active");
        }
    });
}

/* ===========================
   DOM READY
=========================== */
document.addEventListener("DOMContentLoaded", () => {
    setupMobileMenu();
});