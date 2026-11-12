import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, update, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ⚠️ REPLACE THIS WITH YOUR FIREBASE CONFIG KEYS FROM STEP 1
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://PASTE_YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "PASTE_YOUR_PROJECT",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let currentRoom = null;
let isHost = false;
let prayerTimings = null;

// Arabic Alphabet for Horouf wa Alouf
const letters = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];

// 1. Authentication
document.getElementById("google-login-btn").onclick = () => signInWithPopup(auth, new GoogleAuthProvider()).then(onLogin);
document.getElementById("guest-login-btn").onclick = () => signInAnonymously(auth).then(onLogin);

function onLogin(res) {
  currentUser = res.user;
  const name = currentUser.displayName || "Guest-" + currentUser.uid.slice(0, 4);
  document.getElementById("welcome-msg").innerText = `أهلاً بك، ${name}`;
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("lobby-screen").classList.remove("hidden");
}

// 2. Create Host Room
document.getElementById("create-room-btn").onclick = () => {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  isHost = true;
  set(ref(db, `rooms/${code}`), {
    activeLetter: "",
    claimedLetters: {},
    buzzerWinner: ""
  });
  enterRoom(code);
};

// 3. Join Player Room
document.getElementById("join-room-btn").onclick = () => {
  const code = document.getElementById("room-code-input").value.trim();
  if (code.length !== 4) return alert("الرجاء إدخال رمز مكون من 4 أرقام");
  isHost = false;
  enterRoom(code);
};

function enterRoom(code) {
  currentRoom = code;
  document.getElementById("lobby-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");
  document.getElementById("display-room-code").innerText = `Room: ${code}`;
  document.getElementById("role-badge").innerText = isHost ? "🎙️ Host" : "🎮 Player";

  if (isHost) {
    document.getElementById("reset-buzzer-btn").classList.remove("hidden");
  } else {
    document.getElementById("buzzer-btn").classList.remove("hidden");
  }

  // Listen to real-time updates
  onValue(ref(db, `rooms/${code}`), (snap) => {
    const data = snap.val();
    if (!data) return;

    renderGrid(data.activeLetter, data.claimedLetters || {});

    const banner = document.getElementById("status-banner");
    if (data.buzzerWinner) {
      banner.innerText = `🔔 أسرع إجابة: ${data.buzzerWinner}!`;
      banner.style.borderColor = "#ef4444";
    } else if (data.activeLetter) {
      banner.innerText = `الحرف المختار: [ ${data.activeLetter} ] — استعد للجرس!`;
      banner.style.borderColor = "#f59e0b";
    } else {
      banner.innerText = "اختر حرفاً من اللوحة للبدء!";
      banner.style.borderColor = "#334155";
    }
  });
}

// 4. Render Horouf wa Alouf Board
function renderGrid(activeLetter, claimedLetters) {
  const grid = document.getElementById("letter-grid");
  grid.innerHTML = "";
  letters.forEach(letter => {
    const btn = document.createElement("button");
    btn.className = "letter-tile";
    if (claimedLetters[letter]) btn.classList.add("claimed");
    else if (letter === activeLetter) btn.classList.add("active");
    btn.innerText = letter;

    btn.onclick = () => {
      if (!isHost) return;
      // Tap once to select letter, tap again to mark it claimed/green
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

// 5. Buzzer Logic
document.getElementById("buzzer-btn").onclick = () => {
  const name = currentUser.displayName || "Guest-" + currentUser.uid.slice(0, 4);
  onValue(ref(db, `rooms/${currentRoom}/buzzerWinner`), (snap) => {
    if (!snap.val()) {
      update(ref(db, `rooms/${currentRoom}`), { buzzerWinner: name });
    }
  }, { onlyOnce: true });
};

document.getElementById("reset-buzzer-btn").onclick = () => {
  update(ref(db, `rooms/${currentRoom}`), { buzzerWinner: "" });
};

// 6. Salah Prayer Auto-Pause (Geolocation + AlAdhan API)
document.getElementById("muslim-mode-checkbox").onchange = (e) => {
  if (e.target.checked && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const date = new Date().toISOString().split('T')[0];
      const res = await fetch(`https://api.aladhan.com/v1/timings/${date}?latitude=${latitude}&longitude=${longitude}&method=2`);
      const json = await res.json();
      prayerTimings = json.data.timings;
      alert("تم تفعيل تنبيه الصلاة حسب موقعك بنجاح!");
    });
  }
};

setInterval(() => {
  if (!prayerTimings || !document.getElementById("muslim-mode-checkbox").checked) return;
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  for (const p of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
    const [h, m] = prayerTimings[p].split(':').map(Number);
    if (currentMins === h * 60 + m) {
      document.getElementById("salah-text").innerText = `حان الآن موعد صلاة ${p}. اللعبة متوقفة مؤقتاً.`;
      document.getElementById("salah-overlay").classList.remove("hidden");
    }
  }
}, 30000);

document.getElementById("resume-salah-btn").onclick = () => {
  document.getElementById("salah-overlay").classList.add("hidden");
};
