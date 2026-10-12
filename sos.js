import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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
  if (!user) window.location.href = "login.html";
});

const sosBtn = document.getElementById("broadcast-sos-btn");
if (sosBtn) {
  sosBtn.addEventListener("click", async () => {
    const locationInput = document.getElementById("sos-location");
    const loc = locationInput.value.trim();

    if (!loc) {
      showToast("Please enter your current location/spot!", "error");
      return;
    }

    sosBtn.disabled = true;
    sosBtn.textContent = "BROADCASTING SOS...";

    try {
      const user = auth.currentUser;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      await addDoc(collection(db, "sos_alerts"), {
        uid: user.uid,
        username: userData.username || "student",
        location: loc,
        createdAt: serverTimestamp()
      });

      locationInput.value = "";
      showToast("🚨 SOS Distress signal broadcasted to campus network!", "success");
    } catch (err) {
      console.error("SOS error:", err);
      showToast("Could not send SOS alert.", "error");
    } finally {
      sosBtn.disabled = false;
      sosBtn.textContent = "🚨 BROADCAST SOS ALERT NOW";
    }
  });
}
