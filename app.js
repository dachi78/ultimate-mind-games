import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInAnonymously, setPersistence, browserLocalPersistence, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { getDatabase, ref, set, update, onValue, remove, onDisconnect, get } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";
import { initChessGame } from "./games/chess.js";

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

setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Persistence setup error:", err);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const defaultName = user.displayName || "Guest-" + user.uid.slice(0, 4);
    const defaultAvatar = user.photoURL || "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/anonymous.png";

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

const menuToggleBtn = document.getElementById("menu-toggle-btn");
const dropdownMenu = document.getElementById("dropdown-menu");

if (menuToggleBtn) {
  menuToggleBtn.onclick = (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("show");
  };
}

window.onclick = () => {
  if (dropdownMenu && dropdownMenu.classList.contains("show")) {
    dropdownMenu.classList.remove("show");
  }
};

const googleLoginBtn = document.getElementById("google-login-btn");
if (googleLoginBtn) {
  googleLoginBtn.onclick = () => {
    signInWithPopup(auth, new GoogleAuthProvider())
      .catch((err) => alert("Google Login Error: " + err.message));
  };
}

const guestLoginBtn = document.getElementById("guest-login-btn");
if (guestLoginBtn) {
  guestLoginBtn.onclick = () => {
    signInAnonymously(auth)
      .catch((err) => alert("Guest Login Error: " + err.message));
  };
}

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.onclick = () => {
    if (currentRoom) {
      remove(ref(db, `rooms/${currentRoom}/players/${currentUser.uid}`));
    }
    signOut(auth).catch((err) => alert("Logout Error: " + err.message));
  };
}

const friendsMenuBtn = document.getElementById("friends-menu-btn");
if (friendsMenuBtn) {
  friendsMenuBtn.onclick = () => {
    document.getElementById("friends-modal").classList.remove("hidden");
  };
}

const closeFriendsBtn = document.getElementById("close-friends-btn");
if (closeFriendsBtn) {
  closeFriendsBtn.onclick = () => {
    document.getElementById("friends-modal").classList.add("hidden");
  };
}

const settingsMenuBtn = document.getElementById("settings-menu-btn");
if (settingsMenuBtn) {
  settingsMenuBtn.onclick = () => {
    alert("قريباً: إعدادات الصوت، والوضع الليلي المتقدم!");
  };
}

const editProfileMenuBtn = document.getElementById("edit-profile-menu-btn");
if (editProfileMenuBtn) {
  editProfileMenuBtn.onclick = () => {
    document.getElementById("edit-profile-modal").classList.remove("hidden");
    document.getElementById("new-username-input").value = currentProfile.name;
    uploadedAvatarBase64 = currentProfile.avatar;
  };
}

const cancelProfileBtn = document.getElementById("cancel-profile-btn");
if (cancelProfileBtn) {
  cancelProfileBtn.onclick = () => {
    document.getElementById("edit-profile-modal").classList.add("hidden");
  };
}

const avatarFileInput = document.getElementById("avatar-file-input");
if (avatarFileInput) {
  avatarFileInput.onchange = (e) => {
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
}

const saveProfileBtn = document.getElementById("save-profile-btn");
if (saveProfileBtn) {
  saveProfileBtn.onclick = async () => {
    const newName = document.getElementById("new-username-input").value.trim();
    if (!newName) return alert("الرجاء إدخال اسم مستخدم صحيح");

    const finalAvatar = uploadedAvatarBase64 || currentProfile.avatar;

    try {
      await updateProfile(currentUser, { displayName: newName });
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
}

const openHostSetupBtn = document.getElementById("open-host-setup-btn");
if (openHostSetupBtn) {
  openHostSetupBtn.onclick = () => {
    document.getElementById("lobby-screen").classList.add("hidden");
    document.getElementById("host-setup-screen").classList.remove("hidden");
  };
}

const cancelHostBtn = document.getElementById("cancel-host-btn");
if (cancelHostBtn) {
  cancelHostBtn.onclick = () => {
    document.getElementById("host-setup-screen").classList.add("hidden");
    document.getElementById("lobby-screen").classList.remove("hidden");
  };
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const confirmHostBtn = document.getElementById("confirm-host-btn");
if (confirmHostBtn) {
  confirmHostBtn.onclick = () => {
    const code = generateRoomCode();
    const gameModeSelect = document.getElementById("game-mode-select");
    const gameMode = gameModeSelect ? gameModeSelect.value : "chess";
    const maxPlayers = gameMode === "chess" ? 2 : 10;

    isHost = true;
    set(ref(db, `rooms/${code}`), {
      gameMode,
      maxPlayers,
      status: "waiting",
      hostUid: currentUser.uid
    });

    enterRoom(code);
  };
}

const joinRoomBtn = document.getElementById("join-room-btn");
if (joinRoomBtn) {
  joinRoomBtn.onclick = async () => {
    const roomCodeInput = document.getElementById("room-code-input");
    const code = roomCodeInput ? roomCodeInput.value.trim().toUpperCase() : "";
    if (code.length !== 6) return alert("الرمز يجب أن يكون مكوناً من 6 خانات");

    try {
      const snap = await get(ref(db, `rooms/${code}`));
      if (!snap.exists()) {
        return alert("الغرفة غير موجودة!");
      }
      const roomData = snap.val();
      if (roomData.gameMode === "chess" && roomData.players) {
        const playerCount = Object.keys(roomData.players).length;
        if (playerCount >= 2 && !roomData.players[currentUser.uid]) {
          return alert("غرفة الشطرنج ممتلئة! الحد الأقصى لاعب واحد فقط ضد المضيف.");
        }
      }
    } catch (err) {
      console.error(err);
    }

    isHost = false;
    enterRoom(code);
  };
}

function enterRoom(code) {
  currentRoom = code;
  document.getElementById("lobby-screen").classList.add("hidden");
  document.getElementById("host-setup-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  const playerRef = ref(db, `rooms/${code}/players/${currentUser.uid}`);
  set(playerRef, {
    name: currentProfile.name,
    photoURL: currentProfile.avatar,
    role: isHost ? "host" : "player"
  });
  onDisconnect(playerRef).remove();

  const startGameBtn = document.getElementById("start-game-btn");
  if (startGameBtn) {
    if (isHost) {
      startGameBtn.classList.remove("hidden");
    } else {
      startGameBtn.classList.add("hidden");
    }
  }

  onValue(ref(db, `rooms/${code}`), (snap) => {
    const data = snap.val();
    if (!data) return;

    const rosterList = document.getElementById("players-list");
    if (rosterList) {
      rosterList.innerHTML = "";
      if (data.players) {
        Object.entries(data.players).forEach(([uid, p]) => {
          const li = document.createElement("li");
          li.style.cssText = "display: flex; align-items: center; gap: 10px; background: #0f172a; padding: 8px; border-radius: 8px;";
          li.innerHTML = `<img src="${p.photoURL || 'https://via.placeholder.com/30'}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;"> <span>${p.name} (${p.role})</span>`;
          rosterList.appendChild(li);
        });
      }
    }

    if (data.status === "playing") {
      const waitingLobby = document.getElementById("waiting-lobby");
      if (waitingLobby) waitingLobby.classList.add("hidden");
      
      const activeGameContainer = document.getElementById("active-game-container");
      if (activeGameContainer) activeGameContainer.classList.remove("hidden");
      
      const mainHeader = document.getElementById("main-header");
      if (mainHeader) mainHeader.classList.add("hidden");
      
      const mainFooter = document.querySelector("footer");
      if (mainFooter) mainFooter.classList.add("hidden");

      if (data.gameMode === "chess") {
        initChessGame(db, code, isHost, currentUser);
      }
    }
  });
}

const quitRoomBtn = document.getElementById("quit-room-btn");
if (quitRoomBtn) {
  quitRoomBtn.onclick = () => {
    if (currentRoom) {
      remove(ref(db, `rooms/${currentRoom}/players/${currentUser.uid}`));
      currentRoom = null;
    }
    const mainHeader = document.getElementById("main-header");
    if (mainHeader) mainHeader.classList.remove("hidden");
    
    const mainFooter = document.querySelector("footer");
    if (mainFooter) mainFooter.classList.remove("hidden");

    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("active-game-container").classList.add("hidden");
    document.getElementById("waiting-lobby").classList.remove("hidden");
    
    const startGameBtn = document.getElementById("start-game-btn");
    if (startGameBtn) startGameBtn.classList.add("hidden");
    
    document.getElementById("lobby-screen").classList.remove("hidden");
  };
}

const startGameBtn = document.getElementById("start-game-btn");
if (startGameBtn) {
  startGameBtn.onclick = () => {
    if (!isHost) return;
    update(ref(db, `rooms/${currentRoom}`), { status: "playing" });
  };
}
