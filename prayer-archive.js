import { db } from "./config.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let allPrayers = [];
let searchTerm = "";

document.addEventListener("DOMContentLoaded", () => {
    loadPrayerArchive();
    setupSearch();
});

// Helper for escaping HTML (Reused from your app.js)
function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Render the same card style used on the homepage
function renderPrayerCard(data) {
    const date = formatDate(data.date);
    let mediaContent = "";

    if (data.youtubeLink && data.youtubeLink.includes("youtube")) {
        const videoId = data.youtubeLink.split("v=")[1]?.split("&")[0] || data.youtubeLink.split("/").pop();
        mediaContent = `
            <div class="video-wrapper">
                <iframe src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}" title="${escapeHTML(data.title)}" allowfullscreen loading="lazy"></iframe>
            </div>
        `;
    } else if (data.mixlrLink) {
        mediaContent = `
            <div class="audio-card">
                <i class="fas fa-microphone-alt" style="font-size: 2rem; color: var(--primary);"></i>
                <h4 style="margin-top: 10px;">Audio Message</h4>
                <a href="${escapeHTML(data.mixlrLink)}" target="_blank" rel="noopener" class="btn btn-outline" style="margin-top: 10px; font-size: 0.8rem;">
                    <i class="fas fa-play"></i> Listen on Mixlr
                </a>
            </div>
        `;
    }

    return `
        <div class="card archive-card">
            ${mediaContent}
            <h3 class="card-title">${escapeHTML(data.title)}</h3>
            <p style="color: var(--muted); font-size: 0.9rem; margin-top: auto;">
                <i class="far fa-user"></i> ${escapeHTML(data.preacher)} | <i class="far fa-calendar"></i> ${date}
            </p>
        </div>
    `;
}

async function loadPrayerArchive() {
    const listContainer = document.getElementById("prayer-archive-list");
    const loader = document.getElementById("prayer-loader-container");

    try {
        const q = query(collection(db, "sermons"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        
        allPrayers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loader.style.display = "none";
        renderList();
    } catch (error) {
        console.error("Error loading prayers:", error);
        loader.style.display = "none";
        listContainer.innerHTML = `<div class="archive-error">Unable to load the prayer archive. Please try again later.</div>`;
    }
}

function renderList() {
    const listContainer = document.getElementById("prayer-archive-list");
    
    const filtered = allPrayers.filter(p => 
        (p.title || "").toLowerCase().includes(searchTerm) ||
        (p.preacher || "").toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
        listContainer.innerHTML = `<div class="archive-empty">No prayers found matching "${escapeHTML(searchTerm)}".</div>`;
        return;
    }

    listContainer.innerHTML = filtered.map(renderPrayerCard).join("");
}

function setupSearch() {
    const searchInput = document.getElementById("prayer-archive-search");
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchTerm = e.target.value.trim().toLowerCase();
            renderList();
        }, 300);
    });
}
