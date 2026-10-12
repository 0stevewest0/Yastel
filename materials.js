import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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

onAuthStateChanged(auth, (user) => {
  if (user) {
    loadMaterials();
  } else {
    window.location.href = "login.html";
  }
});

// Modal UI logic
const modal = document.getElementById("upload-modal");
const openBtn = document.getElementById("open-upload-modal");
const closeBtn = document.getElementById("close-upload-modal");

if (openBtn && modal) openBtn.addEventListener("click", () => modal.classList.add("active"));
if (closeBtn && modal) closeBtn.addEventListener("click", () => modal.classList.remove("active"));

// Form Handler
const form = document.getElementById("upload-form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("material-title").value.trim();
    const dept = document.getElementById("material-dept").value;
    const link = document.getElementById("material-link").value.trim();

    const submitBtn = document.getElementById("submit-material-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "POSTING...";

    try {
      const user = auth.currentUser;
      let uName = "Student";

      if (user) {
        const uDoc = await getDoc(doc(db, "users", user.uid));
        if (uDoc.exists()) uName = uDoc.data().username || "Student";

        // Reward 15 XP for uploading materials
        await updateDoc(doc(db, "users", user.uid), {
          xp: increment(15)
        });
      }

      await addDoc(collection(db, "materials"), {
        title,
        department: dept,
        link,
        uploadedBy: uName,
        createdAt: serverTimestamp()
      });

      form.reset();
      modal.classList.remove("active");
      showToast("Material shared successfully! Earned +15 XP 📚🎉", "success");
    } catch (err) {
      console.error("Material upload error:", err);
      showToast("Could not post material.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "POST STUDY MATERIAL (+15 XP)";
    }
  });
}

// Filter dropdown change event
const deptFilter = document.getElementById("dept-filter");
if (deptFilter) {
  deptFilter.addEventListener("change", () => loadMaterials());
}

function loadMaterials() {
  const container = document.getElementById("materials-container");
  if (!container) return;

  const selectedDept = deptFilter ? deptFilter.value : "ALL";
  const q = query(collection(db, "materials"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = `<p style="text-align:center; color:var(--muted); font-size:0.85rem; grid-column: 1 / -1; padding: 30px;">No study materials posted yet. Be the first to share!</p>`;
      return;
    }

    let html = "";
    snapshot.forEach((docSnap) => {
      const mat = docSnap.data();

      if (selectedDept !== "ALL" && mat.department !== selectedDept && mat.department !== "General (GST)") {
        return;
      }

      html += `
        <div style="background: white; border: 1px solid var(--border); border-radius: 16px; padding: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <strong style="font-size: 0.92rem; color: var(--text);">${mat.title}</strong>
              <span style="font-size: 0.72rem; font-weight: 800; color: var(--green); background: #f0fdf4; border: 1px solid #bbf7d0; padding: 3px 8px; border-radius: 99px;">${mat.department}</span>
            </div>
            <p style="font-size: 0.78rem; color: var(--muted); margin-bottom: 14px;">Shared by: <strong>@${mat.uploadedBy || "student"}</strong></p>
          </div>
          <a href="${mat.link}" target="_blank" rel="noopener" class="btn btn-green" style="padding: 10px; font-size: 0.8rem; width: 100%; border-radius: 10px; text-decoration: none; text-align: center; font-weight: 800;">
            📥 Download / Open Material
          </a>
        </div>
      `;
    });

    container.innerHTML = html || `<p style="text-align:center; color:var(--muted); font-size:0.85rem; grid-column: 1 / -1; padding: 30px;">No materials found for ${selectedDept}.</p>`;
  });
}
