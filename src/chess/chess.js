/* ============================================
   Chess Learning Game — Game Logic
   Target: 5-year-old on iPad, offline, touch
   ============================================ */

(function () {
  'use strict';

  // ---- Unicode chess pieces ----
  const PIECE_CHARS = {
    wK: '♚', wQ: '♛', wR: '♜', wB: '♝', wN: '♞', wP: '♟',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
  };

  const PIECE_NAMES = {
    K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn'
  };

  // ---- Starting position ----
  const INITIAL_BOARD = [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR']
  ];

  const FILES = ['a','b','c','d','e','f','g','h'];
  const RANKS = ['8','7','6','5','4','3','2','1'];

  // ---- Sound (Web Audio API, no files needed) ----
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playTone(freq, duration, type) {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) { /* audio not supported — silent is fine */ }
  }

  function soundMove() { playTone(440, 0.1, 'sine'); }
  function soundCapture() { playTone(300, 0.15, 'triangle'); playTone(200, 0.2, 'triangle'); }
  function soundInvalid() { playTone(150, 0.2, 'square'); }
  function soundSuccess() {
    setTimeout(function() { playTone(523, 0.12, 'sine'); }, 0);
    setTimeout(function() { playTone(659, 0.12, 'sine'); }, 120);
    setTimeout(function() { playTone(784, 0.2, 'sine'); }, 240);
  }

  // ---- Board State Helpers ----

  function cloneBoard(board) {
    return board.map(function(row) { return row.slice(); });
  }

  function pieceColor(piece) {
    return piece ? piece[0] : null;
  }

  function pieceType(piece) {
    return piece ? piece[1] : null;
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  // ---- Move Generation ----

  function getValidMoves(board, row, col) {
    var piece = board[row][col];
    if (!piece) return [];

    var color = pieceColor(piece);
    var type = pieceType(piece);
    var moves = [];

    function addIfValid(r, c) {
      if (!inBounds(r, c)) return false;
      var target = board[r][c];
      if (target && pieceColor(target) === color) return false;
      moves.push([r, c]);
      return !target; // can continue sliding if empty
    }

    function slide(dr, dc) {
      for (var i = 1; i < 8; i++) {
        if (!addIfValid(row + dr * i, col + dc * i)) break;
      }
    }

    switch (type) {
      case 'P': {
        var dir = color === 'w' ? -1 : 1;
        var startRow = color === 'w' ? 6 : 1;
        // Forward
        if (inBounds(row + dir, col) && !board[row + dir][col]) {
          moves.push([row + dir, col]);
          // Double move from start
          if (row === startRow && !board[row + 2 * dir][col]) {
            moves.push([row + 2 * dir, col]);
          }
        }
        // Captures
        [-1, 1].forEach(function(dc) {
          var nr = row + dir, nc = col + dc;
          if (inBounds(nr, nc) && board[nr][nc] && pieceColor(board[nr][nc]) !== color) {
            moves.push([nr, nc]);
          }
        });
        break;
      }
      case 'R':
        slide(0, 1); slide(0, -1); slide(1, 0); slide(-1, 0);
        break;
      case 'B':
        slide(1, 1); slide(1, -1); slide(-1, 1); slide(-1, -1);
        break;
      case 'Q':
        slide(0, 1); slide(0, -1); slide(1, 0); slide(-1, 0);
        slide(1, 1); slide(1, -1); slide(-1, 1); slide(-1, -1);
        break;
      case 'N':
        [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(function(d) {
          addIfValid(row + d[0], col + d[1]);
        });
        break;
      case 'K':
        [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(function(d) {
          addIfValid(row + d[0], col + d[1]);
        });
        break;
    }

    return moves;
  }

  // ---- DOM Helpers ----

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function(k) {
        if (k === 'className') e.className = attrs[k];
        else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else e.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function(c) {
        if (typeof c === 'string') e.textContent = c;
        else if (c) e.appendChild(c);
      });
    }
    return e;
  }

  // ---- Screen Navigation ----

  function showScreen(name) {
    $$('.screen').forEach(function(s) { s.classList.remove('active'); });
    var target = $('#' + name + '-screen');
    if (target) target.classList.add('active');
  }

  // ---- Board Rendering ----

  function createBoardDOM(container, board, options) {
    options = options || {};
    container.innerHTML = '';

    var flipped = options.flipped || false;
    var wrapper = el('div', { className: 'board-wrapper' + (flipped ? ' board-flipped' : '') });

    // Rank labels (left side)
    var rankLabels = el('div', { className: 'rank-labels' });
    var ranksOrder = flipped ? RANKS.slice().reverse() : RANKS;
    ranksOrder.forEach(function(r) {
      rankLabels.appendChild(el('div', { className: 'board-label' }, r));
    });
    wrapper.appendChild(rankLabels);

    // Board grid
    var boardEl = el('div', { className: 'chess-board' });
    boardEl.setAttribute('data-board-id', options.id || 'board');

    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var isLight = (r + c) % 2 === 0;
        var sq = el('div', {
          className: 'chess-square ' + (isLight ? 'light' : 'dark'),
          'data-row': String(r),
          'data-col': String(c)
        });

        var piece = board[r][c];
        if (piece) {
          var pieceEl = el('div', {
            className: 'chess-piece ' + (pieceColor(piece) === 'w' ? 'piece-white' : 'piece-black'),
            'data-piece': piece,
            'data-row': String(r),
            'data-col': String(c)
          }, PIECE_CHARS[piece]);
          sq.appendChild(pieceEl);
        }

        boardEl.appendChild(sq);
      }
    }

    wrapper.appendChild(boardEl);

    // File labels (bottom)
    var fileLabels = el('div', { className: 'file-labels' });
    var filesOrder = flipped ? FILES.slice().reverse() : FILES;
    filesOrder.forEach(function(f) {
      fileLabels.appendChild(el('div', { className: 'board-label' }, f));
    });
    wrapper.appendChild(fileLabels);

    container.appendChild(wrapper);

    return boardEl;
  }

  function getSquare(boardEl, r, c) {
    return boardEl.querySelector('[data-row="' + r + '"][data-col="' + c + '"].chess-square');
  }

  function clearHighlights(boardEl) {
    boardEl.querySelectorAll('.selected, .valid-move, .valid-capture, .highlight').forEach(function(sq) {
      sq.classList.remove('selected', 'valid-move', 'valid-capture', 'highlight');
    });
  }

  function highlightMoves(boardEl, board, moves, row, col) {
    clearHighlights(boardEl);
    var srcSq = getSquare(boardEl, row, col);
    if (srcSq) srcSq.classList.add('selected');

    moves.forEach(function(m) {
      var sq = getSquare(boardEl, m[0], m[1]);
      if (!sq) return;
      if (board[m[0]][m[1]]) {
        sq.classList.add('valid-capture');
      } else {
        sq.classList.add('valid-move');
      }
    });
  }

  function updateBoardDOM(boardEl, board) {
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var sq = getSquare(boardEl, r, c);
        if (!sq) continue;
        var existingPiece = sq.querySelector('.chess-piece');
        var piece = board[r][c];

        if (!piece && existingPiece) {
          sq.removeChild(existingPiece);
        } else if (piece && !existingPiece) {
          var pe = el('div', {
            className: 'chess-piece ' + (pieceColor(piece) === 'w' ? 'piece-white' : 'piece-black'),
            'data-piece': piece,
            'data-row': String(r),
            'data-col': String(c)
          }, PIECE_CHARS[piece]);
          sq.appendChild(pe);
        } else if (piece && existingPiece) {
          existingPiece.textContent = PIECE_CHARS[piece];
          existingPiece.className = 'chess-piece ' + (pieceColor(piece) === 'w' ? 'piece-white' : 'piece-black');
          existingPiece.setAttribute('data-piece', piece);
          existingPiece.setAttribute('data-row', String(r));
          existingPiece.setAttribute('data-col', String(c));
        }
      }
    }
  }

  // ============================
  //   DRAG & DROP (Touch + Pointer)
  // ============================

  function setupDragDrop(boardEl, state) {
    var dragPiece = null;
    var dragFrom = null;
    var floatingEl = null;

    function getPos(e) {
      var touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX, y: touch.clientY };
    }

    function squareFromPoint(x, y) {
      // Temporarily hide floating piece for elementFromPoint
      if (floatingEl) floatingEl.style.display = 'none';
      var elem = document.elementFromPoint(x, y);
      if (floatingEl) floatingEl.style.display = '';

      if (!elem) return null;
      var sq = elem.closest('.chess-square');
      if (!sq || !boardEl.contains(sq)) return null;
      return {
        row: parseInt(sq.getAttribute('data-row'), 10),
        col: parseInt(sq.getAttribute('data-col'), 10)
      };
    }

    function startDrag(e) {
      var pos = getPos(e);
      var target = squareFromPoint(pos.x, pos.y);
      if (!target) return;

      var piece = state.board[target.row][target.col];
      if (!piece) {
        // Tapped empty square — if we had a selection, try to move there
        if (state.selected) {
          var valid = state.validMoves.some(function(m) {
            return m[0] === target.row && m[1] === target.col;
          });
          if (valid) {
            doMove(state.selected.row, state.selected.col, target.row, target.col);
          } else {
            clearHighlights(boardEl);
            state.selected = null;
            state.validMoves = [];
          }
        }
        return;
      }

      // Check if move restriction applies (e.g. puzzle mode)
      if (state.canDrag && !state.canDrag(piece, target.row, target.col)) return;

      e.preventDefault();

      dragPiece = piece;
      dragFrom = target;

      var moves = getValidMoves(state.board, target.row, target.col);
      if (state.filterMoves) moves = state.filterMoves(moves);
      state.selected = target;
      state.validMoves = moves;
      highlightMoves(boardEl, state.board, moves, target.row, target.col);

      // Create floating piece
      floatingEl = el('div', { className: 'floating-piece ' + (pieceColor(piece) === 'w' ? 'piece-white' : 'piece-black') }, PIECE_CHARS[piece]);
      document.body.appendChild(floatingEl);
      floatingEl.style.left = pos.x + 'px';
      floatingEl.style.top = pos.y + 'px';

      // Hide piece on board
      var sq = getSquare(boardEl, target.row, target.col);
      var pe = sq ? sq.querySelector('.chess-piece') : null;
      if (pe) pe.style.visibility = 'hidden';
    }

    function moveDrag(e) {
      if (!floatingEl) return;
      e.preventDefault();
      var pos = getPos(e);
      floatingEl.style.left = pos.x + 'px';
      floatingEl.style.top = pos.y + 'px';
    }

    function endDrag(e) {
      if (!floatingEl) return;

      var pos;
      if (e.changedTouches) {
        pos = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      } else {
        pos = { x: e.clientX, y: e.clientY };
      }

      var target = squareFromPoint(pos.x, pos.y);

      // Remove floating piece
      if (floatingEl.parentNode) floatingEl.parentNode.removeChild(floatingEl);
      floatingEl = null;

      // Show piece back on origin
      var origSq = getSquare(boardEl, dragFrom.row, dragFrom.col);
      var origPe = origSq ? origSq.querySelector('.chess-piece') : null;
      if (origPe) origPe.style.visibility = '';

      if (!target || (target.row === dragFrom.row && target.col === dragFrom.col)) {
        // Dropped on same square — keep selection visible (tap to select)
        dragPiece = null;
        dragFrom = null;
        return;
      }

      var valid = state.validMoves.some(function(m) {
        return m[0] === target.row && m[1] === target.col;
      });

      if (valid) {
        doMove(dragFrom.row, dragFrom.col, target.row, target.col);
      } else {
        // Invalid — wobble
        if (origPe) {
          origPe.classList.add('wobble');
          setTimeout(function() { origPe.classList.remove('wobble'); }, 400);
        }
        soundInvalid();
      }

      dragPiece = null;
      dragFrom = null;
    }

    function doMove(fromR, fromC, toR, toC) {
      var captured = state.board[toR][toC];
      state.board[toR][toC] = state.board[fromR][fromC];
      state.board[fromR][fromC] = null;

      if (captured) {
        soundCapture();
      } else {
        soundMove();
      }

      updateBoardDOM(boardEl, state.board);
      clearHighlights(boardEl);
      state.selected = null;
      state.validMoves = [];

      if (state.onMove) {
        state.onMove(fromR, fromC, toR, toC, captured);
      }
    }

    boardEl.addEventListener('pointerdown', startDrag, { passive: false });
    boardEl.addEventListener('pointermove', moveDrag, { passive: false });
    boardEl.addEventListener('pointerup', endDrag, { passive: false });
    boardEl.addEventListener('pointercancel', endDrag, { passive: false });

    // Also handle touch events for iOS Safari
    boardEl.addEventListener('touchstart', startDrag, { passive: false });
    boardEl.addEventListener('touchmove', moveDrag, { passive: false });
    boardEl.addEventListener('touchend', endDrag, { passive: false });
    boardEl.addEventListener('touchcancel', endDrag, { passive: false });

    return {
      destroy: function() {
        boardEl.removeEventListener('pointerdown', startDrag);
        boardEl.removeEventListener('pointermove', moveDrag);
        boardEl.removeEventListener('pointerup', endDrag);
        boardEl.removeEventListener('pointercancel', endDrag);
        boardEl.removeEventListener('touchstart', startDrag);
        boardEl.removeEventListener('touchmove', moveDrag);
        boardEl.removeEventListener('touchend', endDrag);
        boardEl.removeEventListener('touchcancel', endDrag);
      }
    };
  }

  // ============================
  //   CELEBRATION (shared)
  // ============================

  function celebrateIn(containerId, message) {
    var container = $(containerId);
    if (!container) return;
    container.classList.remove('hidden');
    container.innerHTML = '';

    var colors = ['#e94560', '#4ecdc4', '#ffe66d', '#ff6b6b', '#48dbfb', '#ff9ff3'];
    for (var i = 0; i < 40; i++) {
      var piece = el('div', { className: 'confetti-piece' });
      piece.style.background = colors[i % colors.length];
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.top = '-5%';
      piece.style.animationDelay = (Math.random() * 0.5) + 's';
      piece.style.animationDuration = (1 + Math.random()) + 's';
      container.appendChild(piece);
    }

    var text = el('div', { className: 'celebration-text' }, message || 'Great Job! 🎉');
    container.appendChild(text);

    soundSuccess();

    setTimeout(function() {
      container.classList.add('hidden');
      container.innerHTML = '';
    }, 2500);
  }

  function celebrate() {
    celebrateIn('#puzzle-celebration');
  }

  // ============================
  //   MODE: MEET THE PIECES
  // ============================

  var meetData = [
    {
      type: 'K', color: 'w',
      name: 'The King',
      emoji: '♔',
      desc: 'The King is the most important piece! He can move one square in any direction. Keep him safe!',
      setup: function() {
        var b = emptyBoard();
        b[4][4] = 'wK';
        return b;
      }
    },
    {
      type: 'Q', color: 'w',
      name: 'The Queen',
      emoji: '♕',
      desc: 'The Queen is the most powerful piece! She can move anywhere — up, down, sideways, and diagonally!',
      setup: function() {
        var b = emptyBoard();
        b[4][3] = 'wQ';
        return b;
      }
    },
    {
      type: 'R', color: 'w',
      name: 'The Rook',
      emoji: '♖',
      desc: 'The Rook looks like a castle tower! It moves in straight lines — up, down, left, or right.',
      setup: function() {
        var b = emptyBoard();
        b[4][4] = 'wR';
        return b;
      }
    },
    {
      type: 'B', color: 'w',
      name: 'The Bishop',
      emoji: '♗',
      desc: 'The Bishop moves diagonally — like a zigzag! It always stays on the same colour square.',
      setup: function() {
        var b = emptyBoard();
        b[4][4] = 'wB';
        return b;
      }
    },
    {
      type: 'N', color: 'w',
      name: 'The Knight',
      emoji: '♘',
      desc: 'The Knight is the horse! It jumps in an L-shape — 2 squares one way, then 1 square to the side. It can jump over other pieces!',
      setup: function() {
        var b = emptyBoard();
        b[4][4] = 'wN';
        return b;
      }
    },
    {
      type: 'P', color: 'w',
      name: 'The Pawn',
      emoji: '♙',
      desc: 'The Pawn is small but brave! It moves forward one square (or two squares on its first move). It captures diagonally.',
      setup: function() {
        var b = emptyBoard();
        b[6][4] = 'wP';
        b[5][3] = 'bP'; // something to capture
        return b;
      }
    }
  ];

  function emptyBoard() {
    return Array.from({ length: 8 }, function() {
      return Array.from({ length: 8 }, function() { return null; });
    });
  }

  var meetIndex = 0;
  var meetDragHandler = null;

  function renderMeet() {
    var data = meetData[meetIndex];
    var content = $('#meet-content');
    content.innerHTML = '';

    // Piece display
    content.appendChild(el('div', { className: 'meet-piece-display' }, data.emoji));
    content.appendChild(el('div', { className: 'meet-piece-name' }, data.name));
    content.appendChild(el('div', { className: 'meet-piece-desc' }, data.desc));

    // Mini board showing moves
    var miniContainer = el('div', { className: 'meet-mini-board' });
    content.appendChild(miniContainer);
    content.appendChild(el('div', { className: 'hint-text' }, 'Try moving it!'));

    var board = data.setup();
    var boardEl = createBoardDOM(miniContainer, board, { id: 'meet' });

    // Highlight valid moves
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        if (board[r][c] && pieceColor(board[r][c]) === 'w') {
          var moves = getValidMoves(board, r, c);
          highlightMoves(boardEl, board, moves, r, c);
        }
      }
    }

    // Allow dragging to try the piece
    if (meetDragHandler) meetDragHandler.destroy();
    var state = {
      board: board,
      selected: null,
      validMoves: [],
      onMove: function() {
        // After move, re-setup
        setTimeout(function() {
          var freshBoard = data.setup();
          state.board = freshBoard;
          updateBoardDOM(boardEl, freshBoard);
          for (var r2 = 0; r2 < 8; r2++) {
            for (var c2 = 0; c2 < 8; c2++) {
              if (freshBoard[r2][c2] && pieceColor(freshBoard[r2][c2]) === 'w') {
                var moves2 = getValidMoves(freshBoard, r2, c2);
                highlightMoves(boardEl, freshBoard, moves2, r2, c2);
              }
            }
          }
        }, 600);
      }
    };
    meetDragHandler = setupDragDrop(boardEl, state);

    // Counter
    $('#meet-counter').textContent = (meetIndex + 1) + ' / ' + meetData.length;
    $('#meet-prev').disabled = meetIndex === 0;
    $('#meet-next').disabled = meetIndex === meetData.length - 1;
  }

  // ============================
  //   MODE: FREE PLAY
  // ============================

  var freeplayState = null;
  var freeplayDragHandler = null;

  function initFreeplay() {
    var container = $('#freeplay-board-container');
    var board = cloneBoard(INITIAL_BOARD);

    var boardEl = createBoardDOM(container, board, { id: 'freeplay' });

    freeplayState = {
      board: board,
      selected: null,
      validMoves: [],
      onMove: function(fromR, fromC, toR, toC, captured) {
        var movedPiece = board[toR][toC];
        if (movedPiece) {
          var name = PIECE_NAMES[pieceType(movedPiece)];
          var file = FILES[toC];
          var rank = RANKS[toR];
          $('#freeplay-hint').textContent = name + ' to ' + file + rank + (captured ? ' — Captured!' : '');
        }
      }
    };

    if (freeplayDragHandler) freeplayDragHandler.destroy();
    freeplayDragHandler = setupDragDrop(boardEl, freeplayState);
  }

  function resetFreeplay() {
    initFreeplay();
    $('#freeplay-hint').textContent = 'Tap a piece to see where it can move, then drag it!';
  }

  // ============================
  //   MODE: PUZZLES
  // ============================

  var puzzles = [
    // Knight puzzles
    {
      instruction: 'Move the Knight to the star! ⭐',
      piece: 'wN', piecePos: [4, 4], target: [2, 5],
      hint: 'The Knight jumps in an L shape!'
    },
    {
      instruction: 'Jump the Knight to the star! ⭐',
      piece: 'wN', piecePos: [7, 1], target: [5, 2],
      hint: 'Remember: 2 squares then 1 to the side!'
    },
    // Rook puzzles
    {
      instruction: 'Slide the Rook to the star! ⭐',
      piece: 'wR', piecePos: [4, 0], target: [4, 7],
      hint: 'The Rook goes in straight lines!'
    },
    {
      instruction: 'Move the Rook to the star! ⭐',
      piece: 'wR', piecePos: [7, 4], target: [0, 4],
      hint: 'Up, down, left, or right!'
    },
    // Bishop puzzles
    {
      instruction: 'Slide the Bishop to the star! ⭐',
      piece: 'wB', piecePos: [7, 2], target: [5, 0],
      hint: 'The Bishop moves diagonally!'
    },
    {
      instruction: 'Move the Bishop to the star! ⭐',
      piece: 'wB', piecePos: [4, 4], target: [1, 7],
      hint: 'Diagonal — like a zigzag!'
    },
    // Queen puzzles
    {
      instruction: 'Move the Queen to the star! ⭐',
      piece: 'wQ', piecePos: [7, 3], target: [0, 3],
      hint: 'The Queen can go anywhere in a straight line!'
    },
    {
      instruction: 'Slide the Queen to the star! ⭐',
      piece: 'wQ', piecePos: [4, 4], target: [1, 1],
      hint: 'Straight lines or diagonals!'
    },
    // Pawn puzzles
    {
      instruction: 'Push the Pawn forward to the star! ⭐',
      piece: 'wP', piecePos: [6, 4], target: [4, 4],
      hint: 'From the start, a Pawn can move 2 squares forward!'
    },
    // King puzzles
    {
      instruction: 'Move the King to the star! ⭐',
      piece: 'wK', piecePos: [4, 4], target: [3, 4],
      hint: 'The King moves just one square!'
    },
    // Capture puzzles
    {
      instruction: 'Capture the black piece with the Rook! 💥',
      piece: 'wR', piecePos: [4, 0], target: [4, 5],
      enemy: { piece: 'bN', pos: [4, 5] },
      hint: 'Slide the Rook to grab the Knight!'
    },
    {
      instruction: 'Use the Knight to capture! 💥',
      piece: 'wN', piecePos: [4, 4], target: [2, 3],
      enemy: { piece: 'bP', pos: [2, 3] },
      hint: 'Jump in an L to capture!'
    },
    {
      instruction: 'Capture with the Pawn! 💥',
      piece: 'wP', piecePos: [3, 4], target: [2, 5],
      enemy: { piece: 'bB', pos: [2, 5] },
      hint: 'Pawns capture diagonally!'
    }
  ];

  var puzzleIndex = 0;
  var puzzleDragHandler = null;

  function initPuzzle() {
    var p = puzzles[puzzleIndex];
    var container = $('#puzzle-board-container');
    var board = emptyBoard();

    board[p.piecePos[0]][p.piecePos[1]] = p.piece;
    if (p.enemy) {
      board[p.enemy.pos[0]][p.enemy.pos[1]] = p.enemy.piece;
    }

    var boardEl = createBoardDOM(container, board, { id: 'puzzle' });

    // Mark target square
    var targetSq = getSquare(boardEl, p.target[0], p.target[1]);
    if (targetSq && !p.enemy) {
      targetSq.classList.add('target-star');
    }

    // Show valid moves immediately
    var moves = getValidMoves(board, p.piecePos[0], p.piecePos[1]);
    highlightMoves(boardEl, board, moves, p.piecePos[0], p.piecePos[1]);

    $('#puzzle-instruction').textContent = p.instruction;
    $('#puzzle-counter').textContent = (puzzleIndex + 1) + ' / ' + puzzles.length;
    $('#puzzle-prev').disabled = puzzleIndex === 0;
    $('#puzzle-next').disabled = puzzleIndex === puzzles.length - 1;

    if (puzzleDragHandler) puzzleDragHandler.destroy();

    var state = {
      board: board,
      selected: null,
      validMoves: [],
      canDrag: function(piece) {
        return piece === p.piece;
      },
      filterMoves: function(moves) {
        // Only allow moves to the target in puzzle mode
        return moves.filter(function(m) {
          return m[0] === p.target[0] && m[1] === p.target[1];
        });
      },
      onMove: function(fromR, fromC, toR, toC) {
        if (toR === p.target[0] && toC === p.target[1]) {
          // Solved!
          celebrate();
          // Auto-advance after celebration
          if (puzzleIndex < puzzles.length - 1) {
            setTimeout(function() {
              puzzleIndex++;
              initPuzzle();
            }, 2800);
          }
        }
      }
    };

    puzzleDragHandler = setupDragDrop(boardEl, state);
  }

  // ============================
  //   MODE: PLAY COMPUTER
  // ============================

  // Track which colour the human plays — alternates each game
  var computerGameCount = 0;
  var computerState = null;
  var computerDragHandler = null;
  var computerBoardEl = null;
  var gameOver = false;

  function humanColor() {
    return computerGameCount % 2 === 0 ? 'w' : 'b';
  }

  function computerColor() {
    return humanColor() === 'w' ? 'b' : 'w';
  }

  // ---- Child-level AI ----
  // Mostly random with slight preferences:
  // - Small chance to see a capture and take it
  // - Occasional completely random move (simulates a 5-year-old opponent)
  // - Sometimes ignores good moves on purpose

  function getAllMoves(board, color) {
    var allMoves = [];
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var piece = board[r][c];
        if (piece && pieceColor(piece) === color) {
          var moves = getValidMoves(board, r, c);
          moves.forEach(function(m) {
            allMoves.push({ fromR: r, fromC: c, toR: m[0], toC: m[1], piece: piece });
          });
        }
      }
    }
    return allMoves;
  }

  function computerChooseMove(board) {
    var color = computerColor();
    var allMoves = getAllMoves(board, color);
    if (allMoves.length === 0) return null;

    // Separate captures from non-captures
    var captures = allMoves.filter(function(m) { return board[m.toR][m.toC] !== null; });
    var nonCaptures = allMoves.filter(function(m) { return board[m.toR][m.toC] === null; });

    // Child-level AI behaviour:
    // - 30% chance to pick a capture if one is available
    // - 10% chance to move a pawn forward (kids love pushing pawns)
    // - Otherwise completely random
    var roll = Math.random();

    if (captures.length > 0 && roll < 0.3) {
      // Take a random capture (doesn't evaluate which is best)
      return captures[Math.floor(Math.random() * captures.length)];
    }

    // 10% chance to prefer a pawn move
    if (roll < 0.4) {
      var pawnMoves = nonCaptures.filter(function(m) { return pieceType(m.piece) === 'P'; });
      if (pawnMoves.length > 0) {
        return pawnMoves[Math.floor(Math.random() * pawnMoves.length)];
      }
    }

    // Otherwise pick any random legal move
    return allMoves[Math.floor(Math.random() * allMoves.length)];
  }

  // ---- Check if a King was captured ----

  function findKing(board, color) {
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        if (board[r][c] === color + 'K') return true;
      }
    }
    return false;
  }

  // ---- Render turn indicator & captured pieces ----

  function updateTurnIndicator(turn) {
    var ind = $('#turn-indicator');
    if (gameOver) return;

    var isHumanTurn = turn === humanColor();
    ind.className = 'turn-indicator ' + (isHumanTurn ? 'your-turn' : 'computer-turn');

    var humanName = humanColor() === 'w' ? 'White' : 'Black';
    var cpuName = computerColor() === 'w' ? 'White' : 'Black';

    if (isHumanTurn) {
      ind.textContent = 'Your turn! (You are ' + humanName + ')';
    } else {
      ind.textContent = cpuName + ' is thinking...';
    }
  }

  function renderCaptured(capturedByHuman, capturedByComputer) {
    var humanRow = $('#captured-by-human');
    var cpuRow = $('#captured-by-computer');
    humanRow.innerHTML = '<span class="captured-label">You took:</span>';
    cpuRow.innerHTML = '<span class="captured-label">Computer took:</span>';

    capturedByHuman.forEach(function(p) {
      humanRow.appendChild(el('span', {}, PIECE_CHARS[p]));
    });
    capturedByComputer.forEach(function(p) {
      cpuRow.appendChild(el('span', {}, PIECE_CHARS[p]));
    });
  }

  function showLastMove(boardEl, fromR, fromC, toR, toC) {
    boardEl.querySelectorAll('.last-move').forEach(function(sq) {
      sq.classList.remove('last-move');
    });
    var from = getSquare(boardEl, fromR, fromC);
    var to = getSquare(boardEl, toR, toC);
    if (from) from.classList.add('last-move');
    if (to) to.classList.add('last-move');
  }

  function endGame(winner) {
    gameOver = true;
    var ind = $('#turn-indicator');
    ind.className = 'turn-indicator game-over';

    if (winner === 'human') {
      ind.textContent = 'You won! Amazing! 🎉';
      celebrateIn('#computer-celebration', 'You Won! 🏆');
    } else if (winner === 'computer') {
      ind.textContent = 'Computer wins! Good try! 👏';
    } else {
      ind.textContent = 'No more moves — it\'s a draw! 🤝';
    }

    $('#computer-hint').textContent = 'Tap "↺ New Game" to play again!';
  }

  // ---- Computer makes its move ----

  function doComputerMove() {
    if (gameOver) return;

    var board = computerState.board;
    var move = computerChooseMove(board);

    if (!move) {
      endGame('draw');
      return;
    }

    computerBoardEl.classList.add('thinking');

    // Phase 1: Highlight the piece the computer is about to move
    var thinkDelay = 800 + Math.floor(Math.random() * 600);

    setTimeout(function() {
      if (gameOver) return;

      clearHighlights(computerBoardEl);
      var srcSq = getSquare(computerBoardEl, move.fromR, move.fromC);
      if (srcSq) srcSq.classList.add('selected');

      // Phase 2: Highlight the destination square
      setTimeout(function() {
        if (gameOver) return;

        var destSq = getSquare(computerBoardEl, move.toR, move.toC);
        if (destSq) destSq.classList.add('highlight');

        // Phase 3: Execute the move
        setTimeout(function() {
          if (gameOver) return;

          var captured = board[move.toR][move.toC];
          board[move.toR][move.toC] = board[move.fromR][move.fromC];
          board[move.fromR][move.fromC] = null;

          // Auto-promote pawns to Queen
          if (pieceType(board[move.toR][move.toC]) === 'P') {
            var promoRow = computerColor() === 'w' ? 0 : 7;
            if (move.toR === promoRow) {
              board[move.toR][move.toC] = computerColor() + 'Q';
            }
          }

          if (captured) {
            computerState.capturedByComputer.push(captured);
            soundCapture();
          } else {
            soundMove();
          }

          updateBoardDOM(computerBoardEl, board);
          clearHighlights(computerBoardEl);
          showLastMove(computerBoardEl, move.fromR, move.fromC, move.toR, move.toC);
          renderCaptured(computerState.capturedByHuman, computerState.capturedByComputer);
          computerBoardEl.classList.remove('thinking');

          // Check if human King is gone
          if (!findKing(board, humanColor())) {
            endGame('computer');
            return;
          }

          // Check if human has any moves
          var humanMoves = getAllMoves(board, humanColor());
          if (humanMoves.length === 0) {
            endGame('draw');
            return;
          }

          computerState.turn = humanColor();
          updateTurnIndicator(computerState.turn);
          $('#computer-hint').textContent = 'Your turn! Tap a piece to move.';
        }, 600);
      }, 700);
    }, thinkDelay);
  }

  // ---- Init a computer game ----

  function initComputer() {
    gameOver = false;
    var container = $('#computer-board-container');
    var board = cloneBoard(INITIAL_BOARD);

    var hColor = humanColor();
    var cColor = computerColor();
    var hName = hColor === 'w' ? 'White' : 'Black';

    computerBoardEl = createBoardDOM(container, board, { id: 'computer', flipped: hColor === 'b' });

    computerState = {
      board: board,
      selected: null,
      validMoves: [],
      turn: 'w', // white always starts
      capturedByHuman: [],
      capturedByComputer: [],
      canDrag: function(piece) {
        if (gameOver) return false;
        if (computerState.turn !== hColor) return false;
        return pieceColor(piece) === hColor;
      },
      onMove: function(fromR, fromC, toR, toC, captured) {
        // Auto-promote human pawns
        var movedPiece = board[toR][toC];
        if (pieceType(movedPiece) === 'P') {
          var promoRow = hColor === 'w' ? 0 : 7;
          if (toR === promoRow) {
            board[toR][toC] = hColor + 'Q';
            updateBoardDOM(computerBoardEl, board);
          }
        }

        if (captured) {
          computerState.capturedByHuman.push(captured);
        }
        renderCaptured(computerState.capturedByHuman, computerState.capturedByComputer);
        showLastMove(computerBoardEl, fromR, fromC, toR, toC);

        var pName = PIECE_NAMES[pieceType(board[toR][toC])];
        var file = FILES[toC];
        var rank = RANKS[toR];
        $('#computer-hint').textContent = pName + ' to ' + file + rank + (captured ? ' — Captured!' : '');

        // Check if computer King is gone
        if (!findKing(board, cColor)) {
          endGame('human');
          return;
        }

        // Switch to computer's turn
        computerState.turn = cColor;
        updateTurnIndicator(cColor);

        // Computer plays
        doComputerMove();
      }
    };

    if (computerDragHandler) computerDragHandler.destroy();
    computerDragHandler = setupDragDrop(computerBoardEl, computerState);

    renderCaptured([], []);
    updateTurnIndicator('w');

    // If computer is white, it goes first
    if (cColor === 'w') {
      $('#computer-hint').textContent = 'Computer goes first...';
      doComputerMove();
    } else {
      $('#computer-hint').textContent = 'Your turn! Tap a piece to move.';
    }
  }

  function newComputerGame() {
    computerGameCount++;
    initComputer();
  }

  // ============================
  //   INIT
  // ============================

  function init() {
    // Mode selection
    $$('.mode-card').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var mode = btn.getAttribute('data-mode');
        showScreen(mode);

        if (mode === 'meet') { meetIndex = 0; renderMeet(); }
        if (mode === 'freeplay') { initFreeplay(); }
        if (mode === 'puzzle') { puzzleIndex = 0; initPuzzle(); }
        if (mode === 'computer') { initComputer(); }
      });
    });

    // Back buttons
    $$('.back-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        showScreen(btn.getAttribute('data-goto'));
      });
    });

    // Meet navigation
    $('#meet-prev').addEventListener('click', function() {
      if (meetIndex > 0) { meetIndex--; renderMeet(); }
    });
    $('#meet-next').addEventListener('click', function() {
      if (meetIndex < meetData.length - 1) { meetIndex++; renderMeet(); }
    });

    // Free play reset
    $('#freeplay-reset').addEventListener('click', resetFreeplay);

    // Computer new game
    $('#computer-new').addEventListener('click', newComputerGame);

    // Puzzle navigation
    $('#puzzle-prev').addEventListener('click', function() {
      if (puzzleIndex > 0) { puzzleIndex--; initPuzzle(); }
    });
    $('#puzzle-next').addEventListener('click', function() {
      if (puzzleIndex < puzzles.length - 1) { puzzleIndex++; initPuzzle(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
