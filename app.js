// app.js — Public site logic for His Spirit and Power Ministry
import { db, IMGBB_API_KEY } from "./config.js";
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast } from "./ui.js";

// ---------------------------------------------------------
// 0. SHARED STATE
// ---------------------------------------------------------
const SERMONS_PAGE_SIZE = 6;

let allSermons = [];       // Every sermon loaded from Firestore, newest first
let sermonsVisible = 0;    // How many are currently rendered
let sermonSearchTerm = ""; // Active search filter text

let currentDevotional = null; // Data for the devotional currently on screen (used by Share)

// ---------------------------------------------------------
// 1. INITIALIZATION
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    loadSermons();
    loadDevotional();
    loadEvents();
    loadTestimonies();

    setupSermonSearch();
    setupLoadMoreSermons();
    setupTestimonyModal();
    setupPrayerForm();
    setupTestimonyForm();
    setupAppointmentForm();
    setupSubscribeForm();
});

// ---------------------------------------------------------
// 2. HELPERS
// ---------------------------------------------------------

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

/** Format a YYYY-MM-DD style date string safely, falling back to the raw value. */
function formatDate(dateStr, options) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", options);
}

/** Current local moment as "YYYY-MM-DDTHH:MM", matching <input type="datetime-local">
 *  and the format devotionals are stored in — used to hide devotionals scheduled
 *  for a future date/time until that moment actually arrives. Also compares
 *  correctly against legacy date-only ("YYYY-MM-DD") entries. */
function nowDateTimeString() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------
// 3. SERMONS — load, search, "See Older Sermons" pagination
// ---------------------------------------------------------
async function loadSermons() {
    const sermonList = document.getElementById("sermon-list");
    const loader = document.getElementById("sermon-loader");
    const loadMoreBtn = document.getElementById("load-more-sermons");

    try {
        const q = query(collection(db, "sermons"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);

        allSermons = [];
        querySnapshot.forEach(docSnap => {
            allSermons.push({ id: docSnap.id, ...docSnap.data() });
        });

        loader.style.display = "none";

        if (allSermons.length === 0) {
            sermonList.innerHTML =
                "<p>There is no Daily Prayer recording available at the moment. Please check back later or visit our Mixlr channel.</p>";
            loadMoreBtn.style.display = "none";
            return;
        }

        sermonsVisible = Math.min(SERMONS_PAGE_SIZE, allSermons.length);
        renderSermons();
    } catch (error) {
        console.error("Error loading sermons:", error);
        loader.style.display = "none";
        sermonList.innerHTML = "<p>Unable to load sermons at this time.</p>";
        loadMoreBtn.style.display = "none";
    }
}

function sermonCardHTML(data) {
    const date = data.date ? formatDate(data.date, { year: "numeric", month: "short", day: "numeric" }) : "";
    let mediaContent = "";

    if (data.youtubeLink && data.youtubeLink.includes("youtube")) {
        const videoId =
            data.youtubeLink.split("v=")[1]?.split("&")[0] ||
            data.youtubeLink.split("/").pop();
        mediaContent = `
            <div class="video-wrapper">
                <iframe src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}" title="${escapeHTML(data.title)}" allowfullscreen loading="lazy"></iframe>
            </div>
        `;
    } else if (data.mixlrLink) {
        mediaContent = `
            <div class="audio-card">
                <i class="fas fa-microphone-alt" style="font-size: 2rem; color: var(--primary-color);"></i>
                <h4 style="margin-top: 10px;">Audio Message</h4>
                <a href="${escapeHTML(data.mixlrLink)}" target="_blank" rel="noopener" class="btn btn-outline" style="margin-top: 10px; font-size: 0.8rem;">
                    <i class="fas fa-play"></i> Listen on Mixlr
                </a>
            </div>
        `;
    }

    return `
        <div class="card">
            ${mediaContent}
            <h3>${escapeHTML(data.title)}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
                <i class="far fa-user"></i> ${escapeHTML(data.preacher)} | <i class="far fa-calendar"></i> ${date}
            </p>
        </div>
    `;
}

/** Renders the sermon grid according to either the active search term or the current page size. */
function renderSermons() {
    const sermonList = document.getElementById("sermon-list");
    const loadMoreBtn = document.getElementById("load-more-sermons");

    let sermonsToShow;

    if (sermonSearchTerm) {
        const term = sermonSearchTerm.toLowerCase();
        sermonsToShow = allSermons.filter(
            s =>
                (s.title || "").toLowerCase().includes(term) ||
                (s.preacher || "").toLowerCase().includes(term)
        );
        loadMoreBtn.style.display = "none";
    } else {
        sermonsToShow = allSermons.slice(0, sermonsVisible);
        loadMoreBtn.style.display = sermonsVisible < allSermons.length ? "inline-flex" : "none";
    }

    if (sermonsToShow.length === 0) {
        sermonList.innerHTML = `<p style="text-align:center; width:100%;">No sermons match "${escapeHTML(sermonSearchTerm)}".</p>`;
        return;
    }

    sermonList.innerHTML = sermonsToShow.map(sermonCardHTML).join("");
}

function setupSermonSearch() {
    const input = document.getElementById("sermon-search");
    if (!input) return;

    let debounceTimer;
    input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            sermonSearchTerm = input.value.trim();
            renderSermons();
        }, 200);
    });
}

function setupLoadMoreSermons() {
    const btn = document.getElementById("load-more-sermons");
    if (!btn) return;

    btn.addEventListener("click", () => {
        sermonsVisible = Math.min(sermonsVisible + SERMONS_PAGE_SIZE, allSermons.length);
        renderSermons();
    });
}

// ---------------------------------------------------------
// 4. DAILY DEVOTIONAL
// ---------------------------------------------------------
async function loadDevotional() {
    const container = document.getElementById("devotional-display");

    try {
        const q = query(
            collection(db, "devotionals"),
            where("date", "<=", nowDateTimeString()),
            orderBy("date", "desc"),
            limit(1)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = `
                <div class="card"><p>No devotional for today. Please check back soon.</p></div>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="archive.html" class="btn btn-outline">
                        <i class="fas fa-archive"></i> View Devotional Archive
                    </a>
                </div>
            `;
            return;
        }

        const data = querySnapshot.docs[0].data();
        currentDevotional = data;

        container.innerHTML = `
            <div class="card" style="border-left: 5px solid var(--secondary-color);">
                <span class="dev-date-badge">${formatDate(data.date, { year: "numeric", month: "long", day: "numeric" })}</span>
                <h2>${escapeHTML(data.title)}</h2>
                <p class="dev-verse">"${escapeHTML(data.scripture)}"</p>
                <div id="devotional-snippet-text" class="dev-preview">
                    ${escapeHTML(data.content).substring(0, 200)}...
                </div>

                <div class="dev-actions">
                    <button id="read-full-devotional-btn" class="btn btn-outline">
                        Read Full Devotional
                    </button>
                    <button id="share-devotional-btn" class="btn btn-outline">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                </div>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="archive.html" class="btn btn-outline">
                    <i class="fas fa-archive"></i> View Devotional Archive
                </a>
            </div>
        `;

        document.getElementById("read-full-devotional-btn").addEventListener("click", () => {
            openDevotionalModal(data);
        });
        document.getElementById("share-devotional-btn").addEventListener("click", shareDevotional);
    } catch (error) {
        console.error("Error loading devotional:", error);
        container.innerHTML = `
            <div class="card"><p>Unable to load today's devotional right now.</p></div>
            <div style="text-align: center; margin-top: 30px;">
                <a href="archive.html" class="btn btn-outline">
                    <i class="fas fa-archive"></i> View Devotional Archive
                </a>
            </div>
        `;
    }
}

function openDevotionalModal(data) {
    const modal = document.getElementById("devotional-modal");

    document.getElementById("modal-dev-title").innerText = data.title || "";
    document.getElementById("modal-dev-date").innerText = formatDate(data.date, { year: "numeric", month: "long", day: "numeric" });
    document.getElementById("modal-dev-verse").innerText = data.scripture ? `"${data.scripture}"` : "";
    document.getElementById("modal-dev-body").innerText = data.content || "";

    const confessionEl = document.getElementById("modal-dev-confession");
    if (data.confession) {
        confessionEl.innerText = data.confession;
        confessionEl.closest(".modal-confession").style.display = "block";
    } else {
        confessionEl.closest(".modal-confession").style.display = "none";
    }

    modal.style.display = "flex";

    const closeBtn = document.getElementById("close-devotional-btn");
    const closeModal = () => { modal.style.display = "none"; };

    closeBtn.onclick = closeModal;
    modal.onclick = (event) => {
        if (event.target === modal) closeModal();
    };
}

/** Build a share message from the currently loaded devotional and open the native share sheet / WhatsApp. */
/** Build a share message from the currently loaded devotional and open the native share sheet / WhatsApp. */
function shareDevotional() {
    if (!currentDevotional) return;

    const { title, date, scripture } = currentDevotional;

    // 1. Truncate the scripture so they have to click the link to read it fully
    const maxScriptureLen = 25; 
    const cleanScripture = (scripture || "").trim();
    const scriptureSnippet = cleanScripture.substring(0, maxScriptureLen);
    const scriptureEllipsis = cleanScripture.length > maxScriptureLen ? "..." : "";

    const shareText =
        `📖 *TODAY'S DEVOTIONAL*\n` +
        `🗓️ *Date:* ${formatDate(date, { year: "numeric", month: "long", day: "numeric" })}\n\n` +
        `🔥 *Topic:* ${title || ""}\n` +
        `📍 *Scripture:* ${scriptureSnippet}${scriptureEllipsis}\n\n` +
        `Read the full message and join the prayer lines here:\n`;

    const shareUrl = "https://hisspiritandpowerministry.org/#devotional";
    const fullMessage = `${shareText}${shareUrl}`;

    if (navigator.share) {
        navigator.share({ title: `Devotional: ${title || ""}`, text: fullMessage })
            .catch(err => console.log("Share dialog closed", err));
    } else {
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage)}`;
        window.open(whatsappUrl, "_blank", "noopener");
    }
}


// ---------------------------------------------------------
// 5. UPCOMING EVENTS
// ---------------------------------------------------------
async function loadEvents() {
    const eventList = document.getElementById("events-list");

    try {
        const q = query(collection(db, "events"), orderBy("date", "asc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            eventList.innerHTML = "<p style='text-align:center; width:100%;'>No upcoming events at the moment.</p>";
            return;
        }

        eventList.innerHTML = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const dateLabel = data.date ? new Date(data.date).toDateString() : "";

            return `
                <div class="card" style="padding: 0; overflow: hidden;">
                    ${data.imageUrl ? `<img src="${escapeHTML(data.imageUrl)}" alt="${escapeHTML(data.title)}" loading="lazy" style="width: 100%; height: 200px; object-fit: cover;">` : ""}
                    <div style="padding: 20px;">
                        <h4 style="color: var(--primary-color);">${escapeHTML(data.title)}</h4>
                        <p style="font-weight: bold; margin: 5px 0;">
                            <i class="far fa-clock"></i> ${dateLabel}
                        </p>
                        <p>${escapeHTML(data.description) || "Join us for this special program."}</p>
                        ${data.eventLink ? `<a href="${escapeHTML(data.eventLink)}" target="_blank" rel="noopener" style="display:inline-block; margin-top:10px; padding:8px 18px; background:var(--primary-color); color:#fff; border-radius:5px; text-decoration:none; font-size:0.9rem;"><i class="fas fa-external-link-alt" style="margin-right:6px;"></i>Learn More</a>` : ""}
                    </div>
                </div>
            `;
        }).join("");
    } catch (error) {
        console.error("Error loading events:", error);
        eventList.innerHTML = "<p style='text-align:center; width:100%;'>Unable to load events right now.</p>";
    }
}

// ---------------------------------------------------------
// 6. TESTIMONIES
// ---------------------------------------------------------
async function loadTestimonies() {
    const list = document.getElementById("testimony-list");

    try {
        const q = query(
            collection(db, "testimonies"),
            where("status", "==", "approved"),
            limit(6)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            list.innerHTML = "<p>No testimonies shared yet. Be the first!</p>";
            return;
        }

        list.innerHTML = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const imgHtml = data.imageUrl
                ? `<img src="${escapeHTML(data.imageUrl)}" alt="${escapeHTML(data.name)}" loading="lazy" class="testimony-avatar">`
                : `<div class="testimony-avatar-placeholder"><i class="fas fa-user"></i></div>`;

            return `
                <div class="card">
                    <div class="testimony-author">
                        ${imgHtml}
                        <div>
                            <h4>${escapeHTML(data.name)}</h4>
                            <small>Testimony</small>
                        </div>
                    </div>
                    <p>${escapeHTML(data.content)}</p>
                </div>
            `;
        }).join("");
    } catch (error) {
        console.error("Error loading testimonies:", error);
        list.innerHTML = "<p>Unable to load testimonies right now.</p>";
    }
}

// ---------------------------------------------------------
// 7. TESTIMONY MODAL (open / close)
// ---------------------------------------------------------
function setupTestimonyModal() {
    const modal = document.getElementById("testimony-modal");
    const openBtn = document.getElementById("open-testimony-btn");
    const closeBtn = document.getElementById("close-testimony-btn");
    if (!modal) return;

    const open = () => { modal.style.display = "flex"; };
    const close = () => { modal.style.display = "none"; };

    if (openBtn) openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) close();
    });
}

// ---------------------------------------------------------
// 8. FORM HANDLERS
// ---------------------------------------------------------
function setupPrayerForm() {
    const form = document.getElementById("prayer-form");
    if (form) form.addEventListener("submit", handlePrayerSubmit);
}

function setupTestimonyForm() {
    const form = document.getElementById("testimony-form");
    if (form) form.addEventListener("submit", handleTestimonySubmit);
}

async function handlePrayerSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    const originalText = btn.innerText;
    btn.innerText = "Sending...";
    btn.disabled = true;

    const prayerData = {
        name: document.getElementById("p-name").value,
        phone: document.getElementById("p-phone").value,
        request: document.getElementById("p-request").value,
        type: document.getElementById("p-type").value,
        status: "New",
        date: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "prayerRequests"), prayerData);
        showToast("Prayer request sent! We are standing in faith with you.");
        e.target.reset();
    } catch (error) {
        console.error("Error sending prayer:", error);
        showToast("Failed to send request. Please try again.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function handleTestimonySubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    const originalText = btn.innerText;
    btn.innerText = "Uploading...";
    btn.disabled = true;

    const fileInput = document.getElementById("t-image");
    const name = document.getElementById("t-name").value;
    const content = document.getElementById("t-content").value;
    let imageUrl = "";

    try {
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append("image", fileInput.files[0]);

            const response = await fetch(
                `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
                { method: "POST", body: formData }
            );

            const result = await response.json();
            if (result.success) {
                imageUrl = result.data.url;
            } else {
                throw new Error("Image upload failed");
            }
        }

        await addDoc(collection(db, "testimonies"), {
            name,
            content,
            imageUrl,
            status: "pending",
            date: serverTimestamp()
        });

        showToast("Testimony submitted for approval! Thank you for sharing.");
        e.target.reset();
        document.getElementById("testimony-modal").style.display = "none";
    } catch (error) {
        console.error("Error submitting testimony:", error);
        showToast("Something went wrong. Please check your connection.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

/**
 * The appointment form has no backend, so it hands off to the visitor's mail client.
 * Built and triggered manually (instead of a native mailto form submit) since native
 * mailto submission is unreliable across mobile browsers.
 */
function setupAppointmentForm() {
    const form = document.getElementById("appointment-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = form.querySelector("[name='name']").value;
        const country = form.querySelector("[name='country']").value;
        const email = form.querySelector("[name='email']").value;
        const phone = form.querySelector("[name='phone']").value;
        const message = form.querySelector("[name='message']").value;

        const subject = `Appointment Request from ${name}`;
        const body =
            `Name: ${name}\n` +
            `Country / Location: ${country}\n` +
            `Email: ${email}\n` +
            `Phone: ${phone}\n\n` +
            `Details:\n${message}`;

        const mailtoUrl =
            `mailto:hisspiritandpowerministry@gmail.com` +
            `?subject=${encodeURIComponent(subject)}` +
            `&body=${encodeURIComponent(body)}`;

        showToast("Opening your email app to send the request...");
        window.location.href = mailtoUrl;
    });
}

function setupSubscribeForm() {
    const form = document.getElementById("subscribe-form");
    const msg = document.getElementById("message");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById("sub-name").value.trim();
        const emailInput = document.getElementById("sub-email").value.trim();
        const btn = form.querySelector("button[type='submit']");

        if (!nameInput) {
            msg.style.color = "#ffd166";
            msg.innerText = "⚠️ Please enter your name.";
            return;
        }
        if (!emailInput) {
            msg.style.color = "#ffd166";
            msg.innerText = "⚠️ Please enter your email address.";
            return;
        }

        btn.disabled = true;
        btn.innerText = "Subscribing...";
        msg.style.color = "rgba(255,255,255,0.7)";
        msg.innerText = "Please wait...";

        try {
            const existing = await getDocs(
                query(collection(db, "subscribers"), where("email", "==", emailInput))
            );

            if (!existing.empty) {
                msg.style.color = "#ffd166";
                msg.innerText = "⚠️ This email is already subscribed!";
                return;
            }

            await addDoc(collection(db, "subscribers"), {
                name: nameInput,
                email: emailInput,
                subscribedAt: serverTimestamp()
            });

            msg.style.color = "#8ce99a";
            msg.innerText = `✅ Thank you ${nameInput}! You're now subscribed.`;
            form.reset();
        } catch (error) {
            console.error("Subscription error:", error);
            msg.style.color = "#ff8787";
            msg.innerText = "❌ Error subscribing. Please try again later.";
        } finally {
            btn.disabled = false;
            btn.innerText = "Subscribe";
        }
    });
}

// ---------------------------------------------------------
// 9. SERVICE WORKER
// ---------------------------------------------------------
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/service-worker.js")
            .then(reg => console.log("Service Worker registered.", reg))
            .catch(err => console.log("Service Worker registration failed:", err));
    });
}
