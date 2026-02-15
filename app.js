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

// ---------------------------------------------------------
// 1. INITIALIZATION & DOM ELEMENTS
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    loadSermons();
    loadDevotional();
    loadEvents();
    loadTestimonies();
    
    // Setup Form Listeners
    document.getElementById("prayer-form").addEventListener("submit", handlePrayerSubmit);
    document.getElementById("testimony-form").addEventListener("submit", handleTestimonySubmit);
});

// ---------------------------------------------------------
// 2. FETCH & DISPLAY CONTENT
// ---------------------------------------------------------

/**
 * Load Sermons from Firestore
 * Displays YouTube videos or Mixlr Audio links
 */
async function loadSermons() {
    const sermonList = document.getElementById("sermon-list");
    const loader = document.getElementById("sermon-loader");
    
    try {
        const q = query(collection(db, "sermons"), orderBy("date", "desc"), limit(6));
        const querySnapshot = await getDocs(q);
        
        loader.style.display = "none";
        sermonList.innerHTML = ""; // Clear existing

        if (querySnapshot.empty) {
            sermonList.innerHTML = "<p>No sermons found.</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.date ? new Date(data.date).toLocaleDateString() : "";
            
            let mediaContent = "";
            
            // Logic: If YouTube link exists, show video. Else if Mixlr, show audio card.
            if (data.youtubeLink && data.youtubeLink.includes("youtube")) {
                // Extract Video ID from standard YouTube URL
                const videoId = data.youtubeLink.split("v=")[1]?.split("&")[0] || data.youtubeLink.split("/").pop();
                mediaContent = `
                    <div class="video-wrapper">
                        <iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>
                    </div>
                `;
            } else if (data.mixlrLink) {
                mediaContent = `
                    <div class="audio-card">
                        <i class="fas fa-microphone-alt" style="font-size: 2rem; color: var(--primary-color);"></i>
                        <h4 style="margin-top: 10px;">Audio Message</h4>
                        <a href="${data.mixlrLink}" target="_blank" class="btn btn-outline" style="margin-top: 10px; font-size: 0.8rem;">
                            <i class="fas fa-play"></i> Listen on Mixlr
                        </a>
                    </div>
                `;
            }

            const html = `
                <div class="card">
                    ${mediaContent}
                    <h3>${data.title}</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">
                        <i class="far fa-user"></i> ${data.preacher} | <i class="far fa-calendar"></i> ${date}
                    </p>
                </div>
            `;
            sermonList.innerHTML += html;
        });

    } catch (error) {
        console.error("Error loading sermons:", error);
        loader.style.display = "none";
        sermonList.innerHTML = "<p>Unable to load sermons at this time.</p>";
    }
}

/**
 * Load Today's Devotional
 */
async function loadDevotional() {
    const container = document.getElementById("devotional-display");
    
    try {
        // Get the most recent devotional
        const q = query(collection(db, "devotionals"), orderBy("date", "desc"), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            container.innerHTML = `
                <div class="card" style="border-left: 5px solid var(--secondary-color);">
                    <span style="background: var(--secondary-color); color: white; padding: 5px 10px; border-radius: 4px; font-size: 0.8rem;">
                        ${new Date(data.date).toDateString()}
                    </span>
                    <h2 style="margin-top: 15px;">${data.title}</h2>
                    <p style="font-style: italic; color: var(--primary-color); margin: 10px 0;">
                        "${data.scripture}"
                    </p>
                    <div style="margin-top: 20px; line-height: 1.8;">
                        ${data.content.substring(0, 300)}...
                    </div>
                    <button class="btn btn-outline" style="margin-top: 20px;" onclick="alert('Full reading would open in a detailed view (Feature coming soon)')">Read Full Devotional</button>
                </div>
            `;
        } else {
            container.innerHTML = `<div class="card"><p>No devotional for today.</p></div>`;
        }
    } catch (error) {
        console.error("Error loading devotional:", error);
    }
}

/**
 * Load Upcoming Events
 */
async function loadEvents() {
    const eventList = document.getElementById("events-list");
    
    try {
        const q = query(collection(db, "events"), orderBy("date", "asc"));
        const querySnapshot = await getDocs(q);
        
        eventList.innerHTML = "";

        if (querySnapshot.empty) {
            eventList.innerHTML = "<p>No upcoming events.</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Use placeholder if no image
            const image = data.imageUrl || "assets/images/default-event.jpg";
            
            const html = `
                <div class="card" style="padding: 0; overflow: hidden;">
                    <img src="${image}" alt="${data.title}" style="width: 100%; height: 200px; object-fit: cover;">
                    <div style="padding: 20px;">
                        <h4 style="color: var(--primary-color);">${data.title}</h4>
                        <p style="font-weight: bold; margin: 5px 0;">
                            <i class="far fa-clock"></i> ${new Date(data.date).toDateString()}
                        </p>
                        <p>${data.description || "Join us for this special program."}</p>
                    </div>
                </div>
            `;
            eventList.innerHTML += html;
        });

    } catch (error) {
        console.error("Error loading events:", error);
    }
}

/**
 * Load Approved Testimonies
 */
async function loadTestimonies() {
    const list = document.getElementById("testimony-list");
    
    try {
        // Only show testimonies approved by Admin
        const q = query(collection(db, "testimonies"), where("status", "==", "approved"), limit(6));
        const querySnapshot = await getDocs(q);
        
        list.innerHTML = "";
        
        if (querySnapshot.empty) {
            list.innerHTML = "<p>No testimonies shared yet. Be the first!</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const imgHtml = data.imageUrl 
                ? `<img src="${data.imageUrl}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-right: 15px;">` 
                : `<div style="width: 60px; height: 60px; background: #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;"><i class="fas fa-user"></i></div>`;

            const html = `
                <div class="card">
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        ${imgHtml}
                        <div>
                            <h4 style="margin: 0;">${data.name}</h4>
                            <small style="color: #888;">Testimony</small>
                        </div>
                    </div>
                    <p>"${data.content}"</p>
                </div>
            `;
            list.innerHTML += html;
        });

    } catch (error) {
        console.error("Error loading testimonies:", error);
    }
}

// ---------------------------------------------------------
// 3. FORM HANDLERS
// ---------------------------------------------------------

/**
 * Handle Prayer Request Submission
 */
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
        status: "New", // Default status for Admin Kanban
        date: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "prayerRequests"), prayerData);
        alert("Prayer request sent! We are standing in faith with you.");
        e.target.reset();
    } catch (error) {
        console.error("Error sending prayer:", error);
        alert("Failed to send request. Please try again.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

/**
 * Handle Testimony Submission (with Image Upload)
 */
async function handleTestimonySubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.innerText = "Uploading...";
    btn.disabled = true;

    const fileInput = document.getElementById("t-image");
    const name = document.getElementById("t-name").value;
    const content = document.getElementById("t-content").value;
    let imageUrl = "";

    try {
        // 1. Upload Image to ImgBB if file selected
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append("image", fileInput.files[0]);
            
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });
            
            const result = await response.json();
            if (result.success) {
                imageUrl = result.data.url;
            } else {
                throw new Error("Image upload failed");
            }
        }

        // 2. Save to Firestore
        await addDoc(collection(db, "testimonies"), {
            name: name,
            content: content,
            imageUrl: imageUrl,
            status: "pending", // Must be approved by Admin
            date: serverTimestamp()
        });

        alert("Testimony submitted for approval! Thank you for sharing.");
        document.getElementById("testimony-form").reset();
        document.getElementById("testimony-modal").style.display = "none";

    } catch (error) {
        console.error("Error submitting testimony:", error);
        alert("Something went wrong. Please check your connection.");
    } finally {
        btn.innerText = "Submit for Approval";
        btn.disabled = false;
    }
}