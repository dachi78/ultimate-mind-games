import { ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

export function initChessGame(db, code, isHost, currentUser) {
  const container = document.getElementById("active-game-container");
  
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 100%; max-width: 480px; margin: 0 auto; padding: 4px; box-sizing: border-box;">
      <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 0 4px;">
        <div id="chess-status" style="font-size: 0.9rem; color: #facc15; font-weight: bold; text-align: right; flex: 1;">جاري الاتصال بالطاولة...</div>
        <button id="quit-chess-btn" class="btn secondary" style="background: #ef4444; color: white; padding: 6px 12px; font-size: 0.85rem; border-radius: 6px; cursor: pointer; border: none; margin-left: 10px; width: auto;">🚪 مغادرة اللعبة</button>
      </div>
      
      <div id="chess-board" style="display: grid; grid-template-columns: repeat(8, 1fr); width: 100%; max-width: min(94vw, 400px); aspect-ratio: 1/1; border: 3px solid #334155; border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.6); background: #1e293b;"></div>
      
      <div style="width: 100%; max-width: min(94vw, 400px); margin-top: 12px; display: flex; gap: 10px;">
        <button id="reset-chess-btn" class="btn secondary" style="background: #475569; flex: 1; padding: 8px; font-size: 0.85rem; border-radius: 8px;">🔄 إعادة تشغيل اللعبة</button>
      </div>
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
    
    // Solo play check: if no black player has joined yet, allow user to play both white and black
    const isSolo = !state.blackPlayer || state.whitePlayer === state.blackPlayer;
    
    let isMyTurn = false;
    if (isSolo) {
      isMyTurn = true;
    } else {
      const amIWhite = state.whitePlayer === currentUser.uid;
      const amIBlack = state.blackPlayer === currentUser.uid;
      isMyTurn = (state.turn === 'white' && amIWhite) || (state.turn === 'black' && amIBlack);
    }

    if (state.winner) {
      statusEl.innerText = `🏆 انتهت اللعبة! الفائز: ${state.winner}`;
    } else if (isSolo) {
      statusEl.innerText = `🎮 وضع اللعب الفردي (القطع الـ${state.turn === 'white' ? 'بيضاء ⚪' : 'سوداء ⚫'})`;
    } else {
      statusEl.innerText = isMyTurn ? "🎯 دورك للعب (Your Turn)" : `⏳ دور الخصم (${state.turn === 'white' ? 'الأبيض' : 'الأسود'})`;
    }

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = document.createElement("div");
        const isDark = (r + c) % 2 === 1;
        square.style.backgroundColor = isDark ? "#475569" : "#cbd5e1";
        square.style.display = "flex";
        square.style.alignItems = "center";
        square.style.justifyContent = "center";
        square.style.fontSize = "min(8.5vw, 2.1rem)";
        square.style.cursor = "pointer";
        square.style.userSelect = "none";
        square.style.aspectRatio = "1/1";

        const piece = board[r][c];
        if (piece) {
          square.innerText = pieceSymbols[piece] || piece;
          square.style.color = piece === piece.toUpperCase() ? "#ffffff" : "#0f172a";
          square.style.textShadow = piece === piece.toUpperCase() ? "0 1px 3px rgba(0,0,0,0.8)" : "0 1px 2px rgba(255,255,255,0.4)";
        }

        if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
          square.style.outline = "3px solid #38bdf8";
          square.style.outlineOffset = "-3px";
          square.style.zIndex = "10";
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
            
            if (isSolo) {
              if ((state.turn === 'white' && !isWhitePiece) || (state.turn === 'black' && isWhitePiece)) {
                alert(`الدور الحالي للقطع الـ${state.turn === 'white' ? 'بيضاء' : 'سوداء'}!`);
                return;
              }
            } else {
              if ((state.turn === 'white' && !isWhitePiece) || (state.turn === 'black' && isWhitePiece)) {
                alert("هذه قطعتك الخاصة باللون الآخر!");
                return;
              }
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

  document.getElementById("reset-chess-btn").onclick = () => {
    set(roomRef, {
      board: initialBoard,
      turn: 'white',
      whitePlayer: currentUser.uid,
      blackPlayer: null,
      winner: null
    });
  };

  document.getElementById("quit-chess-btn").onclick = () => {
    document.getElementById("quit-room-btn").click();
  };
}
```[cite: 4, 6]
