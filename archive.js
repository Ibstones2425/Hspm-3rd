// archive.js — Devotional Archive page logic
import { db } from "./config.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let allDevotionals = [];       // [{ id, ...data }], newest first
let searchTerm = "";

document.addEventListener("DOMContentLoaded", () => {
    loadAllDevotionals();
    setupSearch();
    setupModalClose();
});

/** Escape user-supplied text before inserting into innerHTML. */
function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function loadAllDevotionals() {
    const archiveList = document.getElementById("archive-list");
    const loaderContainer = document.getElementById("archive-loader-container");

    try {
        const q = query(collection(db, "devotionals"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);

        loaderContainer.style.display = "none";

        allDevotionals = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            // Skip ghost entries with no title and no content
            if (!data.title && !data.content) return;
            allDevotionals.push({ id: docSnap.id, ...data });
        });

        renderArchive();
    } catch (error) {
        console.error("Error loading archive records:", error);
        loaderContainer.style.display = "none";
        archiveList.innerHTML = `<p class="archive-error">Unable to retrieve historical data. Please try again shortly.</p>`;
    }
}

function renderArchive() {
    const archiveList = document.getElementById("archive-list");

    let devotionals = allDevotionals;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        devotionals = allDevotionals.filter(d =>
            (d.title || "").toLowerCase().includes(term) ||
            (d.scripture || "").toLowerCase().includes(term) ||
            (d.content || "").toLowerCase().includes(term)
        );
    }

    if (devotionals.length === 0) {
        archiveList.innerHTML = searchTerm
            ? `<p class="archive-empty">No devotionals match "${escapeHTML(searchTerm)}".</p>`
            : `<p class="archive-empty">No archived entries found.</p>`;
        return;
    }

    archiveList.innerHTML = devotionals.map(data => {
        const dateString = data.date ? new Date(data.date).toDateString() : "";
        const raw = (data.content || "").replace(/\n/g, " ").trim();
        const snippetText = raw.length > 100 ? raw.substring(0, 100) + "..." : raw;

        return `
            <div class="archive-card">
                <div>
                    <span class="card-date">${escapeHTML(dateString)}</span>
                    <h3 class="card-title">${escapeHTML(data.title) || "Untitled"}</h3>
                    <p class="card-scripture">${escapeHTML(data.scripture)}</p>
                    <p class="card-snippet">${escapeHTML(snippetText)}</p>
                </div>
                <button class="btn btn-outline view-details-btn" data-id="${data.id}">
                    Read Full Message
                </button>
            </div>
        `;
    }).join("");

    document.querySelectorAll(".view-details-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const docId = e.currentTarget.getAttribute("data-id");
            const data = allDevotionals.find(d => d.id === docId);
            if (data) openArchiveModal(data);
        });
    });
}

function setupSearch() {
    const input = document.getElementById("archive-search");
    if (!input) return;

    let debounceTimer;
    input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchTerm = input.value.trim();
            renderArchive();
        }, 200);
    });
}

function openArchiveModal(data) {
    const modal = document.getElementById("archive-modal");

    document.getElementById("modal-arch-title").innerText = data.title || "Untitled";
    document.getElementById("modal-arch-date").innerText = data.date ? new Date(data.date).toDateString() : "";
    document.getElementById("modal-arch-verse").innerText = data.scripture ? `"${data.scripture}"` : "";
    document.getElementById("modal-arch-body").innerText = data.content || "";

    const confessionBox = document.getElementById("modal-arch-confession-box");
    const confessionText = document.getElementById("modal-arch-confession");

    if (data.confession) {
        confessionText.innerText = data.confession;
        confessionBox.style.display = "block";
    } else {
        confessionBox.style.display = "none";
    }

    modal.style.display = "flex";
}

function closeArchiveModal() {
    document.getElementById("archive-modal").style.display = "none";
}

function setupModalClose() {
    const modal = document.getElementById("archive-modal");
    document.getElementById("close-archive-modal-btn").addEventListener("click", closeArchiveModal);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeArchiveModal();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.style.display === "flex") closeArchiveModal();
    });
}
