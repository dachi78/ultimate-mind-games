import { ref, update } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

export function createChessGame({ boardContainerId, statusContainerId, db, currentRoom, currentUser, players, myAssignedColor, onGameOver }) {
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

    const playerList = Object.entries(players || {});
    let myPlayerInfo = playerList.find(([uid]) => uid === currentUser.uid)?.[1] || { name: currentUser.displayName || "أنت", photoURL: currentUser.photoURL };
    let opponentInfo = playerList.find(([uid]) => uid !== currentUser.uid)?.[1] || myPlayerInfo;

    const toggleVoice = (e) => {
      e.target.style.opacity = e.target.style.opacity === '0.4' ? '1' : '0.4';
    };

    // Top Bar: Opponent Info
    const opponentDisplay = document.getElementById("player-opponent-display");
    if (opponentDisplay) {
      const oppColorSymbol = myAssignedColor === 'white' ? '⚫' : '⚪';
      opponentDisplay.innerHTML = `
        <img src="${opponentInfo.photoURL || 'https://via.placeholder.com/32'}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;border:2px solid #ef4444;">
        <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: bold;">${opponentInfo.name} (${oppColorSymbol})</span>
        <span class="mic-icon" title="ميكروفون" style="cursor:pointer; font-size:0.85rem; margin-left:4px;">🎙️</span>
        <span class="spk-icon" title="سماعة" style="cursor:pointer; font-size:0.85rem;">🔊</span>
      `;
      opponentDisplay.querySelector('.mic-icon').onclick = toggleVoice;
      opponentDisplay.querySelector('.spk-icon').onclick = toggleVoice;
    }

    // Bottom Bar: My Info
    const selfDisplay = document.getElementById("player-self-display");
    if (selfDisplay) {
      const myColorSymbol = myAssignedColor === 'white' ? '⚪' : '⚫';
      selfDisplay.innerHTML = `
        <img src="${myPlayerInfo.photoURL || 'https://via.placeholder.com/32'}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;border:2px solid #38bdf8;">
        <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: bold;">${myPlayerInfo.name} (${myColorSymbol})</span>
        <span class="mic-icon" title="ميكروفون" style="cursor:pointer; font-size:0.85rem; margin-left:4px;">🎙️</span>
        <span class="spk-icon" title="سماعة" style="cursor:pointer; font-size:0.85rem;">🔊</span>
      `;
      selfDisplay.querySelector('.mic-icon').onclick = toggleVoice;
      selfDisplay.querySelector('.spk-icon').onclick = toggleVoice;
    }

    const colorIndicator = document.getElementById("my-color-indicator");
    if (colorIndicator) {
      colorIndicator.innerText = `لونك: ${myAssignedColor === 'white' ? 'أبيض ⚪' : 'أسود ⚫'}`;
    }

    const isAlone = playersCount < 2;
    if (chessGame.in_checkmate()) {
      statusEl.innerText = `🏁 انتهت اللعبة: مات الملك!`;
      statusEl.style.color = "#ef4444";
      if (onGameOver) onGameOver("Checkmate!");
    } else if (chessGame.in_draw()) {
      statusEl.innerText = `🤝 تعادل (Draw)!`;
      statusEl.style.color = "#f59e0b";
      if (onGameOver) onGameOver("Draw!");
    } else {
      const turnName = chessGame.turn() === 'w' ? 'الأبيض (White)' : 'الأسود (Black)';
      statusEl.innerText = `دور: ${turnName} ${isAlone ? '(تدريب فردي)' : ''} ${chessGame.in_check() ? '⚠️ (كيش!)' : ''}`;
      statusEl.style.color = "#38bdf8";
    }

    const board = chessGame.board();
    const isFlipped = myAssignedColor === 'black';

    // If black, board is flipped so black pieces are at the bottom
    const rowIndices = isFlipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
    const colIndices = isFlipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

    for (let r of rowIndices) {
      for (let c of colIndices) {
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
          font-size: clamp(2rem, 5.5vw, 4.2rem);
          cursor: pointer;
          position: relative;
          user-select: none;
        `;

        if (isLegalTarget) {
          const indicator = document.createElement("div");
          indicator.style.cssText = `
            position: absolute;
            width: 26%;
            height: 26%;
            background: rgba(0, 0, 0, 0.4);
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
    const myTurnLetter = myAssignedColor === 'white' ? 'w' : 'b';
    const isAlone = playersCount < 2;

    if (!isAlone && chessGame.turn() !== myTurnLetter) {
      return; 
    }

    const { r, c } = getSquareCoord(square);
    const board = chessGame.board();
    const clickedPiece = board[r][c];

    if (!selectedSquare) {
      if (clickedPiece && (isAlone || clickedPiece.color === chessGame.turn())) {
        selectedSquare = square;
        legalMoves = chessGame.moves({ square: square, verbose: true });
        render(null, playersCount);
      }
    } else {
      const move = chessGame.move({
        from: selectedSquare,
        to: square,
        promotion: 'q'
      });

      if (move) {
        selectedSquare = null;
        legalMoves = [];
        update(ref(db, `rooms/${currentRoom}`), {
          chessFEN: chessGame.fen()
        });
      } else {
        if (clickedPiece && (isAlone || clickedPiece.color === chessGame.turn())) {
          selectedSquare = square;
          legalMoves = chessGame.moves({ square: square, verbose: true });
        } else {
          selectedSquare = null;
          legalMoves = [];
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
    }
  };
}
