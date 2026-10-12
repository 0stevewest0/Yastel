import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  loadAdminFeedback();
  loadAdminSOS();
});

function loadAdminFeedback() {
  const container = document.getElementById("admin-feedback-list");
  if (!container) return;

  const q = query(collection(db, "feedbacks"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = `<p style="text-align:center; color:var(--muted); font-size:0.85rem;">No feedback submitted yet.</p>`;
      return;
    }

    let html = "";
    snapshot.forEach(docSnap => {
      const fb = docSnap.data();
      html += `
        <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="font-size:0.85rem; color:var(--text);">${fb.category || "Feedback"}</strong>
            <span style="font-size:0.75rem; color:var(--muted);">${fb.sender || "Anonymous"}</span>
          </div>
          <p style="font-size:0.82rem; color:#334155; line-height:1.4;">${fb.message}</p>
        </div>
      `;
    });
    container.innerHTML = html;
  }, (err) => {
    console.error("Admin feedback error:", err);
  });
}

function loadAdminSOS() {
  const container = document.getElementById("admin-sos-list");
  if (!container) return;

  const q = query(collection(db, "sos_alerts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = `<p style="text-align:center; color:var(--muted); font-size:0.85rem;">No active SOS alerts.</p>`;
      return;
    }

    let html = "";
    snapshot.forEach(docSnap => {
      const sos = docSnap.data();
      html += `
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px; margin-bottom: 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="font-size:0.85rem; color:#b91c1c;">🚨 @${sos.username || "student"}</strong>
            <span style="font-size:0.75rem; color:#991b1b; font-weight:700;">Location: ${sos.location}</span>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }, (err) => {
    console.error("Admin SOS error:", err);
  });
}
