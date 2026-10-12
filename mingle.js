import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, onSnapshot, serverTimestamp, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

window.showToast = function(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
};
function formatTimeAgo(timestamp) {
  if (!timestamp) return "Just now";
  
  // Handle Firestore Timestamp objects or millisecond numbers
  const time = timestamp.toMillis ? timestamp.toMillis() : (timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
  const secondsAgo = Math.floor((Date.now() - time) / 1000);

  if (secondsAgo < 60) return "Just now";
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  return `${daysAgo}d ago`;
}


const firebaseConfig = {
  apiKey: "AIzaSyD3PEPUzSYEwibxR7r6nE8sTCxrpA3fano",
  authDomain: "yastel-205b7.firebaseapp.com",
  projectId: "yastel-205b7",
  storageBucket: "yastel-205b7.firebasestorage.app",
  messagingSenderId: "701146571220",
  appId: "1:701146571220:web:0b2f07b48e3131c6e2b641"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let selectedTag = "#Shoutout";

// Tag Chip Selector
document.querySelectorAll('.tag-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedTag = chip.getAttribute('data-tag');
  });
});

// Auth Guard
onAuthStateChanged(auth, (user) => {
  if (!user) {
    setTimeout(() => {
      if (!auth.currentUser) window.location.href = "login.html";
    }, 1200);
  }
});

// Run Real-Time Listeners immediately on load
loadQuadFeed();
loadLiveRadars();

// 1. Post to Quad Stream
const postQuadBtn = document.getElementById("post-quad-btn");
const quadInput = document.getElementById("quad-input");

if (postQuadBtn && quadInput) {
  postQuadBtn.addEventListener("click", async () => {
    const text = quadInput.value.trim();
    if (!text) {
      showToast("Write a shoutout or message first!", "error");
      return;
    }

    postQuadBtn.disabled = true;
    postQuadBtn.textContent = "Posting...";

    try {
      const user = auth.currentUser;
      let username = "student";
      let residenceText = "Campus";

      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const u = userDoc.data();
          username = u.username || "student";
          residenceText = u.hostel || u.readingSpot || "Campus";
        }
      }

      await addDoc(collection(db, "quad_posts"), {
        uid: user ? user.uid : "anon",
        username: username,
        residence: residenceText,
        tag: selectedTag,
        text: text,
        createdAt: serverTimestamp()
      });

      if (user) {
        await updateDoc(doc(db, "users", user.uid), { xp: increment(20) });
      }

      quadInput.value = "";
      showToast("Posted to Quad stream! +20 XP 🚀", "success");
    } catch (err) {
      console.error("Quad post error:", err);
      showToast("Could not post shoutout.", "error");
    } finally {
      postQuadBtn.disabled = false;
      postQuadBtn.textContent = "Post to Quad";
    }
  });
}

function loadQuadFeed() {
  const container = document.getElementById("quad-feed-container");
  if (!container) return;

  onSnapshot(collection(db, "quad_posts"), (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = `<div style="text-align:center; padding:25px; color:var(--muted);"><p>No shoutouts yet. Be the first to post to the Quad!</p></div>`;
      return;
    }

    let posts = [];
    snapshot.forEach(docSnap => {
      posts.push({ id: docSnap.id, ...docSnap.data() });
    });

    posts.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
      return timeB - timeA;
    });

    let html = "";
    posts.forEach(post => {
      let tagBg = post.tag === "#Matchmaking" ? "#fce7f3" : "#f1f5f9";
      let tagColor = post.tag === "#Matchmaking" ? "#db2777" : "#0f172a";

      html += `
        <div style="background: white; border: 1px solid var(--border); border-radius: 16px; padding: 14px; margin-bottom: 12px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div>
              <strong style="font-size:0.88rem; color:var(--text);">@${post.username || "student"}</strong>
              <span style="font-size:0.75rem; color:var(--muted);"> (${post.residence || "Campus"})</span>
            </div>
            <span style="font-size:10px; font-weight:800; background:${tagBg}; color:${tagColor}; padding:2px 8px; border-radius:99px;">${post.tag || "#Shoutout"}</span>
          </div>
          <p style="font-size:0.85rem; color:#334155; line-height:1.5;">${post.text}</p>
        </div>
      `;
    });
    container.innerHTML = html;
  }, (error) => {
    console.error("Quad feed error:", error);
    container.innerHTML = `<p style="color:red; text-align:center; font-size:0.8rem;">Could not load feed. Check connection.</p>`;
  });
}

// 2. Broadcast Radar Handler
const broadcastBtn = document.getElementById("broadcast-radar-btn");
const radarTypeSelect = document.getElementById("radar-type");
const radarMsgInput = document.getElementById("radar-message");
const radarWhatsAppInput = document.getElementById("radar-whatsapp");

if (broadcastBtn) {
  broadcastBtn.addEventListener("click", async () => {
    const type = radarTypeSelect.value;
    const message = radarMsgInput.value.trim();
    const whatsapp = radarWhatsAppInput.value.trim();

    if (!message) {
      showToast("Enter a short radar message!", "error");
      return;
    }

    broadcastBtn.disabled = true;
    broadcastBtn.textContent = "Broadcasting...";

    try {
      const user = auth.currentUser;
      let username = "student";
      let hostelText = "Campus";

      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const u = userDoc.data();
          username = u.username || "student";
          hostelText = u.hostel || u.readingSpot || "Campus";
        }
      }

      await addDoc(collection(db, "match_radars"), {
        uid: user ? user.uid : "anon",
        username: username,
        hostel: hostelText,
        type: type,
        message: message,
        whatsapp: whatsapp || "08123456789",
        createdAt: serverTimestamp()
      });

      radarMsgInput.value = "";
      radarWhatsAppInput.value = "";
      showToast("Radar broadcasted to campus! 📡", "success");
    } catch (err) {
      console.error("Radar broadcast error:", err);
      showToast("Could not broadcast radar.", "error");
    } finally {
      broadcastBtn.disabled = false;
      broadcastBtn.textContent = "🚀 Broadcast Radar";
    }
  });
}

function loadLiveRadars() {
  const container = document.getElementById("live-radars-container");
  if (!container) return;

  onSnapshot(collection(db, "match_radars"), (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = `<p style="font-size:0.78rem; color:var(--muted); text-align:center; padding:12px 0;">No active campus radars right now. Be the first to broadcast!</p>`;
      return;
    }

    let radars = [];
    snapshot.forEach(docSnap => {
      radars.push({ id: docSnap.id, ...docSnap.data() });
    });

    radars.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
      return timeB - timeA;
    });

    let html = "";
    radars.forEach(radar => {
      let cleanPhone = radar.whatsapp ? radar.whatsapp.replace(/[^0-9]/g, "") : "";
      if (cleanPhone.startsWith("0")) cleanPhone = "234" + cleanPhone.slice(1);
      let waLink = `https://wa.me/${cleanPhone}?text=Hello%20@${radar.username},%20saw%20your%20Yastel%20Hub%20radar!`;
const timeAgo = formatTimeAgo(radar.createdAt);

      html += `
        <div class="live-radar-item">
          <div class="live-radar-top">
           <div class="live-radar-author">
  <span class="radar-dot-pulse"></span>
  <strong>@${radar.username || "student"}</strong>
  <span style="font-size: 10px; color: var(--muted); font-weight: 400;">(${timeAgo})</span>
</div>

            <span class="live-radar-badge">${radar.type || "📚 Study Buddy"}</span>
          </div>
          
          <p class="live-radar-msg">"${radar.message}"</p>
          
          <a href="${waLink}" target="_blank" class="live-radar-wa-btn">
            💬 Connect on WhatsApp
          </a>
        </div>
      `;
    });
    container.innerHTML = html;
  }, (error) => {
    console.error("Match radar snapshot error:", error);
    container.innerHTML = `<p style="color:red; text-align:center; font-size:0.8rem;">Could not load active radars.</p>`;
  });
}
