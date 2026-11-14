import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInAnonymously, setPersistence, browserLocalPersistence, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { getDatabase, ref, set, update, onValue, remove, onDisconnect, get } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDh02-Eb7qpWavevk9xrt3h0Jbwb5vI8s",
  authDomain: "ultimate-mind-games-by-dachi78.firebaseapp.com",
  databaseURL: "https://ultimate-mind-games-by-dachi78-default-rtdb.firebaseio.com",
  projectId: "ultimate-mind-games-by-dachi78",
  storageBucket: "ultimate-mind-games-by-dachi78.firebasestorage.app",
  messagingSenderId: "37380071346",
  appId: "1:37380071346:web:89ca4df227787ea27b4eab"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let currentProfile = { name: "", avatar: "" };
let currentRoom = null;
let isHost = false;
let uploadedAvatarBase64 = null;

const letters = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];

// Set Persistence & Listen for Auth State Changes
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Persistence setup error:", err);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const defaultName = user.displayName || "Guest-" + user.uid.slice(0, 4);
    const defaultAvatar = user.photoURL || "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/anonymous.png";

    // Check Realtime Database for custom saved name/avatar
    try {
      const snap = await get(ref(db, `users/${user.uid}`));
      if (snap.exists()) {
        const dbData = snap.val();
        currentProfile.name = dbData.name || defaultName;
        currentProfile.avatar = dbData.avatar || defaultAvatar;
      } else {
        currentProfile = { name: defaultName, avatar: defaultAvatar };
        await set(ref(db, `users/${user.uid}`), currentProfile);
      }
    } catch (e) {
      currentProfile = { name: defaultName, avatar: defaultAvatar };
    }

    document.getElementById("profile-name").innerText = currentProfile.name;
    document.getElementById("user-avatar").src = currentProfile.avatar;
    document.getElementById("user-profile-bar").classList.remove("hidden");

    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("lobby-screen").classList.remove("hidden");
  } else {
    currentUser = null;
    currentProfile = { name: "", avatar: "" };
    currentRoom = null;
    isHost = false;

    document.getElementById("user-profile-bar").classList.add("hidden");
    document.getElementById("lobby-screen").classList.add("hidden");
    document.getElementById("host-setup-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("auth-screen").classList.remove("hidden");
  }
});

// Top-Right Dropdown Menu Toggle
const menuToggleBtn = document.getElementById("menu-toggle-btn");
const dropdownMenu = document.getElementById("dropdown-menu");

menuToggleBtn.onclick = (e) => {
  e.stopPropagation();
  dropdownMenu.classList.toggle("show");
};

window.onclick = () => {
  if (dropdownMenu.classList.contains("show")) {
    dropdownMenu.classList.remove("show");
  }
};

// Login Handlers
document.getElementById("google-login-btn").onclick = () => {
  signInWithPopup(auth, new GoogleAuthProvider())
    .catch((err) => alert("Google Login Error: " + err.message));
};

document.getElementById("guest-login-btn").onclick = () => {
  signInAnonymously(auth)
    .catch((err) => alert("Guest Login Error: " + err.message));
};

// Logout Handler with cleanup
document.getElementById("logout-btn").onclick = () => {
  if (currentRoom) {
    remove(ref(db, `rooms/${currentRoom}/players/${currentUser.uid}`));
  }
  signOut(auth).catch((err) => alert("Logout Error: " + err.message));
};

// Friends & Settings Handlers
document.getElementById("friends-menu-btn").onclick = () => {
  document.getElementById("friends-modal").classList.remove("hidden");
};
document.getElementById("close-friends-btn").onclick = () => {
  document.getElementById("friends-modal").classList.add("hidden");
};
document.getElementById("settings-menu-btn").onclick = () => {
  alert("قريباً: إعدادات الصوت، والوضع الليلي المتقدم، وتخصيص اللعبة!");
};

// Profile Customization Modal & Image Compression Handler
document.getElementById("edit-profile-menu-btn").onclick = () => {
  document.getElementById("edit-profile-modal").classList.remove("hidden");
  document.getElementById("new-username-input").value = currentProfile.name;
  uploadedAvatarBase64 = currentProfile.avatar;
};

document.getElementById("cancel-profile-btn").onclick = () => {
  document.getElementById("edit-profile-modal").classList.add("hidden");
};

// Compress uploaded image to 96x96 JPEG so it stores cleanly in Firebase RTDB
document.getElementById("avatar-file-input").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 96;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      uploadedAvatarBase64 = canvas.toDataURL("image/jpeg", 0.7);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

document.getElementById("save-profile-btn").onclick = async () => {
  const newName = document.getElementById("new-username-input").value.trim();
  if (!newName) return alert("الرجاء إدخال اسم مستخدم صحيح");

  const finalAvatar = uploadedAvatarBase64 || currentProfile.avatar;

  try {
    // Save name to Firebase Auth (short string, no URL limit issue)
    await updateProfile(currentUser, { displayName: newName });

    // Save both name and compressed avatar to Realtime Database
    currentProfile = { name: newName, avatar: finalAvatar };
    await set(ref(db, `users/${currentUser.uid}`), currentProfile);

    document.getElementById("profile-name").innerText = newName;
    document.getElementById("user-avatar").src = finalAvatar;
    document.getElementById("edit-profile-modal").classList.add("hidden");

    if (currentRoom) {
      await update(ref(db, `rooms/${currentRoom}/players/${currentUser.uid}`), {
        name: newName,
        photoURL: finalAvatar
      });
    }
    alert("تم تحديث الملف الشخصي بنجاح!");
  } catch (err) {
    alert("خطأ في التحديث: " + err.message);
  }
};

// Host Setup Navigation
document.getElementById("open-host-setup-btn").onclick = () => {
  document.getElementById("lobby-screen").classList.add("hidden");
  document.getElementById("host-setup-screen").classList.remove("hidden");
};

document.getElementById("cancel-host-btn").onclick = () => {
  document.getElementById("host-setup-screen").classList.add("hidden");
  document.getElementById("lobby-screen").classList.remove("hidden");
};

// Generate 6-Digit Alphanumeric Room Code
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Confirm Host Setup & Create Room
document.getElementById("confirm-host-btn").onclick = () => {
  const code = generateRoomCode();
  const gameMode = document.getElementById("game-mode-select").value;
  const maxPlayers = document.getElementById("max-players-input").value;
  const voiceChat = document.getElementById("voice-chat-toggle").checked;

  isHost = true;
  set(ref(db, `rooms/${code}`), {
    gameMode,
    maxPlayers,
    voiceChat,
    status: "waiting",
    hostUid: currentUser.uid,
    activeLetter: "",
    claimedLetters: {},
    buzzerWinner: ""
  });

  enterRoom(code);
};

// Join Room as Player
document.getElementById("join-room-btn").onclick = () => {
  const code = document.getElementById("room-code-input").value.trim().toUpperCase();
  if (code.length !== 6) return alert("الرمز يجب أن يكون مكوناً من 6 خانات");
  isHost = false;
  enterRoom(code);
};

function enterRoom(code) {
  currentRoom = code;
  document.getElementById("lobby-screen").classList.add("hidden");
  document.getElementById("host-setup-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");
  document.getElementById("display-room-code").innerText = `Room: ${code}`;
  document.getElementById("role-badge").innerText = isHost ? "🎙️ Host" : "🎮 Player";

  const playerRef = ref(db, `rooms/${code}/players/${currentUser.uid}`);
  set(playerRef, {
    name: currentProfile.name,
    photoURL: currentProfile.avatar,
    role: isHost ? "host" : "player"
  });
  onDisconnect(playerRef).remove();

  if (isHost) {
    document.getElementById("start-game-btn").classList.remove("hidden");
    document.getElementById("reset-buzzer-btn").classList.remove("hidden");
  } else {
    document.getElementById("buzzer-btn").classList.remove("hidden");
  }

  onValue(ref(db, `rooms/${code}`), (snap) => {
    const data = snap.val();
    if (!data) return;

    const rosterList = document.getElementById("players-list");
    rosterList.innerHTML = "";
    if (data.players) {
      Object.entries(data.players).forEach(([uid, p]) => {
        const li = document.createElement("li");
        li.style.cssText = "display: flex; align-items: center; gap: 10px; background: #1e293b; padding: 8px; border-radius: 8px;";
        li.innerHTML = `<img src="${p.photoURL || 'https://via.placeholder.com/30'}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;"> <span>${p.name} (${p.role})</span>`;
        
        if (isHost && uid !== currentUser.uid) {
          const adminBtn = document.createElement("button");
          adminBtn.innerText = p.role === "admin" ? "إلغاء مشرف" : "ترقية مشرف";
          adminBtn.className = "btn secondary";
          adminBtn.style.padding = "4px 8px";
          adminBtn.style.fontSize = "0.75rem";
          adminBtn.style.marginLeft = "auto";
          adminBtn.onclick = () => {
            update(ref(db, `rooms/${code}/players/${uid}`), { role: p.role === "admin" ? "player" : "admin" });
          };
          li.appendChild(adminBtn);
        }
        rosterList.appendChild(li);
      });
    }

    if (data.status === "playing") {
      document.getElementById("waiting-lobby").classList.add("hidden");
      document.getElementById("active-game-container").classList.remove("hidden");

      renderGrid(data.activeLetter, data.claimedLetters || {});
      const banner = document.getElementById("status-banner");
      if (data.buzzerWinner) {
        banner.innerText = `🔔 أسرع إجابة: ${data.buzzerWinner}!`;
        banner.style.borderColor = "#ef4444";
      } else if (data.activeLetter) {
        banner.innerText = `الحرف المختار: [ ${data.activeLetter} ]`;
        banner.style.borderColor = "#f59e0b";
      } else {
        banner.innerText = "اختر حرفاً من اللوحة للبدء!";
        banner.style.borderColor = "#334155";
      }
    }
  });
}

// Quit Room Handler
document.getElementById("quit-room-btn").onclick = () => {
  if (currentRoom) {
    remove(ref(db, `rooms/${currentRoom}/players/${currentUser.uid}`));
    currentRoom = null;
  }
  document.getElementById("game-screen").classList.add("hidden");
  document.getElementById("active-game-container").classList.add("hidden");
  document.getElementById("waiting-lobby").classList.remove("hidden");
  document.getElementById("start-game-btn").classList.add("hidden");
  document.getElementById("buzzer-btn").classList.add("hidden");
  document.getElementById("reset-buzzer-btn").classList.add("hidden");
  document.getElementById("lobby-screen").classList.remove("hidden");
};

// Host Starts the Game
document.getElementById("start-game-btn").onclick = () => {
  if (!isHost) return;
  update(ref(db, `rooms/${currentRoom}`), { status: "playing" });
};

// Horouf Letter Grid Render & Interaction
function renderGrid(activeLetter, claimedLetters) {
  const grid = document.getElementById("letter-grid");
  grid.innerHTML = "";
  letters.forEach(letter => {
    const btn = document.createElement("button");
    btn.className = "letter-tile";
    if (claimedLetters && claimedLetters[letter]) {
      btn.classList.add("claimed");
    } else if (letter === activeLetter) {
      btn.classList.add("active");
    }
    btn.innerText = letter;

    btn.onclick = () => {
      if (!isHost) return;
      if (activeLetter === letter) {
        update(ref(db, `rooms/${currentRoom}/claimedLetters`), { [letter]: true });
        update(ref(db, `rooms/${currentRoom}`), { activeLetter: "", buzzerWinner: "" });
      } else {
        update(ref(db, `rooms/${currentRoom}`), { activeLetter: letter, buzzerWinner: "" });
      }
    };
    grid.appendChild(btn);
  });
}

// Buzzer Handlers
document.getElementById("buzzer-btn").onclick = () => {
  const name = currentProfile.name;
  onValue(ref(db, `rooms/${currentRoom}/buzzerWinner`), (snap) => {
    if (!snap.val()) {
      update(ref(db, `rooms/${currentRoom}`), { buzzerWinner: name });
    }
  }, { onlyOnce: true });
};

document.getElementById("reset-buzzer-btn").onclick = () => {
  update(ref(db, `rooms/${currentRoom}`), { buzzerWinner: "" });
};
