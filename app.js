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

// Chess Engine variables
let chessGame = new Chess();
let selectedSquare = null;

// Set Persistence & Listen for Auth State Changes
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

// Logout Handler
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
  alert("قريباً: إعدادات الصوت والوضع الليلي!");
};

// Profile Customization Modal
document.getElementById("edit-profile-menu-btn").onclick = () => {
  document.getElementById("edit-profile-modal").classList.remove("hidden");
  document.getElementById("new-username-input").value = currentProfile.name;
  uploadedAvatarBase64 = currentProfile.avatar;
};

document.getElementById("cancel-profile-btn").onclick = () => {
  document.getElementById("edit-profile-modal").classList.add("hidden");
};

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

// Host Setup Navigation
document.getElementById("open-host-setup-btn").onclick = () => {
  document.getElementById("lobby-screen").classList.add("hidden");
  document.getElementById("host-setup-screen").classList.remove("hidden");
};

document.getElementById("cancel-host-btn").onclick = () => {
  document.getElementById("host-setup-screen").classList.add("hidden");
  document.getElementById("lobby-screen").classList.remove("hidden");
};

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
  const voiceChat = document.getElementById("voice-chat-toggle").checked;

  isHost = true;
  chessGame.reset();

  set(ref(db, `rooms/${code}`), {
    gameMode: "chess",
    maxPlayers: 2,
    voiceChat,
    status: "waiting",
    hostUid: currentUser.uid,
    chessFEN: chessGame.fen()
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
  document.getElementById("role-badge").innerText = isHost ? "🎙️ Host (White)" : "🎮 Player (Black)";

  const playerRef = ref(db, `rooms/${code}/players/${currentUser.uid}`);
  set(playerRef, {
    name: currentProfile.name,
    photoURL: currentProfile.avatar,
    role: isHost ? "host" : "player",
    color: isHost ? "white" : "black"
  });
  onDisconnect(playerRef).remove();

  if (isHost) {
    document.getElementById("start-game-btn").classList.remove("hidden");
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
        li.innerHTML = `<img src="${p.photoURL || 'https://via.placeholder.com/30'}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;"> <span>${p.name} (${p.role === 'host' ? 'Host - White' : 'Player - Black'})</span>`;
        rosterList.appendChild(li);
      });
    }

    if (data.status === "playing") {
      document.getElementById("waiting-lobby").classList.add("hidden");
      document.getElementById("active-game-container").classList.remove("hidden");

      if (data.chessFEN) {
        chessGame.load(data.chessFEN);
        renderChessBoard();
      }

      if (isHost) {
        document.getElementById("reset-chess-btn").classList.remove("hidden");
      }
    }
  });
}

// Render Chess Board UI
function renderChessBoard() {
  const boardEl = document.getElementById("chess-board");
  boardEl.innerHTML = "";
  boardEl.style.cssText = "display: grid; grid-template-columns: repeat(8, 1fr); width: 100%; max-width: 380px; aspect-ratio: 1/1; margin: 0 auto; border: 3px solid #334155; border-radius: 6px; user-select: none;";

  const board = chessGame.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const squareEl = document.createElement("div");
      const isDark = (r + c) % 2 === 1;
      const file = 'abcdefgh'[c];
      const rank = '87654321'[r];
      const squareName = file + rank;

      squareEl.style.cssText = `
        background: ${isDark ? '#b58863' : '#f0d9b5'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.2rem;
        cursor: pointer;
        position: relative;
      `;

      const piece = board[r][c];
      if (piece) {
        const symbols = {
          p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
          P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
        };
        squareEl.innerText = symbols[piece.color === 'w' ? piece.type.toUpperCase() : piece.type];
        squareEl.style.color = piece.color === 'w' ? '#ffffff' : '#0f172a';
        squareEl.style.textShadow = piece.color === 'w' ? '0 1px 3px rgba(0,0,0,0.9)' : '0 1px 2px rgba(255,255,255,0.4)';
      }

      if (selectedSquare === squareName) {
        squareEl.style.outline = '3px solid #38bdf8';
        squareEl.style.outlineOffset = '-3px';
        squareEl.style.background = '#769656';
      }

      squareEl.onclick = () => handleSquareClick(squareName);
      boardEl.appendChild(squareEl);
    }
  }

  const statusEl = document.getElementById("chess-status");
  if (chessGame.in_checkmate()) {
    statusEl.innerText = `🏁 انتهت اللعبة: مات الملك (Checkmate)!`;
    statusEl.style.borderColor = "#ef4444";
  } else if (chessGame.in_draw()) {
    statusEl.innerText = `🤝 انتهت اللعبة بالتعادل (Draw)!`;
    statusEl.style.borderColor = "#f59e0b";
  } else {
    const turnName = chessGame.turn() === 'w' ? 'الأبيض (White)' : 'الأسود (Black)';
    statusEl.innerText = `دور اللاعب: ${turnName} ${chessGame.in_check() ? '⚠️ (تحذير كيش!)' : ''}`;
    statusEl.style.borderColor = "#334155";
  }
}

// Handle Square Clicks & Moves
function handleSquareClick(square) {
  const myColor = isHost ? 'w' : 'b';
  if (chessGame.turn() !== myColor) {
    return; // Not your turn
  }

  if (!selectedSquare) {
    const piece = chessGame.get(square);
    if (piece && piece.color === myColor) {
      selectedSquare = square;
      renderChessBoard();
    }
  } else {
    const move = chessGame.move({
      from: selectedSquare,
      to: square,
      promotion: 'q' // Auto promote to Queen
    });

    selectedSquare = null;
    if (move) {
      update(ref(db, `rooms/${currentRoom}`), {
        chessFEN: chessGame.fen()
      });
    } else {
      const piece = chessGame.get(square);
      if (piece && piece.color === myColor) {
        selectedSquare = square;
      }
      renderChessBoard();
    }
  }
}

// Host Starts the Game
document.getElementById("start-game-btn").onclick = () => {
  if (!isHost) return;
  update(ref(db, `rooms/${currentRoom}`), { status: "playing" });
};

// Reset Game Board (Host only)
document.getElementById("reset-chess-btn").onclick = () => {
  if (!isHost) return;
  chessGame.reset();
  update(ref(db, `rooms/${currentRoom}`), {
    chessFEN: chessGame.fen()
  });
};

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
  document.getElementById("reset-chess-btn").classList.add("hidden");
  document.getElementById("lobby-screen").classList.remove("hidden");
};
