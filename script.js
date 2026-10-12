import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, serverTimestamp, runTransaction, getDoc, collection, addDoc, query, orderBy, onSnapshot, updateDoc, increment, setDoc, where, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging.js";

// Toast Helper
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

// Firebase Setup
const firebaseConfig = {
  apiKey: "AIzaSyD3PEPUzSYEwibxR7r6nE8sTCxrpA3fano",
  authDomain: "yastel-205b7.firebaseapp.com",
  projectId: "yastel-205b7",
  storageBucket: "yastel-205b7.firebasestorage.app",
  messagingSenderId: "701146571220",
  appId: "1:701146571220:web:0b2f07b48e3131c6e2b641"
};

let auth, db, messaging;
try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  messaging = getMessaging(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
}

function matricEmail(matric) {
  const normalized = matric.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${normalized}@students.yastelhub.com`;
}

function normalizeMatric(matric) {
  return matric.trim().toUpperCase().replace(/\s+/g, "");
}

function isValidMatric(matric) {
  return /^F\/ND\/\d{2}\/\d{7}$/.test(normalizeMatric(matric));
}

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

// Multi-step Registration Navigation
let currentStep = 1;

window.nextFormStep = function(step) {
  if (step === 1) {
    const nameInput = document.getElementById("reg-name");
    const matricInput = document.getElementById("reg-matric");
    const usernameInput = document.getElementById("reg-username");

    const name = nameInput ? nameInput.value.trim() : "";
    const matric = matricInput ? normalizeMatric(matricInput.value) : "";
    const username = usernameInput ? normalizeUsername(usernameInput.value) : "";

    if (!name) {
      showToast("Please enter your full name.", "error");
      if (nameInput) nameInput.focus();
      return;
    }
    if (!isValidMatric(matric)) {
      showToast("Matric number must follow format F/ND/24/3210102.", "error");
      if (matricInput) matricInput.focus();
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      showToast("Username must contain 3–20 letters, numbers or underscores.", "error");
      if (usernameInput) usernameInput.focus();
      return;
    }
  } else if (step === 2) {
    const deptEl = document.getElementById("reg-department");
    const genderEl = document.getElementById("reg-gender");
    const residenceEl = document.getElementById("reg-residence");

    if (!deptEl || !deptEl.value) { showToast("Please select your department.", "error"); return; }
    if (!genderEl || !genderEl.value) { showToast("Please select your gender.", "error"); return; }
    if (!residenceEl || !residenceEl.value) { showToast("Please choose your residence.", "error"); return; }
  }

  currentStep = step + 1;
  updateStepDisplay();
};

window.prevFormStep = function(step) {
  currentStep = step - 1;
  updateStepDisplay();
};

function updateStepDisplay() {
  document.querySelectorAll('.form-step').forEach(el => {
    el.classList.remove('active');
    if (parseInt(el.getAttribute('data-step')) === currentStep) {
      el.classList.add('active');
    }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Registration Submit Handler
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!auth || !db) {
      showToast("Firebase is not available.", "error");
      return;
    }

    const button = document.getElementById("register-submit");
    const data = new FormData(registerForm);
    const fullName = String(data.get("fullName") || "").trim();
    const matric = normalizeMatric(String(data.get("matric") || ""));
    const username = normalizeUsername(String(data.get("username") || ""));
    const password = String(data.get("password") || "");
    const department = String(data.get("department") || "").trim();

    button.disabled = true;
    button.textContent = "CREATING ACCOUNT...";

    try {
      const credential = await createUserWithEmailAndPassword(auth, matricEmail(matric), password);
      const createdUser = credential.user;

      const profile = {
        uid: createdUser.uid,
        fullName,
        matricNumber: matric,
        username,
        usernameLower: username,
        department,
        gender: String(data.get("gender") || ""),
        residence: String(data.get("residence") || ""),
        hostel: String(data.get("hostel") || ""),
        room: String(data.get("room") || "").trim(),
        readingSpot: String(data.get("readingSpot") || ""),
        area: String(data.get("area") || "").trim(),
        xp: 0,
        level: 1,
        createdAt: serverTimestamp()
      };

      await runTransaction(db, async transaction => {
        const usernameRef = doc(db, "usernames", username);
        const profileRef = doc(db, "users", createdUser.uid);
        const usernameSnapshot = await transaction.get(usernameRef);
        if (usernameSnapshot.exists()) throw new Error("USERNAME_TAKEN");

        transaction.set(usernameRef, { uid: createdUser.uid, username, createdAt: serverTimestamp() });
        transaction.set(profileRef, profile);
      });

      showToast("Account created successfully!", "success");
      setTimeout(() => { window.location.href = "login.html"; }, 2000);
    } catch (error) {
      console.error(error);
      if (error.message === "USERNAME_TAKEN") {
        showToast("That username is already taken.", "error");
      } else if (error.code === "auth/email-already-in-use") {
        showToast("An account already exists for this matric number.", "error");
      } else {
        showToast("Registration failed. Check console for details.", "error");
      }
    } finally {
      button.disabled = false;
      button.textContent = "CREATE ACCOUNT & UNLOCK HUB";
    }
  });
}

// Login Handler
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!auth) {
      showToast("Firebase is not available.", "error");
      return;
    }

    const button = document.getElementById("login-submit");
    const matric = normalizeMatric(document.getElementById("login-matric").value);
    const password = document.getElementById("login-password").value;

    if (!isValidMatric(matric)) {
      showToast("Enter your matric number in format F/ND/24/3210102.", "error");
      return;
    }

    button.disabled = true;
    button.textContent = "LOGGING IN...";
    try {
      await signInWithEmailAndPassword(auth, matricEmail(matric), password);
      showToast("Login successful!", "success");
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error(error);
      showToast("Login failed. Check your matric number and password.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "LOG IN TO PORTAL";
    }
  });
}

// Level Badge Title Helper
function getLevelBadge(xp = 0) {
  if (xp >= 501) return "🔥 Level 5: Yastel Legend";
  if (xp >= 301) return "👑 Level 4: Hostel Mayor / Akata Queen";
  if (xp >= 151) return "🦉 Level 3: Night Crawler";
  if (xp >= 51)  return "📚 Level 2: Departmental Soldier";
  return "🎒 Level 1: Fresh Fob";
}

// ==========================================
// DASHBOARD & LOCATION HUB LOGIC
// ==========================================
const profileNameEl = document.getElementById("profile-name");
if (profileNameEl && auth && db) {
  let currentUserGender = "Male";
  let activeTabLocation = "ALL";

  const targetSelect = document.getElementById("post-target-select");
  const postBtn = document.getElementById("post-gist-btn");
  const requestPassBtn = document.getElementById("request-pass-btn");
  const genderPanel = document.getElementById("opposite-gender-panel");
  const panelTitle = document.getElementById("panel-title");
  const onlineUsersList = document.getElementById("online-users-list");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      requestNotificationPermission(user.uid);
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          currentUserGender = data.gender || "Male";
          
          const nameEl = document.getElementById("profile-name");
          const userEl = document.getElementById("profile-username");
          const deptEl = document.getElementById("profile-dept");
          const resEl = document.getElementById("profile-residence");
          const badgeEl = document.getElementById("profile-level-badge");

          if (nameEl) nameEl.textContent = data.fullName || "Yabatech Student";
          if (userEl) userEl.textContent = `@${data.username || "student"}`;
          if (deptEl) deptEl.textContent = data.department || "Computer Science";
          
          let residenceText = data.hostel ? `${data.hostel}, Room ${data.room}` : (data.readingSpot || data.area || "Off-Campus");
          if (resEl) resEl.textContent = residenceText;

          const userXp = data.xp || 0;
          if (badgeEl) badgeEl.textContent = getLevelBadge(userXp);

          enforceGenderPostingRules(activeTabLocation);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    } else {
      setTimeout(() => {
        if (!auth.currentUser) {
          window.location.href = "login.html";
        }
      }, 1200);
    }
  });

  if (targetSelect) {
    targetSelect.addEventListener("change", (e) => {
      activeTabLocation = e.target.value;
      enforceGenderPostingRules(activeTabLocation);
      document.querySelectorAll('.feed-tab').forEach(t => {
        if (t.getAttribute('data-location') === activeTabLocation) {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      });
    });
  }

  document.querySelectorAll('.feed-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      activeTabLocation = tab.getAttribute('data-location');
      if (targetSelect) targetSelect.value = activeTabLocation;

      enforceGenderPostingRules(activeTabLocation);
    });
  });

  function enforceGenderPostingRules(location) {
    const isBoysHostel = location === "Boys Hostel";
    const isGirlsHostel = location === "Akata Hostel";

    const isRestricted = (currentUserGender === "Male" && isGirlsHostel) || (currentUserGender === "Female" && isBoysHostel);

    if (isRestricted) {
      if (postBtn) postBtn.style.display = "none";
      if (requestPassBtn) requestPassBtn.style.display = "inline-flex";
      if (genderPanel) genderPanel.style.display = "block";

      if (panelTitle) {
        panelTitle.textContent = currentUserGender === "Male" ? "👧 Akata Girls Online" : "👦 Boys Hostel Online";
      }

      loadOppositeGenderOnlineList(currentUserGender === "Male" ? "Female" : "Male");
      showToast(`🔒 Only ${currentUserGender === "Male" ? "Akata Girls" : "Boys Hostel"} residents can post here directly!`, "error");
    } else {
      if (postBtn) postBtn.style.display = "inline-flex";
      if (requestPassBtn) requestPassBtn.style.display = "none";
      if (genderPanel) genderPanel.style.display = "none";
    }
  }

  async function loadOppositeGenderOnlineList(targetGender) {
    if (!onlineUsersList) return;
    try {
      const q = query(collection(db, "users"), where("gender", "==", targetGender));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        onlineUsersList.innerHTML = "<span>No active residents found right now.</span>";
        return;
      }

      let html = "";
      snap.forEach(docSnap => {
        const u = docSnap.data();
        html += `<span class="user-profile-trigger" data-uid="${u.uid || ''}" style="display:inline-block; background:white; border:1px solid #fed7aa; padding:3px 8px; border-radius:6px; margin:2px; font-weight:700; cursor:pointer;">🟢 @${u.username || "student"} (${u.hostel || "Hostel"})</span> `;
      });
      onlineUsersList.innerHTML = html;
    } catch (err) {
      console.error("Error loading residents:", err);
    }
  }

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

  const lightOnBtn = document.getElementById("light-on-btn");
  const lightOffBtn = document.getElementById("light-off-btn");
  const nepaBanner = document.getElementById("nepa-status-banner");

  async function updateLightStatus(statusText, statusType) {
    try {
      const user = auth.currentUser;
      if (!user) {
        showToast("Please log in again!", "error");
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : {};

      const username = userData.username || "student";
      let residenceText = userData.hostel ? `${userData.hostel}, Room ${userData.room}` : (userData.readingSpot || userData.area || "Yabatech Campus");

      await setDoc(doc(db, "system", "nepa_status"), {
        text: statusText,
        type: statusType,
        updatedBy: username,
        location: residenceText,
        updatedAt: serverTimestamp()
      });

      const postText = `⚡ RADAR UPDATE: ${statusText} at ${residenceText}!`;
      const postLocation = userData.hostel ? (userData.gender === "Female" ? "Akata Hostel" : "Boys Hostel") : "New Building";
      
      await addDoc(collection(db, "gists"), {
        uid: user.uid,
        fullName: userData.fullName || "Yabatech Student",
        username: username,
        residence: residenceText,
        targetLocation: postLocation,
        text: postText,
        createdAt: serverTimestamp()
      });

      await updateDoc(userDocRef, { xp: increment(10) });
      showToast("Radar updated & posted! +10 XP ⚡", "success");
    } catch (err) {
      console.error("NEPA error:", err);
      showToast("Could not update radar.", "error");
    }
  }

  if (lightOnBtn && lightOffBtn) {
    lightOnBtn.addEventListener("click", () => updateLightStatus("🟢 Light Dey! NEPA don bring am", "success"));
    lightOffBtn.addEventListener("click", () => updateLightStatus("🔴 Omo! Nepa don xarry light o", "error"));
  }

  onSnapshot(doc(db, "system", "nepa_status"), (docSnap) => {
    if (docSnap.exists() && nepaBanner) {
      const data = docSnap.data();
      nepaBanner.textContent = `${data.text} — ${data.location || 'Campus'} (by @${data.updatedBy || 'geng'})`;
      nepaBanner.style.background = data.type === 'success' ? '#f0fdf4' : '#fef2f2';
      nepaBanner.style.border = data.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca';
    }
  });

  const feedPostBtn = document.getElementById("post-gist-btn");
  const gistInput = document.getElementById("gist-input");
  const feedContainer = document.getElementById("gist-feed-container");

  if (feedPostBtn && gistInput && feedContainer) {
    feedPostBtn.addEventListener("click", async () => {
      const text = gistInput.value.trim();
      const targetLocation = targetSelect ? targetSelect.value : "ALL";

      if (!text) {
        showToast("Omo, put small gist inside box first na! 😂", "error");
        return;
      }

      feedPostBtn.disabled = true;
      feedPostBtn.textContent = "Posting...";

      try {
        const user = auth.currentUser;
        if (!user) return;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};

        let residenceText = userData.hostel ? `${userData.hostel}, Room ${userData.room}` : (userData.readingSpot || userData.area || "Yabatech Campus");

        await addDoc(collection(db, "gists"), {
          uid: user.uid,
          fullName: userData.fullName || "Yabatech Student",
          username: userData.username || "student",
          residence: residenceText,
          targetLocation: targetLocation,
          text: text,
          createdAt: serverTimestamp()
        });

        await updateDoc(userDocRef, { xp: increment(20) });
        gistInput.value = "";
        showToast("Gist posted! +20 XP 🚀", "success");
      } catch (err) {
        console.error("Posting error:", err);
        showToast("Posting failed.", "error");
      } finally {
        feedPostBtn.disabled = false;
        feedPostBtn.textContent = "Post Gist ( +20 XP )";
      }
    });

    const q = query(collection(db, "gists"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        feedContainer.innerHTML = `<div style="text-align:center; padding: 25px; color: var(--muted);"><p>Everywhere quiet o, be the first to drop gist!</p></div>`;
        return;
      }

      let html = "";
      let count = 0;
      
      snapshot.forEach((docSnap) => {
        const post = docSnap.data();
        const postId = docSnap.id;
        const postLocation = post.targetLocation || "ALL";

        if (activeTabLocation !== "ALL" && postLocation !== activeTabLocation) return;

        count++;
        const avatarLetter = (post.username || "U").charAt(0).toUpperCase();
        let userResidence = post.residence || "Campus Spot";
        userResidence = userResidence.replace(/Room\s+Room/gi, "Room");

        const timeAgo = formatTimeAgo(post.createdAt);

        html += `
          <article class="gist-post-card" id="post-${postId}" style="background: white; border: 1px solid var(--border); border-radius: 16px; padding: 14px; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
            <div class="post-header">
              <div class="post-avatar">${avatarLetter}</div>
              <div class="post-user-info">
                <div class="post-author-row">
                  <span class="user-profile-trigger post-username" data-uid="${post.uid || ''}">@${post.username || "student"}</span>
                  <span class="post-location-badge">${postLocation}</span>
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <span class="post-sub-location">📍 ${userResidence}</span>
                  <span style="font-size: 10px; color: var(--muted);">• ${timeAgo}</span>
                </div>
              </div>
            </div>

            <div class="post-body" style="margin: 10px 0; font-size: 0.88rem; color: #1e293b; line-height: 1.5;">
              <p>${post.text}</p>
            </div>

            <!-- Borderless Interaction Action Bar -->
            <div style="display: flex; align-items: center; gap: 24px; margin-top: 12px; padding-top: 10px; border-top: 1px dashed #f1f5f9;">
              <button type="button" onclick="window.toggleAgree('${postId}')" style="background: none; border: none; font-size: 0.84rem; font-weight: 700; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 0; outline: none;">
                👍🏽 Agree <span id="agree-count-${postId}" style="font-size: 0.75rem; background: #f1f5f9; color: #334155; padding: 2px 7px; border-radius: 99px;">${post.agrees || 0}</span>
              </button>
              
                            <button type="button" class="comment-toggle-btn" data-id="${postId}" style="background: none; border: none; font-size: 0.84rem; font-weight: 700; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 0; outline: none;">
                💬 Comment <span id="comment-count-${postId}" style="font-size: 0.75rem; background: #f1f5f9; color: #334155; padding: 2px 7px; border-radius: 99px;">0</span>
              </button>
            </div>

            <!-- Comments & Reply Box Container (Collapsible) -->
            <div id="comment-section-${postId}" style="display: none; margin-top: 12px; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0;">
              <div id="comments-list-${postId}" style="font-size:0.78rem; margin-bottom: 10px;">
                <span style="color:var(--muted);">Loading comments...</span>
              </div>
              <div class="post-reply-bar" style="display: flex; gap: 8px;">
                <input type="text" id="comment-input-${postId}" class="reply-input" placeholder="Write a reply..." style="flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.8rem; outline: none; background: white;" />
                <button type="button" class="reply-submit-btn" data-id="${postId}" style="background: #006633; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 0.78rem; cursor: pointer;">Reply</button>
              </div>
            </div>

          </article>
        `;
      });

      if (count === 0) {
        feedContainer.innerHTML = `<div style="text-align:center; padding: 25px; color: var(--muted);"><p>No posts in ${activeTabLocation} yet. Be the first!</p></div>`;
        return;
      }

      feedContainer.innerHTML = html;

      snapshot.forEach((docSnap) => {
        const post = docSnap.data();
        if (activeTabLocation === "ALL" || (post.targetLocation || "ALL") === activeTabLocation) {
          loadCommentsForPost(docSnap.id);
        }
      });
    });
  }
}

function loadCommentsForPost(postId) {
  const commentsListEl = document.getElementById(`comments-list-${postId}`);
  const commentCountEl = document.getElementById(`comment-count-${postId}`);
  if (!commentsListEl) return;

  const commentsQuery = query(collection(db, "gists", postId, "comments"), orderBy("createdAt", "asc"));
  onSnapshot(commentsQuery, (commSnapshot) => {
    if (commentCountEl) {
      commentCountEl.textContent = commSnapshot.size;
    }

    if (commSnapshot.empty) {
      commentsListEl.innerHTML = `<span style="color:var(--muted); font-size:0.75rem;">No comments yet.</span>`;
      return;
    }
    let commHtml = "";
    commSnapshot.forEach((commDoc) => {
      const c = commDoc.data();
      commHtml += `<div style="margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;"><strong class="user-profile-trigger" data-uid="${c.uid || ''}" style="color:var(--green); font-size:0.78rem; cursor:pointer; text-decoration:underline;">@${c.username || "student"}:</strong> <span style="color:#334155; font-size:0.78rem;">${c.text}</span></div>`;
    });
    commentsListEl.innerHTML = commHtml;
  });
}

window.postComment = async function(postId) {
  const inputEl = document.getElementById(`comment-input-${postId}`);
  if (!inputEl) return;
  const text = inputEl.value.trim();
  if (!text) {
    showToast("Type something before replying!", "error");
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) return;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    await addDoc(collection(db, "gists", postId, "comments"), {
      uid: user.uid,
      username: userData.username || "student",
      text: text,
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, "users", user.uid), { xp: increment(5) });
    inputEl.value = "";
    showToast("Reply sent! +5 XP 💬", "success");
  } catch (err) {
    console.error("Comment error:", err);
    showToast("Could not post comment.", "error");
  }
};

// ==========================================
// FEEDBACK MODAL & SUBMISSION LOGIC
// ==========================================
const feedbackModal = document.getElementById("feedback-modal");
const openFeedbackBtn = document.getElementById("open-feedback-btn");
const closeFeedbackBtn = document.getElementById("close-feedback-modal");
const feedbackForm = document.getElementById("feedback-modal-form");

if (openFeedbackBtn && feedbackModal) {
  openFeedbackBtn.addEventListener("click", () => feedbackModal.classList.add("active"));
}
if (closeFeedbackBtn && feedbackModal) {
  closeFeedbackBtn.addEventListener("click", () => feedbackModal.classList.remove("active"));
}

if (feedbackForm) {
  feedbackForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const category = document.getElementById("feedback-category").value;
    const message = document.getElementById("feedback-message").value.trim();
    const sender = document.getElementById("feedback-sender").value.trim();

    if (!message) {
      showToast("Please enter your feedback or request!", "error");
      return;
    }

    const submitBtn = document.getElementById("submit-feedback-modal-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "SUBMITTING...";

    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "feedbacks"), {
        uid: user ? user.uid : "anon",
        category,
        message,
        sender: sender || "Anonymous Student",
        createdAt: serverTimestamp()
      });

      feedbackForm.reset();
      feedbackModal.classList.remove("active");
      showToast("Feedback submitted to developers! Thanks a lot 💡🚀", "success");
    } catch (err) {
      console.error("Feedback submission error:", err);
      showToast("Could not submit feedback. Check network.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "SUBMIT FEEDBACK TO DEVELOPERS";
    }
  });
}

// ==========================================
// TOP NAVIGATION MENU TOGGLE
// ==========================================
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

// ==========================================
// INTERACTIVE STUDENT PROFILES & MODAL POPUP
// ==========================================
document.addEventListener("click", async (e) => {
  const trigger = e.target.closest(".user-profile-trigger");
  if (!trigger) return;
  
  const uid = trigger.getAttribute("data-uid");
  if (!uid) return;

  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const u = userDoc.data();
      
      const avatarEl = document.getElementById("modal-user-avatar");
      const nameEl = document.getElementById("modal-user-name");
      const handleEl = document.getElementById("modal-user-handle");
      const emailEl = document.getElementById("modal-user-email");
      const deptLevelEl = document.getElementById("modal-user-dept-level");
      const courseEl = document.getElementById("modal-user-course");
      const timeEl = document.getElementById("modal-user-study-time");
      const spotEl = document.getElementById("modal-user-spot");
      const waBtn = document.getElementById("modal-user-wa-btn");

      if (avatarEl) avatarEl.textContent = (u.fullName || u.username || "U")[0].toUpperCase();
      if (nameEl) nameEl.textContent = u.fullName || u.username || "Student";
      if (handleEl) handleEl.textContent = `@${u.username || "student"}`;
      if (emailEl) emailEl.textContent = u.email || "Not provided yet";

      let deptLevel = "";
      if (u.department && u.level) {
        deptLevel = `${u.department} (${u.level})`;
      } else {
        deptLevel = u.department || u.level || "Department not specified";
      }
      if (deptLevelEl) deptLevelEl.textContent = deptLevel;

      if (courseEl) courseEl.textContent = u.course || "General Studies / Not specified";
      if (timeEl) timeEl.textContent = u.studyTime || "Anytime / Not specified";
      if (spotEl) spotEl.textContent = u.readingSpot || u.hostel || "Campus";
      
      const cleanPhone = u.whatsapp ? u.whatsapp.replace(/[^0-9]/g, "") : "";
      if (cleanPhone && waBtn) {
        waBtn.style.display = "block";
        waBtn.href = `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(u.fullName || 'Geng')},%20saw%20you%20on%20Yastel%20Hub%20and%20want%2520us%20to%20connect%20for%20study!`;
      } else if (waBtn) {
        waBtn.style.display = "none";
      }

      const profileModal = document.getElementById("user-profile-modal");
      if (profileModal) profileModal.classList.add("active");
    }
  } catch (err) {
    console.error("Error opening profile modal:", err);
  }
});

// Close Profile Modal Handler
const closeProfileModalBtn = document.getElementById("close-user-profile-modal");
const userProfileModal = document.getElementById("user-profile-modal");

if (closeProfileModalBtn && userProfileModal) {
  closeProfileModalBtn.addEventListener("click", () => {
    userProfileModal.classList.remove("active");
  });
  userProfileModal.addEventListener("click", (e) => {
    if (e.target === userProfileModal) userProfileModal.classList.remove("active");
  });
}

// ==========================================
// LANDING PAGE FEATURE SCROLL PREVIEW OBSERVER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".feature-card");
  if (cards.length === 0) return;

  const observerOptions = {
    root: null,
    rootMargin: "-60% 0px -25% 0px", 
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        cards.forEach(c => {
          if (c !== entry.target) c.classList.remove("active-preview");
        });
        entry.target.classList.add("active-preview");
      } else {
        entry.target.classList.remove("active-preview");
      }
    });
  }, observerOptions);

  cards.forEach(card => observer.observe(card));
});

// ==========================================
// HERO HEADLINE ENTRANCE ANIMATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const heroHeading = document.querySelector(".hero h2");
  if (!heroHeading) return;

  setTimeout(() => {
    heroHeading.classList.add("animate-in");
  }, 100);
});

// ==========================================
// UNIVERSAL SCROLL ENTRANCE ANIMATION OBSERVER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const animatedElements = document.querySelectorAll(".animate-on-scroll");
  if (animatedElements.length === 0) return;

  const observerOptions = {
    root: null,
    rootMargin: "0px 0px -10% 0px",
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animatedElements.forEach(el => observer.observe(el));
});

// ==========================================
// BACKGROUND PUSH NOTIFICATIONS PERMISSION
// ==========================================
async function requestNotificationPermission(userId) {
  try {
    if (!messaging) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging);
      if (token) {
        await updateDoc(doc(db, "users", userId), { fcmToken: token });
      }
    }
  } catch (err) {
    console.error("Push notification permission error:", err);
  }
}

// ==========================================
// POST INTERACTION HELPERS (AGREE & COMMENT)
// ==========================================
window.toggleAgree = async function(postId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      showToast("Please log in to agree!", "error");
      return;
    }

    const postRef = doc(db, "gists", postId);
    const userAgreeRef = doc(db, "gists", postId, "agrees", user.uid);
    
    // Check if the user has already agreed
    const agreeDoc = await getDoc(userAgreeRef);

    if (agreeDoc.exists()) {
      // If already agreed, remove their vote and decrement counter
      await runTransaction(db, async (transaction) => {
        transaction.delete(userAgreeRef);
        transaction.update(postRef, { agrees: increment(-1) });
      });
      showToast("Agree removed.", "success");
    } else {
      // If not yet agreed, add vote and increment counter
      await runTransaction(db, async (transaction) => {
        transaction.set(userAgreeRef, { createdAt: serverTimestamp() });
        transaction.update(postRef, { agrees: increment(1) });
      });
      showToast("You agreed with this gist! 👍🏽", "success");
    }
  } catch (err) {
    console.error("Agree error:", err);
    showToast("Could not update agree status.", "error");
  }
};
document.addEventListener("click", (e) => {
  // Toggle Comment Box Open/Close
  const toggleBtn = e.target.closest(".comment-toggle-btn");
  if (toggleBtn) {
    const postId = toggleBtn.getAttribute("data-id");
    const section = document.getElementById(`comment-section-${postId}`);
    if (section) {
      section.style.display = section.style.display === "none" ? "block" : "none";
    }
    return;
  }

  // Submit Comment Reply
  const replyBtn = e.target.closest(".reply-submit-btn");
  if (replyBtn) {
    const postId = replyBtn.getAttribute("data-id");
    if (postId && typeof window.postComment === "function") {
      window.postComment(postId);
    }
    return;
  }
});
