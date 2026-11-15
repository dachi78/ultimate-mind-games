import { ref, update } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

export function createChessGame({ boardContainerId, statusContainerId, db, currentRoom, isHost, players, myColor }) {
  let chessGame = new Chess();
  let selectedSquare = null;
  let legalMoves = [];

  function getSquareCoord(squareName) {
    const file = squareName.charCodeAt(0) - 97;
    const rank = 8 - parseInt(squareName[1], 10);
    return { r: rank, c: file };
  }

  function render(data, playersCount) {
    const boardEl = document.getElementById(boardContainerId);
    const statusEl = document.getElementById(statusContainerId);
    if (!boardEl || !statusEl) return;

    boardEl.innerHTML = "";

    // Identify players for White and Black
    const playerArray = Object.values(players || {});
    let whitePlayer = playerArray.find(p => p.color === 'white') || playerArray[0];
    let blackPlayer = playerArray.find(p => p.color === 'black') || playerArray[1];

    if (!whitePlayer && playerArray.length > 0) whitePlayer = playerArray[0];
    // If playing alone, duplicate user for both sides
    if (!blackPlayer) blackPlayer = whitePlayer;

    // Render White Player Info in Top Bar
    const whiteDisplay = document.getElementById("player-white-display");
    if (whiteDisplay && whitePlayer) {
      whiteDisplay.innerHTML = `
        <img src="${whitePlayer.photoURL || 'https://via.placeholder.com/28'}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:1px solid #38bdf8;">
        <span style="max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${whitePlayer.name} (⚪)</span>
        <span title="ميكروفون نشط" style="cursor:pointer; font-size:0.8rem;">🎙️</span>
        <span title="سماعة نشطة" style="cursor:pointer; font-size:0.8rem;">🔊</span>
      `;
    }

    // Render Black Player Info in Top Bar
    const blackDisplay = document.getElementById("player-black-display");
    if (blackDisplay && blackPlayer) {
      blackDisplay.innerHTML = `
        <span title="سماعة نشطة" style="cursor:pointer; font-size:0.8rem;">🔊</span>
        <span title="ميكروفون نشط" style="cursor:pointer; font-size:0.8rem;">🎙️</span>
        <span style="max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">(⚫) ${blackPlayer.name}</span>
        <img src="${blackPlayer.photoURL || 'https://via.placeholder.com/28'}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:1px solid #38bdf8;">
      `;
    }

    const isAlone = playersCount < 2;
    if (chessGame.in_checkmate()) {
      statusEl.innerText = `🏁 مات الملك (Checkmate)!`;
      statusEl.style.color = "#ef4444";
    } else if (chessGame.in_draw()) {
      statusEl.innerText = `🤝 تعادل (Draw)!`;
      statusEl.style.color = "#f59e0b";
    } else {
      const turnName = chessGame.turn() === 'w' ? 'الأبيض (White)' : 'الأسود (Black)';
      statusEl.innerText = `دور: ${turnName} ${isAlone ? '(تدريب فردي)' : ''} ${chessGame.in_check() ? '⚠️ (كيش!)' : ''}`;
      statusEl.style.color = "#38bdf8";
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
          font-size: clamp(1.8rem, 4.5vw, 3.2rem);
          cursor: pointer;
          position: relative;
          user-select: none;
        `;

        if (isLegalTarget) {
          const indicator = document.createElement("div");
          indicator.style.cssText = `
            position: absolute;
            width: 24%;
            height: 24%;
            background: rgba(0, 0, 0, 0.35);
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
    const myAssignedColor = myColor || (isHost ? 'w' : 'b');
    const isAlone = playersCount < 2;

    if (!isAlone && chessGame.turn() !== myAssignedColor[0]) {
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
    }
  };
}
