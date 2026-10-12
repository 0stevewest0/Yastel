import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

window.showToast = function(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
};

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

function getLevelBadge(xp = 0) {
  if (xp >= 501) return "🔥 Level 5: Yastel Legend";
  if (xp >= 301) return "👑 Level 4: Hostel Mayor / Akata Queen";
  if (xp >= 151) return "🦉 Level 3: Night Crawler";
  if (xp >= 51)  return "📚 Level 2: Departmental Soldier";
  return "🎒 Level 1: Fresh Fob";
}

const profileViewCard = document.getElementById("profile-view-card");
const profileFormBox = document.getElementById("profile-form-box");
const editToggleBtn = document.getElementById("edit-profile-toggle-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      document.getElementById("profile-name").textContent = data.fullName || "Yabatech Student";
      document.getElementById("profile-username").textContent = `@${data.username || "student"}`;
      document.getElementById("profile-dept").textContent = data.department || "Computer Science";
      document.getElementById("profile-xp").textContent = `${data.xp || 0} XP`;
      document.getElementById("profile-level-badge").textContent = getLevelBadge(data.xp || 0);

      // Populate view card fields
      document.getElementById("view-level").textContent = data.level || "Not set yet";
      document.getElementById("view-course").textContent = data.course || "Not set yet";
      document.getElementById("view-study-time").textContent = data.studyTime || "Not set yet";
      document.getElementById("view-whatsapp").textContent = data.whatsapp || "Not set yet";

      // Populate form fields
      if (data.level) document.getElementById("update-level").value = data.level;
      if (data.course) document.getElementById("update-course").value = data.course;
      if (data.studyTime) document.getElementById("update-study-time").value = data.studyTime;
      if (data.whatsapp) document.getElementById("update-whatsapp").value = data.whatsapp;

      // If user has already filled out profile info, show the view card and hide form initially
      if (data.level && data.course) {
        if (profileViewCard) profileViewCard.style.display = "block";
        if (profileFormBox) profileFormBox.style.display = "none";
      } else {
        if (profileViewCard) profileViewCard.style.display = "none";
        if (profileFormBox) profileFormBox.style.display = "block";
      }
    }
  } catch (err) {
    console.error("Profile load error:", err);
  }

  loadLeaderboard();
});

// Toggle to edit mode
if (editToggleBtn) {
  editToggleBtn.addEventListener("click", () => {
    profileViewCard.style.display = "none";
    profileFormBox.style.display = "block";
    cancelEditBtn.style.display = "inline-block";
  });
}

// Cancel edit mode
if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => {
    profileViewCard.style.display = "block";
    profileFormBox.style.display = "none";
  });
}

// Save Profile Updates & Show Graphic Card
const updateForm = document.getElementById("update-profile-form");
if (updateForm) {
  updateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const saveBtn = document.getElementById("save-profile-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "SAVING...";

    try {
      const level = document.getElementById("update-level").value;
      const course = document.getElementById("update-course").value.trim();
      const studyTime = document.getElementById("update-study-time").value.trim();
      const whatsapp = document.getElementById("update-whatsapp").value.trim();

      await updateDoc(doc(db, "users", user.uid), {
        level,
        course,
        studyTime,
        whatsapp
      });

      showToast("Profile updated successfully! 🚀", "success");

      // Update the graphic card values directly without needing a hard reload
      document.getElementById("view-level").textContent = level;
      document.getElementById("view-course").textContent = course || "Not set yet";
      document.getElementById("view-study-time").textContent = studyTime || "Not set yet";
      document.getElementById("view-whatsapp").textContent = whatsapp || "Not set yet";

      // Switch view from form to graphic card
      profileFormBox.style.display = "none";
      profileViewCard.style.display = "block";

    } catch (err) {
      console.error("Profile update error:", err);
      showToast("Could not update profile.", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "SAVE PROFILE CHANGES";
    }
  });
}

async function loadLeaderboard() {
  const listEl = document.getElementById("leaderboard-list");
  if (!listEl) return;

  try {
    const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(5));
    const snap = await getDocs(q);

    if (snap.empty) {
      listEl.innerHTML = `<p style="text-align:center; color:var(--muted); font-size:0.8rem;">No active students yet.</p>`;
      return;
    }

    let html = "";
    let rank = 1;
    snap.forEach(docSnap => {
      let u = docSnap.data();
      let medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "⭐";

      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border); font-size:0.85rem;">
          <div>
            <span>${medal} <strong>@${u.username || "student"}</strong></span>
            <span style="font-size:0.75rem; color:var(--muted); display:block;">${u.department || "Yabatech"}</span>
          </div>
          <span style="font-weight:900; color:var(--green); background:#f0fdf4; border:1px solid #bbf7d0; padding:3px 10px; border-radius:99px;">${u.xp || 0} XP</span>
        </div>
      `;
      rank++;
    });
    listEl.innerHTML = html;
  } catch (err) {
    console.error("Leaderboard error:", err);
    listEl.innerHTML = `<p style="text-align:center; color:var(--muted); font-size:0.8rem;">Could not load leaderboard.</p>`;
  }
}

// Top Navigation Menu Toggle
const menuBtn = document.getElementById("menu-toggle-btn");
const navMenu = document.getElementById("nav-dropdown-menu");

if (menuBtn && navMenu) {
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    navMenu.style.display = navMenu.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", () => {
    navMenu.style.display = "none";
  });
}

// Logout Handler
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (err) {
      console.error("Sign out error:", err);
    }
  });
}
