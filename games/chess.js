// games/chess.js - Multiplayer Chess Logic for Ultimate Mind Games
import { ref, set, update, onValue } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

export function initChessGame(db, roomCode, isHost, currentUser) {
  const container = document.getElementById("active-game-container");
  container.innerHTML = `
    <div style="text-align: center; color: #38bdf8; margin-bottom: 10px; font-weight: bold;">
      ♟️ لعبة الشطرنج الجماعية (Multiplayer Chess)
    </div>
    <div id="chess-status" style="text-align: center; margin-bottom: 10px; font-size: 0.9rem; color: #f8fafc;">جاري تحميل لوحة الشطرنج...</div>
    <div id="chess-board" style="max-width: 320px; margin: 0 auto; background: #334155; padding: 10px; border-radius: 8px; text-align: center;">
      <p style="color: #cbd5e1; padding: 20px;">قريباً: تكامل لوحة الشطرنج التفاعلية بالكامل عبر Firebase Realtime Database!</p>
    </div>
  `;

  // Real-time synchronization reference for chess state
  const chessRef = ref(db, `rooms/${roomCode}/gameState/chess`);

  if (isHost) {
    // Initialize standard chessFEN or board state if not already set
    set(chessRef, {
      turn: "white",
      lastMove: "None",
      status: "active"
    });
  }

  onValue(chessRef, (snap) => {
    const data = snap.val();
    if (!data) return;
    document.getElementById("chess-status").innerText = `الدور الحالي: ${data.turn === 'white' ? 'الأبيض' : 'الأسود'}`;
  });
      }
