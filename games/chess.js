import { ref, update } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

export function createChessGame({ boardContainerId, statusContainerId, db, currentRoom, isHost }) {
  let chessGame = new Chess();
  let selectedSquare = null;

  function render(data, playersCount) {
    const boardEl = document.getElementById(boardContainerId);
    const statusEl = document.getElementById(statusContainerId);
    if (!boardEl || !statusEl) return;

    boardEl.innerHTML = "";

    const isAlone = playersCount < 2;
    if (chessGame.in_checkmate()) {
      statusEl.innerText = `🏁 انتهت اللعبة: مات الملك (Checkmate)!`;
      statusEl.style.borderColor = "#ef4444";
    } else if (chessGame.in_draw()) {
      statusEl.innerText = `🤝 انتهت اللعبة بالتعادل (Draw)!`;
      statusEl.style.borderColor = "#f59e0b";
    } else {
      const turnName = chessGame.turn() === 'w' ? 'الأبيض (White)' : 'الأسود (Black)';
      statusEl.innerText = `دور اللاعب: ${turnName} ${isAlone ? '(وضع فردي: تحكم بالطرفين)' : ''} ${chessGame.in_check() ? '⚠️ (تحذير كيش!)' : ''}`;
      statusEl.style.borderColor = "#334155";
    }

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
  }

  function handleSquareClick(square, playersCount) {
    const myColor = isHost ? 'w' : 'b';
    const isAlone = playersCount < 2;

    // إذا وجد خصم متصل، قيّد الحركة بحسب دورك
    if (!isAlone && chessGame.turn() !== myColor) {
      return; 
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
