import { ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

export function initChessGame(db, code, isHost, currentUser) {
  const container = document.getElementById("active-game-container");
  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 12px;">
      <h3 style="color: #38bdf8; margin: 0 0 5px 0;">♔ لعبة الشطرنج ♚</h3>
      <div id="chess-status" style="font-size: 0.95rem; color: #facc15; font-weight: bold;">جاري الاتصال بالطاولة...</div>
    </div>
    <div id="chess-board" style="display: grid; grid-template-columns: repeat(8, 1fr); width: 100%; max-width: 380px; aspect-ratio: 1/1; margin: 0 auto; border: 4px solid #334155; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);"></div>
    <div style="text-align: center; margin-top: 15px;">
      <button id="reset-chess-btn" class="btn secondary" style="background: #475569; width: 100%; max-width: 380px;">🔄 إعادة تشغيل الطاولة</button>
    </div>
  `;

  const boardEl = document.getElementById("chess-board");
  const statusEl = document.getElementById("chess-status");
  const roomRef = ref(db, `rooms/${code}/chessState`);

  const initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  ];

  const pieceSymbols = {
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙',
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟'
  };

  let selectedSquare = null;

  onValue(roomRef, (snapshot) => {
    let gameState = snapshot.val();
    if (!gameState) {
      if (isHost) {
        gameState = {
          board: initialBoard,
          turn: 'white',
          whitePlayer: currentUser.uid,
          blackPlayer: null,
          winner: null
        };
        set(roomRef, gameState);
      }
      return;
    }

    if (!gameState.blackPlayer && !isHost && gameState.whitePlayer !== currentUser.uid) {
      update(roomRef, { blackPlayer: currentUser.uid });
    }

    renderBoard(gameState);
  });

  function renderBoard(state) {
    boardEl.innerHTML = "";
    const board = state.board || initialBoard;
    const isMyTurn = (state.turn === 'white' && state.whitePlayer === currentUser.uid) ||
                     (state.turn === 'black' && state.blackPlayer === currentUser.uid);

    statusEl.innerText = state.winner ? `🏆 انتهت اللعبة! الفائز: ${state.winner}` : 
                         (isMyTurn ? "🎯 دورك للعب (Your Turn)" : `⏳ دور الخصم (${state.turn === 'white' ? 'الأبيض' : 'الأسود'})`);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = document.createElement("div");
        const isDark = (r + c) % 2 === 1;
        square.style.backgroundColor = isDark ? "#475569" : "#cbd5e1";
        square.style.display = "flex";
        square.style.alignItems = "center";
        square.style.justifyContent = "center";
        square.style.fontSize = "2rem";
        square.style.cursor = "pointer";
        square.style.userSelect = "none";

        const piece = board[r][c];
        if (piece) {
          square.innerText = pieceSymbols[piece] || piece;
          square.style.color = piece === piece.toUpperCase() ? "#ffffff" : "#0f172a";
        }

        if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
          square.style.outline = "3px solid #38bdf8";
          square.style.outlineOffset = "-3px";
        }

        square.onclick = () => {
          if (state.winner) return;
          if (!isMyTurn) {
            alert("ليس دورك للعب الآن!");
            return;
          }

          if (!selectedSquare) {
            if (!piece) return;
            const isWhitePiece = piece === piece.toUpperCase();
            if ((state.turn === 'white' && !isWhitePiece) || (state.turn === 'black' && isWhitePiece)) {
              alert("هذه قطعتك الخاصة باللون الآخر!");
              return;
            }
            selectedSquare = { r, c };
            renderBoard(state);
          } else {
            const newBoard = board.map(row => [...row]);
            const targetPiece = newBoard[selectedSquare.r][selectedSquare.c];
            
            if (newBoard[r][c].toLowerCase() === 'k') {
              state.winner = state.turn === 'white' ? 'الأبيض (White)' : 'الأسود (Black)';
            }

            newBoard[r][c] = targetPiece;
            newBoard[selectedSquare.r][selectedSquare.c] = '';
            selectedSquare = null;

            const nextTurn = state.turn === 'white' ? 'black' : 'white';
            update(roomRef, {
              board: newBoard,
              turn: nextTurn,
              winner: state.winner || null
            });
          }
        };

        boardEl.appendChild(square);
      }
    }
  }

  const resetBtn = document.getElementById("reset-chess-btn");
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (!isHost) return alert("المضيف فقط يمكنه إعادة التشغيل");
      set(roomRef, {
        board: initialBoard,
        turn: 'white',
        whitePlayer: currentUser.uid,
        blackPlayer: null,
        winner: null
      });
    };
  }
}
