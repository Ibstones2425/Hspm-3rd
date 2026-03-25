// analytics.js — Silent visitor tracker for HSPM
import { db } from "./config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function trackVisit() {
    try {
        const ua = navigator.userAgent;
        const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";

        let browser = "Other";
        if (ua.includes("Chrome") && !ua.includes("Edg"))  browser = "Chrome";
        else if (ua.includes("Firefox"))                    browser = "Firefox";
        else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
        else if (ua.includes("Edg"))                        browser = "Edge";

        // Get country via free IP API (no key needed)
        let country = "Unknown";
        try {
            const res  = await fetch("https://ipapi.co/json/");
            const data = await res.json();
            country = data.country_name || "Unknown";
        } catch (_) { /* silently fail if blocked */ }

        await addDoc(collection(db, "pageViews"), {
            page:      "home",
            device,
            browser,
            country,
            timestamp: serverTimestamp()
        });
    } catch (err) {
        // Never surface analytics errors to visitors
        console.warn("Analytics:", err.message);
    }
}

trackVisit();
