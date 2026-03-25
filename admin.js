import { db, auth, IMGBB_API_KEY } from "./config.js";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    query,
    orderBy,
    where,
    serverTimestamp,
    setDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ---------------------------------------------------------
// 1. AUTHENTICATION CHECK
// ---------------------------------------------------------
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        initDashboard();
    }
});

document.getElementById("logout-btn").addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
});

// ---------------------------------------------------------
// 2. INITIALIZATION
// ---------------------------------------------------------
function initDashboard() {
    loadStats();
    loadSermons();
    loadDevotionals();
    loadEvents();
    loadTestimonies();
    loadPrayers();
    loadSettings();
    loadSubscribers();
    loadAnalytics();

    document.getElementById("form-sermon").addEventListener("submit", handleAddSermon);
    document.getElementById("form-devotional").addEventListener("submit", handleAddDevotional);
    document.getElementById("form-event").addEventListener("submit", handleAddEvent);
    document.getElementById("settings-form").addEventListener("submit", handleSaveSettings);
    document.getElementById("form-bulk-email").addEventListener("submit", handleSendBulkEmail);
}

// ---------------------------------------------------------
// 3. STATS & OVERVIEW
// ---------------------------------------------------------
async function loadStats() {
    const sermons     = await getDocs(collection(db, "sermons"));
    const prayers     = await getDocs(collection(db, "prayerRequests"));
    const testimonies = await getDocs(collection(db, "testimonies"));
    const events      = await getDocs(collection(db, "events"));

    document.getElementById("stat-sermons").innerText     = sermons.size;
    document.getElementById("stat-prayers").innerText     = prayers.size;
    document.getElementById("stat-testimonies").innerText = testimonies.size;
    document.getElementById("stat-events").innerText      = events.size;
}

// ---------------------------------------------------------
// 4. SERMON MANAGEMENT
// ---------------------------------------------------------
async function handleAddSermon(e) {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.innerText = "Publishing...";

    try {
        await addDoc(collection(db, "sermons"), {
            title:       document.getElementById("sermon-title").value,
            preacher:    document.getElementById("sermon-preacher").value,
            date:        document.getElementById("sermon-date").value,
            youtubeLink: document.getElementById("sermon-youtube").value,
            mixlrLink:   document.getElementById("sermon-mixlr").value,
            createdAt:   serverTimestamp()
        });

        showToast("Sermon Published!");
        e.target.reset();
        document.getElementById("modal-sermon").style.display = "none";
        loadSermons();
        loadStats();
    } catch (error) {
        console.error(error);
        alert("Error adding sermon");
    } finally {
        btn.innerText = "Publish Sermon";
    }
}

async function loadSermons() {
    const tbody = document.getElementById("table-sermons");
    tbody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";

    const q        = query(collection(db, "sermons"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    tbody.innerHTML = "";
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const type = data.youtubeLink ? "Video" : "Audio";

        tbody.innerHTML += `
            <tr>
                <td>${data.date}</td>
                <td>${data.title}</td>
                <td>${data.preacher}</td>
                <td><span class="status-badge approved">${type}</span></td>
                <td>
                    <button class="action-btn btn-delete" onclick="window.deleteItem('sermons', '${docSnap.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// ---------------------------------------------------------
// 5. DEVOTIONAL MANAGEMENT
// ---------------------------------------------------------
async function handleAddDevotional(e) {
    e.preventDefault();

    try {
        await addDoc(collection(db, "devotionals"), {
            date:      document.getElementById("dev-date").value,
            title:     document.getElementById("dev-title").value,
            scripture: document.getElementById("dev-scripture").value,
            content:   document.getElementById("dev-content").value,
            createdAt: serverTimestamp()
        });

        showToast("Devotional Published!");
        e.target.reset();
        document.getElementById("modal-devotional").style.display = "none";
        loadDevotionals();
    } catch (error) {
        console.error(error);
        alert("Error adding devotional");
    }
}

async function loadDevotionals() {
    const tbody = document.getElementById("table-devotionals");
    const q     = query(collection(db, "devotionals"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    tbody.innerHTML = "";
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        tbody.innerHTML += `
            <tr>
                <td>${data.date}</td>
                <td>${data.title}</td>
                <td>${data.scripture}</td>
                <td>
                    <button class="action-btn btn-delete" onclick="window.deleteItem('devotionals', '${docSnap.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// ---------------------------------------------------------
// 6. EVENT MANAGEMENT (With ImgBB Upload)
// ---------------------------------------------------------
async function handleAddEvent(e) {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.innerText = "Uploading Image...";
    btn.disabled  = true;

    const fileInput = document.getElementById("event-image");

    try {
        let imageUrl = "";
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

        await addDoc(collection(db, "events"), {
            title:       document.getElementById("event-title").value,
            date:        document.getElementById("event-date").value,
            description: document.getElementById("event-desc").value,
            imageUrl,
            createdAt:   serverTimestamp()
        });

        showToast("Event Created!");
        e.target.reset();
        document.getElementById("modal-event").style.display = "none";
        loadEvents();
        loadStats();
    } catch (error) {
        console.error(error);
        alert("Failed to create event. Check console.");
    } finally {
        btn.innerText = "Create Event";
        btn.disabled  = false;
    }
}

async function loadEvents() {
    const grid = document.getElementById("events-grid-admin");
    const q    = query(collection(db, "events"), orderBy("date", "asc"));
    const snapshot = await getDocs(q);

    grid.innerHTML = "";
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        grid.innerHTML += `
            <div class="card" style="padding:15px; position:relative;">
                <img src="${data.imageUrl}" style="height:100px; width:100%; object-fit:cover; border-radius:8px;">
                <h4 style="margin:10px 0 5px;">${data.title}</h4>
                <small>${new Date(data.date).toDateString()}</small>
                <button onclick="window.deleteItem('events', '${docSnap.id}')"
                    style="position:absolute; top:10px; right:10px; background:red; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`;
    });
}

// ---------------------------------------------------------
// 7. TESTIMONY MANAGEMENT
// ---------------------------------------------------------
async function loadTestimonies() {
    const tbody = document.getElementById("table-testimonies");
    const q     = query(collection(db, "testimonies"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    tbody.innerHTML = "";
    snapshot.forEach(docSnap => {
        const data        = docSnap.data();
        const statusClass = data.status === "approved" ? "approved" : "pending";

        tbody.innerHTML += `
            <tr>
                <td>${data.name}</td>
                <td>${data.content.substring(0, 50)}...</td>
                <td><span class="status-badge ${statusClass}">${data.status}</span></td>
                <td>
                    ${data.status !== "approved"
                        ? `<button class="action-btn btn-approve" onclick="window.updateStatus('testimonies', '${docSnap.id}', 'approved')"><i class="fas fa-check"></i></button>`
                        : ""
                    }
                    <button class="action-btn btn-delete" onclick="window.deleteItem('testimonies', '${docSnap.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
}

// ---------------------------------------------------------
// 8. PRAYER REQUESTS
// ---------------------------------------------------------
async function loadPrayers() {
    const tbody = document.getElementById("table-prayers");
    const q     = query(collection(db, "prayerRequests"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    tbody.innerHTML = "";
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const date = data.date
            ? new Date(data.date.seconds * 1000).toLocaleDateString()
            : "N/A";

        tbody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>${data.name}<br><small>${data.phone}</small></td>
                <td>${data.request}</td>
                <td>${data.type}</td>
                <td>
                    <button class="action-btn btn-edit" title="Mark Prayed" onclick="window.deleteItem('prayerRequests', '${docSnap.id}')">
                        <i class="fas fa-check-double"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// ---------------------------------------------------------
// 9. SETTINGS (GIVING DETAILS)
// ---------------------------------------------------------
async function handleSaveSettings(e) {
    e.preventDefault();
    try {
        await setDoc(doc(db, "settings", "giving"), {
            bankName:      document.getElementById("set-bank").value,
            accountNumber: document.getElementById("set-account-num").value,
            accountName:   document.getElementById("set-account-name").value
        });
        showToast("Giving details updated!");
    } catch (error) {
        console.error(error);
        alert("Failed to save settings.");
    }
}

async function loadSettings() {
    try {
        // Settings loaded on demand
    } catch (error) {
        console.log("Settings not initialized yet.");
    }
}

// ---------------------------------------------------------
// 10. ANALYTICS
// ---------------------------------------------------------
async function loadAnalytics() {
    const el = id => document.getElementById(id);
    if (!el("analytics-total")) return;

    try {
        const snapshot = await getDocs(collection(db, "pageViews"));
        const docs     = [];
        snapshot.forEach(d => docs.push(d.data()));

        const total = docs.length;

        // Today
        const todayStr = new Date().toDateString();
        const today    = docs.filter(d =>
            d.timestamp && new Date(d.timestamp.seconds * 1000).toDateString() === todayStr
        ).length;

        // This week (last 7 days)
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const week    = docs.filter(d =>
            d.timestamp && d.timestamp.seconds * 1000 >= weekAgo
        ).length;

        // Top device
        const devices  = docs.reduce((acc, d) => { acc[d.device || "Unknown"] = (acc[d.device || "Unknown"] || 0) + 1; return acc; }, {});
        const topDevice = Object.entries(devices).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

        // Top country
        const countries  = docs.reduce((acc, d) => { acc[d.country || "Unknown"] = (acc[d.country || "Unknown"] || 0) + 1; return acc; }, {});
        const topCountry = Object.entries(countries).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

        // Last 7 days bar chart data
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d    = new Date();
            d.setDate(d.getDate() - i);
            const label = d.toLocaleDateString("en-US", { weekday: "short" });
            const str   = d.toDateString();
            const count = docs.filter(doc =>
                doc.timestamp && new Date(doc.timestamp.seconds * 1000).toDateString() === str
            ).length;
            days.push({ label, count });
        }

        // Render stat cards
        el("analytics-total").innerText   = total;
        el("analytics-today").innerText   = today;
        el("analytics-week").innerText    = week;
        el("analytics-device").innerText  = topDevice;
        el("analytics-country").innerText = topCountry;

        // Render bar chart
        const maxVal = Math.max(...days.map(d => d.count), 1);
        const chartEl = el("analytics-chart");
        chartEl.innerHTML = days.map(d => `
            <div class="chart-bar-wrap">
                <div class="chart-bar" style="height: ${Math.round((d.count / maxVal) * 100)}%">
                    <span class="chart-tip">${d.count}</span>
                </div>
                <div class="chart-label">${d.label}</div>
            </div>
        `).join("");

    } catch (err) {
        console.error("Analytics error:", err);
    }
}

// ---------------------------------------------------------
// 11. GLOBAL UTILITIES
// ---------------------------------------------------------
window.deleteItem = async (collectionName, id) => {
    if (confirm("Are you sure you want to delete this item?")) {
        try {
            await deleteDoc(doc(db, collectionName, id));
            showToast("Item deleted");
            if (collectionName === "sermons")        loadSermons();
            if (collectionName === "devotionals")    loadDevotionals();
            if (collectionName === "events")         loadEvents();
            if (collectionName === "testimonies")    loadTestimonies();
            if (collectionName === "prayerRequests") loadPrayers();
            if (collectionName === "subscribers")    loadSubscribers();
            loadStats();
        } catch (error) {
            console.error("Delete error", error);
            alert("Delete failed.");
        }
    }
};

window.updateStatus = async (collectionName, id, status) => {
    try {
        await updateDoc(doc(db, collectionName, id), { status });
        showToast("Status updated");
        loadTestimonies();
    } catch (error) {
        console.error("Update error", error);
    }
};

function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

// ---------------------------------------------------------
// 12. AUTO-CLOSE SIDEBAR ON MOBILE
// ---------------------------------------------------------
document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
        if (window.innerWidth <= 992) {
            document.getElementById("sidebar").classList.remove("active");
        }
    });
});

document.addEventListener("click", e => {
    const sidebar   = document.getElementById("sidebar");
    const toggleBtn = document.querySelector(".mobile-toggle");

    if (
        window.innerWidth <= 992 &&
        sidebar.classList.contains("active") &&
        !sidebar.contains(e.target) &&
        !toggleBtn.contains(e.target)
    ) {
        sidebar.classList.remove("active");
    }
});

// ---------------------------------------------------------
// 13. SUBSCRIBERS & BULK EMAIL
// ---------------------------------------------------------
async function loadSubscribers() {
    const tbody  = document.getElementById("table-subscribers");
    const statEl = document.getElementById("stat-subscribers");
    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='4' style='padding:12px'>Loading...</td></tr>";

    try {
        const snapshot = await getDocs(
            query(collection(db, "subscribers"), orderBy("subscribedAt", "desc"))
        );

        statEl.innerText = snapshot.size;
        tbody.innerHTML  = "";

        if (snapshot.empty) {
            tbody.innerHTML = "<tr><td colspan='4' style='padding:12px'>No subscribers yet.</td></tr>";
            return;
        }

        snapshot.forEach(docSnap => {
            const d    = docSnap.data();
            const date = d.subscribedAt
                ? new Date(d.subscribedAt.seconds * 1000).toLocaleDateString()
                : "N/A";

            tbody.innerHTML += `
                <tr>
                    <td style="padding:10px; border-bottom:1px solid #eee;">${d.name}</td>
                    <td style="padding:10px; border-bottom:1px solid #eee;">${d.email}</td>
                    <td style="padding:10px; border-bottom:1px solid #eee;">${date}</td>
                    <td style="padding:10px; border-bottom:1px solid #eee;">
                        <button class="action-btn btn-delete" onclick="window.deleteItem('subscribers', '${docSnap.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });
    } catch (err) {
        console.error("loadSubscribers error:", err);
        tbody.innerHTML = "<tr><td colspan='4' style='padding:12px;color:red;'>Error loading subscribers.</td></tr>";
    }
}

async function handleSendBulkEmail(e) {
    e.preventDefault();

    const subject  = document.getElementById("bulk-subject").value.trim();
    const message  = document.getElementById("bulk-message").value.trim();
    const btn      = document.getElementById("btn-send-email");
    const statusEl = document.getElementById("bulk-email-status");

    if (!subject || !message) return;

    btn.disabled         = true;
    btn.innerText        = "Fetching subscribers...";
    statusEl.style.color = "#333";
    statusEl.innerText   = "";

    try {
        const snapshot = await getDocs(collection(db, "subscribers"));

        if (snapshot.empty) {
            statusEl.style.color = "orange";
            statusEl.innerText   = "⚠️ No subscribers found.";
            return;
        }

        const subscribers = [];
        snapshot.forEach(d => subscribers.push(d.data()));

        btn.innerText = `Sending to ${subscribers.length} subscribers...`;

        let sent   = 0;
        let failed = 0;

        for (const sub of subscribers) {
            const htmlBody = `
                <div style="font-family:Georgia,serif; max-width:600px; margin:auto; padding:30px; color:#222;">
                    <div style="background:#5d001e; padding:20px; border-radius:8px 8px 0 0; text-align:center;">
                        <h1 style="color:#fff; margin:0; font-size:1.4rem;">His Spirit and Power Ministry</h1>
                        <p style="color:#f5c6cb; margin:4px 0 0; font-size:0.9rem;">HSPM Newsletter</p>
                    </div>
                    <div style="background:#fff; border:1px solid #eee; padding:30px; border-radius:0 0 8px 8px;">
                        <p style="color:#5d001e; font-size:1rem;">Dear ${sub.name},</p>
                        <div style="line-height:1.8; white-space:pre-wrap;">${message}</div>
                        <hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
                        <p style="font-size:0.8rem; color:#999; text-align:center;">
                            You are receiving this because you subscribed to HSPM updates.<br>
                            <a href="https://hisspiritandpowerministry.org" style="color:#5d001e;">hisspiritandpowerministry.org</a>
                        </p>
                    </div>
                </div>`;

            try {
                const res = await fetch("/api/send-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ to: sub.email, subject, html: htmlBody })
                });

                const resJson = await res.json();
                if (res.ok) {
                    sent++;
                } else {
                    console.error(`❌ Failed for ${sub.email}:`, resJson);
                    statusEl.style.color = "red";
                    statusEl.innerText   = `Error: ${resJson.message || resJson.name || JSON.stringify(resJson)}`;
                    failed++;
                }
            } catch (err) {
                console.error("Fetch error:", err);
                failed++;
            }
        }

        showToast(`✅ Sent to ${sent} subscriber${sent !== 1 ? "s" : ""}!`);
        statusEl.style.color = sent > 0 ? "green" : "red";
        statusEl.innerText   = failed > 0
            ? `✅ ${sent} sent, ❌ ${failed} failed`
            : `✅ Successfully sent to all ${sent} subscribers!`;

        e.target.reset();
    } catch (err) {
        console.error("Bulk email error:", err);
        statusEl.style.color = "red";
        statusEl.innerText   = "❌ Failed to send. Check console.";
    } finally {
        btn.disabled  = false;
        btn.innerText = "Send to All Subscribers";
    }
}
