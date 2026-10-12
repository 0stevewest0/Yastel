import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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
    loadMarketItems();
  } else {
    setTimeout(() => {
      if (!auth.currentUser) window.location.href = "login.html";
    }, 1200);
  }
});

// Modal Toggles
const sellModal = document.getElementById("sell-modal");
const openSellBtn = document.getElementById("open-sell-modal");
const closeSellBtn = document.getElementById("close-sell-modal");

if (openSellBtn && sellModal) {
  openSellBtn.addEventListener("click", () => sellModal.classList.add("active"));
}
if (closeSellBtn && sellModal) {
  closeSellBtn.addEventListener("click", () => sellModal.classList.remove("active"));
}

// Form Submission
const sellForm = document.getElementById("sell-form");
if (sellForm) {
  sellForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("item-title").value.trim();
    const price = document.getElementById("item-price").value.trim();
    const whatsapp = document.getElementById("item-whatsapp").value.trim();

    try {
      const user = auth.currentUser;
      let sellerName = "Student";
      let location = "Campus";

      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const u = userDoc.data();
          sellerName = u.fullName || u.username || "Student";
          location = u.hostel || u.readingSpot || "Yabatech";
        }
      }

      await addDoc(collection(db, "market_items"), {
        title,
        price: Number(price),
        sellerName,
        location,
        whatsapp,
        createdAt: serverTimestamp()
      });

      sellForm.reset();
      sellModal.classList.remove("active");
      showToast("Item listed on Hostel Market! 🛍️", "success");
    } catch (err) {
      console.error("Market post error:", err);
      showToast("Could not list item.", "error");
    }
  });
}

function loadMarketItems() {
  const container = document.getElementById("market-items-grid");
  if (!container) return;

  onSnapshot(collection(db, "market_items"), (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--muted); grid-column:1/-1;"><p>No items listed for sale yet. Be the first to sell!</p></div>`;
      return;
    }

    let html = "";
    snapshot.forEach((docSnap) => {
      const item = docSnap.data();
      let cleanPhone = item.whatsapp ? item.whatsapp.replace(/[^0-9]/g, "") : "";
      if (cleanPhone.startsWith("0")) cleanPhone = "234" + cleanPhone.slice(1);
      let waLink = `https://wa.me/${cleanPhone}?text=Hello%20${item.sellerName},%20I%20want%20to%20buy%20your%20${encodeURIComponent(item.title)}%20on%20Yastel%20Hub!`;

      html += `
        <div style="background: white; border: 1px solid var(--border); border-radius: 16px; padding: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <strong style="font-size: 0.92rem; color: var(--text);">${item.title}</strong>
              <span style="font-size: 0.95rem; font-weight: 900; color: var(--green);">₦${Number(item.price).toLocaleString()}</span>
            </div>
            <p style="font-size: 0.78rem; color: var(--muted); margin-bottom: 4px;">📍 ${item.location}</p>
            <p style="font-size: 0.78rem; color: var(--muted); margin-bottom: 14px;">Seller: <strong>${item.sellerName}</strong></p>
          </div>
          <a href="${waLink}" target="_blank" class="btn btn-green" style="padding: 8px; font-size: 0.78rem; width: 100%; border-radius: 10px; text-decoration: none;">
            📱 WhatsApp Seller
          </a>
        </div>
      `;
    });
    container.innerHTML = html;
  });
}
// Navigation Menu Toggle Logic
const menuToggleBtn = document.getElementById("menu-toggle-btn");
const navDropdownMenu = document.getElementById("nav-dropdown-menu");

if (menuToggleBtn && navDropdownMenu) {
  menuToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = navDropdownMenu.style.display === "none" || !navDropdownMenu.style.display;
    navDropdownMenu.style.display = isHidden ? "block" : "none";
  });

  // Close dropdown when clicking anywhere outside
  document.addEventListener("click", (e) => {
    if (!menuToggleBtn.contains(e.target) && !navDropdownMenu.contains(e.target)) {
      navDropdownMenu.style.display = "none";
    }
  });
}
