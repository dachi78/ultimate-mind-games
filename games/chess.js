import { ref, update } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

export function createChessGame(containerId, db, currentRoom, isHost, currentUser) {
  let chessGame = new Chess();
  let selectedSquare = null;

  function render(data, playersCount) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    const boardWrapper = document.createElement("div");
    boardWrapper.style.cssText = "display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; padding: 15px; box-sizing: border-box;";

    // Status banner
    const statusEl = document.createElement("div");
    statusEl.id = "chess-status";
    statusEl.className = "banner";
    statusEl.style.cssText = "margin-bottom: 12px; padding: 10px 16px; text-align: center; border: 1px solid #334155; border-radius: 8px; font-weight: bold; background: #1e293b; color: #f8fafc; width: 100%; max-width: 420px; font-size: 0.95rem;";
    
    const isAlone = playersCount < 2;
    if (chessGame.in_checkmate()) {
      statusEl.innerText = `🏁 انتهت اللعبة: مات الملك (Checkmate)!`;
      statusEl.style.borderColor = "#ef4444";
    } else if (chessGame.in_draw()) {
      statusEl.innerText = `🤝 انتهت اللعبة بالتعادل (Draw)!`;
      statusEl.style.borderColor = "#f59e0b";
    } else {
      const turnName = chessGame.turn() === 'w' ? 'الأبيض (White)' : 'الأسود (Black)';
      statusEl.innerText = `دور اللاعب: ${turnName} ${isAlone ? '(وضع فردي: تتحكم بالطرفين)' : ''} ${chessGame.in_check() ? '⚠️ (تحذير كيش!)' : ''}`;
    }
    boardWrapper.appendChild(statusEl);

    // Chess Board Element
    const boardEl = document.createElement("div");
    boardEl.style.cssText = "display: grid; grid-template-columns: repeat(8, 1fr); width: 100%; max-width: min(85vw, 420px); aspect-ratio: 1/1; border: 4px solid #334155; border-radius: 8px; user-select: none; box-shadow: 0 10px 25px rgba(0,0,0,0.5);";

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
          font-size: clamp(1.5rem, 5vw, 2.3rem);
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

        squareEl.onclick = () => handleSquareClick(squareName, playersCount);
        boardEl.appendChild(squareEl);
      }
    }
    boardWrapper.appendChild(boardEl);

    // Controls container (Reset & Quit)
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText = "display: flex; gap: 10px; width: 100%; max-width: min(85vw, 420px); margin-top: 15px;";

    if (isHost) {
      const resetBtn = document.createElement("button");
      resetBtn.className = "btn secondary";
      resetBtn.innerText = "🔄 إعادة تعيين";
      resetBtn.style.flex = "1";
      resetBtn.onclick = () => {
        chessGame.reset();
        update(ref(db, `rooms/${currentRoom}`), { chessFEN: chessGame.fen() });
      };
      controlsDiv.appendChild(resetBtn);
    }

    const quitBtn = document.createElement("button");
    quitBtn.className = "btn secondary";
    quitBtn.innerText = "🚪 مغادرة اللعبة";
    quitBtn.style.cssText = "flex: 1; background: #ef4444; color: white;";
    quitBtn.onclick = () => {
      document.getElementById("fullscreen-game-overlay").classList.add("hidden");
      document.getElementById("quit-room-btn").click();
    };
    controlsDiv.appendChild(quitBtn);

    boardWrapper.appendChild(controlsDiv);
    container.appendChild(boardWrapper);
  }

  function handleSquareClick(square, playersCount) {
    const myColor = isHost ? 'w' : 'b';
    const isAlone = playersCount < 2; // إذا لم ينضم ضيف، يمكنك اللعب بالطرفين الأبيض والأسود

    if (!isAlone && chessGame.turn() !== myColor) {
      return; // ليس دورك ولديك خصم معنا في الغرفة
    }

    const pieceAtSquare = chessGame.get(square);

    if (!selectedSquare) {
      if (pieceAtSquare && (isAlone || pieceAtSquare.color === chessGame.turn())) {
        selectedSquare = square;
        render(null, playersCount);
      }
    } else {
      const move = chessGame.move({
        from: selectedSquare,
        to: square,
        promotion: 'q'
      });

      selectedSquare = null;
      if (move) {
        update(ref(db, `rooms/${currentRoom}`), {
          chessFEN: chessGame.fen()
        });
      } else {
        if (pieceAtSquare && (isAlone || pieceAtSquare.color === chessGame.turn())) {
          selectedSquare = square;
        }
        render(null, playersCount);
      }
    }
  }

  return {
    updateState(data, playersCount) {
      if (data && data.chessFEN) {
        chessGame.load(data.chessFEN);
      }
      render(data, playersCount);
    },
    reset() {
      chessGame.reset();
      selectedSquare = null;
    }
  };
}
