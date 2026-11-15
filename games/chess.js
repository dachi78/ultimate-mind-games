import { ref, update } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

export function createChessGame({ boardContainerId, statusContainerId, db, currentRoom, isHost }) {
  let chessGame = new Chess();
  let selectedSquare = null;
  let legalMoves = [];

  function getSquareCoord(squareName) {
    const file = squareName.charCodeAt(0) - 97; // 'a' -> 0
    const rank = 8 - parseInt(squareName[1], 10); // '8' -> 0
    return { r: rank, c: file };
  }

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

        const isSelected = selectedSquare === squareName;
        const isLegalTarget = legalMoves.some(m => m.to === squareName);

        squareEl.style.cssText = `
          background: ${isSelected ? '#769656' : (isDark ? '#b58863' : '#f0d9b5')};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(2rem, 5.5vw, 3.8rem);
          cursor: pointer;
          position: relative;
          user-select: none;
        `;

        // Legal move indicator dot
        if (isLegalTarget) {
          const indicator = document.createElement("div");
          indicator.style.cssText = `
            position: absolute;
            width: 26%;
            height: 26%;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 50%;
            pointer-events: none;
          `;
          squareEl.appendChild(indicator);
        }

        const piece = board[r][c];
        if (piece) {
          const symbols = {
            p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
            P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
          };
          const pieceSpan = document.createElement("span");
          pieceSpan.innerText = symbols[piece.color === 'w' ? piece.type.toUpperCase() : piece.type];
          pieceSpan.style.color = piece.color === 'w' ? '#ffffff' : '#0f172a';
          pieceSpan.style.textShadow = piece.color === 'w' ? '0 2px 4px rgba(0,0,0,0.8)' : '0 1px 3px rgba(255,255,255,0.4)';
          squareEl.appendChild(pieceSpan);
        }

        squareEl.onclick = () => handleSquareClick(squareName, playersCount);
        boardEl.appendChild(squareEl);
      }
    }
  }

  function handleSquareClick(square, playersCount) {
    const myColor = isHost ? 'w' : 'b';
    const isAlone = playersCount < 2;

    if (!isAlone && chessGame.turn() !== myColor) {
      return; 
    }

    const { r, c } = getSquareCoord(square);
    const board = chessGame.board();
    const pieceAtSquare = board[r][c];

    if (!selectedSquare) {
      if (pieceAtSquare && (isAlone || pieceAtSquare.color === chessGame.turn())) {
        selectedSquare = square;
        legalMoves = chessGame.moves({ square: square, verbose: true });
        render(null, playersCount);
      }
    } else {
      // If clicking own piece, change selection
      if (pieceAtSquare && (isAlone || pieceAtSquare.color === chessGame.turn())) {
        selectedSquare = square;
        legalMoves = chessGame.moves({ square: square, verbose: true });
        render(null, playersCount);
        return;
      }

      const move = chessGame.move({
        from: selectedSquare,
        to: square,
        promotion: 'q'
      });

      selectedSquare = null;
      legalMoves = [];

      if (move) {
        update(ref(db, `rooms/${currentRoom}`), {
          chessFEN: chessGame.fen()
        });
      } else {
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
      legalMoves = [];
    }
  };
}
