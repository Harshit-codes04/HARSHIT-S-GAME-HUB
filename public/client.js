const socket = io();

// Canvas & Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const deskContainer = document.getElementById('deskContainer');

// UI Elements
const scoreboardRibbon = document.getElementById('scoreboardRibbon');
const turnIndicator = document.getElementById('turnIndicator');
const modeBadge = document.getElementById('modeBadge');
const roomTag = document.getElementById('roomTag');
const shareUrl = document.getElementById('shareUrl');
const copyUrlBtn = document.getElementById('copyUrlBtn');

// Store UI Elements
const openStoreBtn = document.getElementById('openStoreBtn');
const closeStoreBtn = document.getElementById('closeStoreBtn');
const storeModal = document.getElementById('storeModal');
const headerCoinCount = document.getElementById('headerCoinCount');
const storeCoinCount = document.getElementById('storeCoinCount');
const buyBtns = document.querySelectorAll('.buy-btn');

const inGameThemeBtn = document.getElementById('inGameThemeBtn');
const lobbyModal = document.getElementById('lobbyModal');
const joinBtn = document.getElementById('joinBtn');
const playerNameInput = document.getElementById('playerNameInput');
const roomInput = document.getElementById('roomInput');
const partySettings = document.getElementById('partySettings');
const partySizeSelect = document.getElementById('partySizeSelect');
const modeCards = document.querySelectorAll('.mode-card');
const penCards = document.querySelectorAll('.pen-card');
const themeCards = document.querySelectorAll('.theme-card');
const guideNote = document.getElementById('guideNote');

const resultModal = document.getElementById('resultModal');
const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const resultDesc = document.getElementById('resultDesc');
const resultScoreDisplay = document.getElementById('resultScoreDisplay');
const rematchBtn = document.getElementById('rematchBtn');

// Color Palette for up to 5 players
const PLAYER_THEMES = {
  1: { name: 'Player 1', colorName: 'Blue', hex: '#2575fc', grad: ['#1a5bd8', '#4facfe', '#0c3ca0'] },
  2: { name: 'Player 2', colorName: 'Red', hex: '#ff416c', grad: ['#d11b3d', '#ff4b2b', '#940c24'] },
  3: { name: 'Player 3', colorName: 'Green', hex: '#2ecc71', grad: ['#27ae60', '#2ecc71', '#1e8449'] },
  4: { name: 'Player 4', colorName: 'Yellow', hex: '#f39c12', grad: ['#e67e22', '#f1c40f', '#d35400'] },
  5: { name: 'Player 5', colorName: 'Purple', hex: '#9b59b6', grad: ['#8e44ad', '#9b59b6', '#6c3483'] }
};

// Selection State
let selectedMode = 'PVP';
let selectedPen = 'GEL';
let selectedTheme = 'SCHOOL_BENCH';

// Coins & Inventory Store System (Persistent via LocalStorage)
let userCoins = parseInt(localStorage.getItem('rag_coins')) || 100;
let unlockedPens = JSON.parse(localStorage.getItem('rag_unlocked_pens')) || ['GEL', 'FOUNTAIN', 'PENCIL', 'SKETCH'];

function saveEconomyState() {
  localStorage.setItem('rag_coins', userCoins);
  localStorage.setItem('rag_unlocked_pens', JSON.stringify(unlockedPens));
  updateStoreUI();
}

function updateStoreUI() {
  headerCoinCount.textContent = userCoins;
  storeCoinCount.textContent = userCoins;

  // Update pen selection cards lock status
  document.querySelectorAll('.pen-card').forEach(card => {
    const pId = card.getAttribute('data-pen');
    if (unlockedPens.includes(pId)) {
      card.classList.remove('locked');
      const lockOverlay = card.querySelector('.lock-overlay');
      if (lockOverlay) lockOverlay.remove();
    } else {
      card.classList.add('locked');
    }
  });

  // Update buy buttons in store
  buyBtns.forEach(btn => {
    const item = btn.getAttribute('data-item');
    if (unlockedPens.includes(item)) {
      btn.textContent = '✔ Owned';
      btn.classList.add('owned');
      btn.disabled = true;
    } else {
      const cost = btn.getAttribute('data-cost');
      btn.textContent = `🪙 ${cost} Coins`;
      btn.classList.remove('owned');
      btn.disabled = false;
    }
  });
}

// Open/Close Store Modal Handlers
openStoreBtn.addEventListener('click', () => {
  storeModal.classList.remove('hidden');
});

closeStoreBtn.addEventListener('click', () => {
  storeModal.classList.add('hidden');
});

// Buy Items Action
buyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.getAttribute('data-item');
    const cost = parseInt(btn.getAttribute('data-cost'));
    if (unlockedPens.includes(item)) return;

    if (userCoins >= cost) {
      userCoins -= cost;
      unlockedPens.push(item);
      saveEconomyState();
      alert(`🎉 Successfully unlocked ${item === 'GOLD_QUILL' ? 'Golden Quill' : 'Cyber Laser Pointer'}!`);
    } else {
      alert(`❌ Not enough coins! You have ${userCoins} coins, but this costs ${cost}. Play matches to earn more!`);
    }
  });
});

setTimeout(updateStoreUI, 100);


// Game State
let myPlayerNum = null;
let currentTurn = 1;
let currentTableTheme = 'SCHOOL_BENCH';
let pensData = {};
let obstaclesData = [];
let playersList = [];
let alivePlayers = [];
let scores = {};

// Drag / Flick State
let isDragging = false;
let dragStartPos = { x: 0, y: 0 };
let currentDragPos = { x: 0, y: 0 };
let flickPointOnPen = null;

const randomRoomBtn = document.getElementById('randomRoomBtn');

// Auto-fill room code from URL query parameter (e.g. ?room=ROOM123)
const urlParams = new URLSearchParams(window.location.search);
const urlRoomCode = urlParams.get('room');
if (urlRoomCode) {
  roomInput.value = urlRoomCode.toUpperCase();
}

// Random Room Code Generator
randomRoomBtn.addEventListener('click', () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  roomInput.value = code;
  updateShareUrl(code);
});

roomInput.addEventListener('input', () => {
  const code = roomInput.value.trim().toUpperCase() || 'CLASSIC';
  updateShareUrl(code);
});

const footerRoomCode = document.getElementById('footerRoomCode');

function updateShareUrl(roomCode) {
  const fullInviteUrl = `${window.location.origin}/?room=${encodeURIComponent(roomCode)}`;
  if (footerRoomCode) footerRoomCode.textContent = roomCode;

  copyUrlBtn.onclick = () => {
    navigator.clipboard.writeText(fullInviteUrl).then(() => {
      copyUrlBtn.classList.add('copied');
      copyUrlBtn.innerHTML = '<span>✔ Copied Link!</span>';
      setTimeout(() => {
        copyUrlBtn.classList.remove('copied');
        copyUrlBtn.innerHTML = '<span>🔗 Copy Invite Link</span>';
      }, 2000);
    });
  };
}

// Initialize with current room code
const initialRoom = roomInput.value.trim().toUpperCase() || 'CLASSIC';
updateShareUrl(initialRoom);

// Multi-Section Stepped Lobby Controller
let currentLobbyStep = 1;
const stepTabs = document.querySelectorAll('.step-tab');
const sectionStep1 = document.getElementById('sectionStep1');
const sectionStep2 = document.getElementById('sectionStep2');
const sectionStep3 = document.getElementById('sectionStep3');
const prevStepBtn = document.getElementById('prevStepBtn');
const nextStepBtn = document.getElementById('nextStepBtn');

function setLobbyStep(step) {
  currentLobbyStep = step;
  stepTabs.forEach(tab => {
    const s = parseInt(tab.getAttribute('data-step'));
    if (s === step) tab.classList.add('active');
    else tab.classList.remove('active');
  });

  sectionStep1.classList.add('hidden');
  sectionStep2.classList.add('hidden');
  sectionStep3.classList.add('hidden');

  if (step === 1) {
    sectionStep1.classList.remove('hidden');
    prevStepBtn.classList.add('hidden');
    nextStepBtn.classList.remove('hidden');
    nextStepBtn.textContent = 'Next: Choose Pen →';
    joinBtn.classList.add('hidden');
  } else if (step === 2) {
    sectionStep2.classList.remove('hidden');
    prevStepBtn.classList.remove('hidden');
    nextStepBtn.classList.remove('hidden');
    nextStepBtn.textContent = 'Next: Select Arena →';
    joinBtn.classList.add('hidden');
  } else if (step === 3) {
    sectionStep3.classList.remove('hidden');
    prevStepBtn.classList.remove('hidden');
    nextStepBtn.classList.add('hidden');
    joinBtn.classList.remove('hidden');
  }
}

stepTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const s = parseInt(tab.getAttribute('data-step'));
    setLobbyStep(s);
  });
});

nextStepBtn.addEventListener('click', () => {
  if (currentLobbyStep < 3) {
    setLobbyStep(currentLobbyStep + 1);
  }
});

prevStepBtn.addEventListener('click', () => {
  if (currentLobbyStep > 1) {
    setLobbyStep(currentLobbyStep - 1);
  }
});

// Pen Card Selection
penCards.forEach(card => {
  card.addEventListener('click', () => {
    const penId = card.getAttribute('data-pen');
    if (!unlockedPens.includes(penId)) {
      alert('🔒 This weapon is locked in the Store! Click on the Gold Coins button at the top to unlock it.');
      storeModal.classList.remove('hidden');
      return;
    }
    penCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    selectedPen = penId;
  });
});

// Theme Card Selection
themeCards.forEach(card => {
  card.addEventListener('click', () => {
    themeCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    selectedTheme = card.getAttribute('data-theme');
    applyTableVisualTheme(selectedTheme);
  });
});

// Mode Selection Handler
modeCards.forEach(card => {
  card.addEventListener('click', () => {
    modeCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    selectedMode = card.getAttribute('data-mode');

    if (selectedMode === 'PARTY') {
      partySettings.classList.remove('hidden');
      guideNote.innerHTML = '👑 <strong>Party Battle:</strong> Supports 3, 4, or 5 players simultaneously around the table ring!';
    } else if (selectedMode === 'BOT') {
      partySettings.classList.add('hidden');
      guideNote.innerHTML = '🤖 <strong>vs AI Bot:</strong> Practice against the AI Fountain Pen tank!';
    } else {
      partySettings.classList.add('hidden');
      guideNote.innerHTML = '⚔️ <strong>1 vs 1:</strong> Classic head-to-head match. Enter the same Room Code to battle.';
    }
  });
});

function applyTableVisualTheme(theme) {
  currentTableTheme = theme;
  if (theme === 'OFFICE_DESK') {
    deskContainer.style.borderColor = '#1e293b';
    deskContainer.style.boxShadow = '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.15)';
    canvas.style.background = '#0f172a';
  } else if (theme === 'DINING_TABLE') {
    deskContainer.style.borderColor = '#7f1d1d';
    deskContainer.style.boxShadow = '0 25px 60px rgba(0, 0, 0, 0.7)';
    canvas.style.background = '#fef2f2';
  } else if (theme === 'CHALKBOARD') {
    deskContainer.style.borderColor = '#854d0e'; // Wooden frame of chalkboard
    deskContainer.style.boxShadow = '0 25px 60px rgba(0, 0, 0, 0.85), inset 0 0 30px rgba(0,0,0,0.4)';
    canvas.style.background = 'radial-gradient(circle at center, #1b4332 0%, #081c15 100%)';
  } else {
    // SCHOOL_BENCH
    deskContainer.style.borderColor = '#451a03';
    deskContainer.style.boxShadow = '0 25px 60px rgba(0, 0, 0, 0.75)';
    canvas.style.background = 'radial-gradient(circle at center, #92400e 0%, #713f12 100%)';
  }
}

let hasJoinedGame = false;

// Join button
joinBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim() || 'Striker';
  const room = roomInput.value.trim().toUpperCase() || 'CLASSIC';
  const partySize = parseInt(partySizeSelect.value) || 4;

  roomTag.textContent = `Room: ${room}`;
  modeBadge.textContent = selectedMode === 'BOT' ? 'Mode: vs AI Bot' : (selectedMode === 'PARTY' ? `Party (${partySize} Players)` : 'Mode: 1v1 PvP');

  if (!hasJoinedGame) {
    socket.emit('joinGame', {
      roomId: room,
      playerName: name,
      mode: selectedMode,
      partySize,
      penType: selectedPen,
      tableTheme: selectedTheme
    });
    hasJoinedGame = true;
  } else {
    // If already in game, update live theme and pen weapon
    socket.emit('changeTheme', { tableTheme: selectedTheme });
    socket.emit('changePen', { penType: selectedPen });
  }

  lobbyModal.classList.add('hidden');
});

// In-Game Theme & Loadout button
inGameThemeBtn.addEventListener('click', () => {
  setLobbyStep(3); // Open directly on Arena/Loadout section
  joinBtn.textContent = 'Apply Changes ⚡';
  joinBtn.classList.remove('hidden');
  lobbyModal.classList.remove('hidden');
});

rematchBtn.addEventListener('click', () => {
  socket.emit('rematch');
  resultModal.classList.add('hidden');
});

// Socket Events
socket.on('joined', (data) => {
  myPlayerNum = data.playerNum;
  scores = data.scores || {};
  if (data.tableTheme) applyTableVisualTheme(data.tableTheme);
  const theme = PLAYER_THEMES[myPlayerNum];
  turnIndicator.textContent = `You are ${theme.name} (${theme.colorName}). Waiting for players...`;
});

socket.on('playersUpdate', (players) => {
  playersList = players;
  updateScoreboard();
});

socket.on('roundStart', (data) => {
  resultModal.classList.add('hidden');
  currentTurn = data.turn;
  scores = data.scores || {};
  alivePlayers = data.alivePlayers || [];
  if (data.obstacles) obstaclesData = data.obstacles;
  if (data.tableTheme) applyTableVisualTheme(data.tableTheme);
  updateScoreboard();
  updateTurnDisplay();
});

socket.on('gameState', (state) => {
  pensData = state.pens || {};
  if (state.obstacles) obstaclesData = state.obstacles;
  if (state.tableTheme && state.tableTheme !== currentTableTheme) {
    applyTableVisualTheme(state.tableTheme);
  }
  if (state.turn !== currentTurn) {
    currentTurn = state.turn;
    updateTurnDisplay();
  }
  if (state.alivePlayers) {
    alivePlayers = state.alivePlayers;
    updateScoreboard();
  }
});

socket.on('turnChange', (data) => {
  currentTurn = data.turn;
  updateTurnDisplay();
});

socket.on('roundEnd', (data) => {
  scores = data.scores || {};
  updateScoreboard();
  resultModal.classList.remove('hidden');

  // Award Coins for gameplay
  const isWinner = data.winner === myPlayerNum;
  const reward = isWinner ? 25 : 10;
  userCoins += reward;
  saveEconomyState();

  if (data.matchWinner) {
    const isMatchChamp = data.matchWinner === myPlayerNum;
    if (isMatchChamp) userCoins += 50; // Bonus for winning the whole match!
    saveEconomyState();
    resultIcon.textContent = isMatchChamp ? '👑' : '💀';
    resultTitle.textContent = isMatchChamp ? 'MATCH CHAMPION! (+75 COINS)' : 'MATCH OVER (+10 COINS)';
    resultDesc.textContent = `${PLAYER_THEMES[data.matchWinner].name} won the championship!`;
    rematchBtn.classList.remove('hidden');
  } else {
    resultIcon.textContent = isWinner ? '🎯' : '💥';
    resultTitle.textContent = isWinner ? 'ROUND WON! (+25 COINS)' : 'ROUND OVER (+10 COINS)';
    resultDesc.textContent = data.reason;
    rematchBtn.classList.add('hidden');
  }

  resultScoreDisplay.innerHTML = Object.keys(scores)
    .map(p => `<span style="color:${PLAYER_THEMES[p].hex}">${PLAYER_THEMES[p].name}: ${scores[p]}</span>`)
    .join(' | ');
});

socket.on('roomFull', (data) => {
  alert(data.message);
  lobbyModal.classList.remove('hidden');
});

socket.on('playerDisconnected', (data) => {
  turnIndicator.textContent = `${data.message} Waiting for players...`;
});

function updateScoreboard() {
  scoreboardRibbon.innerHTML = '';
  const displayPlayers = playersList.length > 0
    ? playersList
    : Object.keys(scores).map(p => ({ playerNum: parseInt(p), name: PLAYER_THEMES[p].name }));

  displayPlayers.forEach(p => {
    const pNum = p.playerNum;
    const theme = PLAYER_THEMES[pNum] || PLAYER_THEMES[1];
    const isAlive = alivePlayers.length === 0 || alivePlayers.includes(pNum);
    const isCurrent = currentTurn === pNum;

    const pill = document.createElement('div');
    pill.className = `player-score-pill ${isCurrent ? 'active-turn' : ''} ${!isAlive ? 'eliminated' : ''}`;
    pill.style.color = theme.hex;

    pill.innerHTML = `
      <div class="color-dot" style="background:${theme.hex}"></div>
      <span>${p.name}: <strong>${scores[pNum] || 0}</strong></span>
    `;
    scoreboardRibbon.appendChild(pill);
  });
}

function updateTurnDisplay() {
  updateScoreboard();
  if (!currentTurn) return;

  const currentTheme = PLAYER_THEMES[currentTurn] || PLAYER_THEMES[1];

  if (myPlayerNum === null) {
    turnIndicator.textContent = `Spectating - Turn: ${currentTheme.name}`;
  } else if (currentTurn === myPlayerNum) {
    turnIndicator.textContent = `👉 YOUR TURN TO FLICK! (${currentTheme.colorName})`;
    turnIndicator.style.color = '#38ef7d';
  } else {
    turnIndicator.textContent = `⏳ ${currentTheme.name}'s turn to flick...`;
    turnIndicator.style.color = '#fbbf24';
  }
}

// Drag & Flick Controls
function getCanvasCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function isPointInsidePen(pos, pen) {
  if (!pen) return false;
  const dx = pos.x - pen.x;
  const dy = pos.y - pen.y;
  const cos = Math.cos(-pen.angle);
  const sin = Math.sin(-pen.angle);
  const rx = cos * dx - sin * dy;
  const ry = sin * dx + cos * dy;
  return Math.abs(rx) <= 80 && Math.abs(ry) <= 26;
}

function handlePointerDown(e) {
  if (myPlayerNum !== currentTurn) return;
  const myPen = pensData[myPlayerNum];
  if (!myPen || !myPen.isAlive) return;

  const pos = getCanvasCoordinates(e);
  if (isPointInsidePen(pos, myPen)) {
    isDragging = true;
    dragStartPos = pos;
    currentDragPos = pos;
    flickPointOnPen = pos;
  }
}

function handlePointerMove(e) {
  if (!isDragging) return;
  currentDragPos = getCanvasCoordinates(e);
}

function handlePointerUp() {
  if (!isDragging) return;
  isDragging = false;

  const dx = dragStartPos.x - currentDragPos.x;
  const dy = dragStartPos.y - currentDragPos.y;
  const distance = Math.hypot(dx, dy);

  if (distance > 6) {
    const clampedDist = Math.min(distance, 260);
    const normalizedPower = clampedDist / 260;
    const impulseStrength = 0.005 + Math.pow(normalizedPower, 2.2) * 0.215;

    const dirX = dx / distance;
    const dirY = dy / distance;

    socket.emit('flick', {
      forceX: dirX * impulseStrength,
      forceY: dirY * impulseStrength,
      flickPoint: flickPointOnPen
    });
  }
}

// Pointer Events with passive: false to prevent mobile screen dragging/scrolling while aiming
canvas.addEventListener('mousedown', handlePointerDown);
window.addEventListener('mousemove', handlePointerMove);
window.addEventListener('mouseup', handlePointerUp);

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handlePointerDown(e);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (isDragging) {
    e.preventDefault();
  }
  handlePointerMove(e);
}, { passive: false });

window.addEventListener('touchend', (e) => {
  if (isDragging) {
    e.preventDefault();
  }
  handlePointerUp();
}, { passive: false });

// Detailed Environmental Arena Renderers
function drawTableDecorations() {
  ctx.save();

  if (currentTableTheme === 'OFFICE_DESK') {
    // 🏢 MODERN CORPORATE OFFICE WORKSPACE
    // 1. Sleek Carbon / Matte desk texture
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle carbon grid weave
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 2. Dual Ultrawide Computer Monitor along the top bezel
    const monW = 540, monH = 26;
    ctx.shadowColor = 'rgba(0, 242, 254, 0.35)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect((canvas.width - monW) / 2, 4, monW, monH, [0, 0, 8, 8]);
    ctx.fill();

    // Glowing screen edge
    ctx.fillStyle = '#0284c7';
    ctx.fillRect((canvas.width - monW) / 2 + 10, 8, monW - 20, 10);
    // Monitor stand neck
    ctx.fillStyle = '#64748b';
    ctx.fillRect(canvas.width / 2 - 28, 0, 56, 8);
    ctx.shadowBlur = 0;

    // 3. Huge RGB Gaming / Office Desk Mat in the playing zone
    ctx.fillStyle = 'rgba(30, 41, 59, 0.65)';
    ctx.beginPath();
    ctx.roundRect(100, 60, canvas.width - 200, canvas.height - 120, 18);
    ctx.fill();

    // RGB glowing border stitching on mat
    const matGrad = ctx.createLinearGradient(100, 60, canvas.width - 100, canvas.height - 60);
    matGrad.addColorStop(0, '#00f2fe');
    matGrad.addColorStop(0.5, '#818cf8');
    matGrad.addColorStop(1, '#f43f5e');
    ctx.strokeStyle = matGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 4. Mechanical Keyboard (Left Edge decoration)
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.roundRect(14, 150, 72, 300, 8);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Keycaps grid on keyboard
    ctx.fillStyle = '#1e293b';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(22 + c * 18, 162 + r * 31, 14, 23);
      }
    }

    // 5. Ergonomic Wireless Mouse (Right Edge decoration)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(canvas.width - 78, 230, 52, 90, 26);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Scroll wheel & RGB line
    ctx.fillStyle = '#00f2fe';
    ctx.fillRect(canvas.width - 54, 245, 4, 18);

    // 6. Realistic dried coffee ring stain on desk
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.28)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(canvas.width - 130, 95, 28, 0, Math.PI * 2);
    ctx.stroke();

    // 7. Yellow Sticky Notes with handwritten reminder
    ctx.save();
    ctx.translate(canvas.width - 170, canvas.height - 75);
    ctx.rotate(0.08);
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 6;
    ctx.fillRect(0, 0, 68, 58);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#854d0e';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('MEETING @ 4', 5, 20);
    ctx.fillText('PEN FIGHT!', 5, 36);
    ctx.restore();

  } else if (currentTableTheme === 'DINING_TABLE') {
    // 🍽️ AUTHENTIC DINING TABLE
    // Red & White Checkered Picnic/Dining Tablecloth pattern
    const tileSize = 45;
    for (let x = 0; x < canvas.width; x += tileSize) {
      for (let y = 0; y < canvas.height; y += tileSize) {
        if ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    }

    // Center Round Porcelain Serving Plate
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Elegant Gold Rim on plate
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner embossed ceramic ring
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 105, 0, Math.PI * 2);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fork (Left) & Butter Knife (Right) outside the battle plate
    // Fork
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(canvas.width / 2 - 210, canvas.height / 2 - 60, 10, 120);
    // Knife
    ctx.fillRect(canvas.width / 2 + 200, canvas.height / 2 - 60, 10, 120);

  } else if (currentTableTheme === 'CHALKBOARD') {
    // 📋 VINTAGE CLASSROOM GREEN CHALKBOARD
    // Blackboard wood border trim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Chalk dust smear effect
    const dustGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 80, canvas.width / 2, canvas.height / 2, 380);
    dustGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    dustGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = dustGrad;
    ctx.fillRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Dashed center arena circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 140, 0, Math.PI * 2);
    ctx.stroke();

    // Center divider chalk line
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 30);
    ctx.lineTo(canvas.width / 2, canvas.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // Handwritten Chalk Math & Physics Formulas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = 'bold 16px "Comic Sans MS", monospace, cursive';
    ctx.fillText('E = mc²', 65, 80);
    ctx.fillText('F = ma', 70, 110);
    ctx.fillText('sin²θ + cos²θ = 1', canvas.width - 230, 80);
    ctx.fillText('∫ x dx = x²/2 + C', canvas.width - 220, canvas.height - 60);
    ctx.fillText('PERIOD 4: PHYSICS', 65, canvas.height - 60);

    // Chalk sticks on tray at bottom
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(canvas.width / 2 - 40, canvas.height - 24, 30, 7);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(canvas.width / 2 + 5, canvas.height - 24, 30, 7);

  } else {
    // 🏫 CLASSIC NOSTALGIC SCHOOL BENCH
    // 1. Natural Wood grain planks with knots
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.lineWidth = 3;
    for (let y = 75; y < canvas.height; y += 85) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 2. Sunken Pen Groove (Classroom desk tray at top where students rest pencils)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.roundRect(80, 14, canvas.width - 160, 20, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.stroke();

    // 3. Middle Bench Territory Divider carved with compass
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 45);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Geometry Compass Arc carved deeply into the wood
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 145, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Open Notebook / Exam Sheet lying on the left side
    ctx.save();
    ctx.translate(35, 110);
    ctx.rotate(-0.06);
    // Paper drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fffbeb'; // Antique notebook paper
    ctx.fillRect(0, 0, 90, 130);
    ctx.shadowBlur = 0;
    // Blue notebook ruled lines
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 1;
    for (let py = 20; py < 120; py += 14) {
      ctx.beginPath();
      ctx.moveTo(8, py);
      ctx.lineTo(82, py);
      ctx.stroke();
    }
    // Red margin line
    ctx.strokeStyle = '#fca5a5';
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(22, 130);
    ctx.stroke();
    ctx.restore();

    // 6. Geometry 15cm Ruler lying along the bottom edge
    ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.beginPath();
    ctx.roundRect(canvas.width - 260, canvas.height - 40, 200, 26, 4);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Ruler millimeter tick marks
    ctx.strokeStyle = '#713f12';
    for (let rx = 10; rx < 190; rx += 8) {
      ctx.beginPath();
      ctx.moveTo(canvas.width - 260 + rx, canvas.height - 40);
      ctx.lineTo(canvas.width - 260 + rx, canvas.height - 40 + (rx % 24 === 0 ? 10 : 5));
      ctx.stroke();
    }

    // 7. Authentic classroom bench carved graffiti
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.font = 'italic bold 13px cursive';
    ctx.fillText('RAG BATTLE 2026', canvas.width / 2 - 75, canvas.height / 2 + 5);
    ctx.fillText('❌ NO CROSSING', canvas.width / 2 + 15, 68);
    ctx.fillText('COOL DUDE WAS HERE', canvas.width - 180, 120);
  }

  ctx.restore();
}

// Render Solid Obstacles on Desk
function drawObstacles() {
  obstaclesData.forEach(obs => {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    if (obs.angle) ctx.rotate(obs.angle);

    // Obstacle Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;

    if (obs.id === 'eraser') {
      // 🧼 Classroom White/Blue Dual Eraser
      const w = obs.width, h = obs.height;
      // White side
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w / 2, h, [4, 0, 0, 4]);
      ctx.fill();
      // Blue ink-eraser side
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(0, -h / 2, w / 2, h, [0, 4, 4, 0]);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('ERASER', -18, 3);

    } else if (obs.id === 'sharpener') {
      // ✏️ Metallic/Plastic Wedge Sharpener
      const w = obs.width, h = obs.height;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Metal blade
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-w / 4, -h / 2 + 6, w / 2, h - 12);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (obs.id === 'mug') {
      // ☕ Ceramic Coffee Mug (Circle)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.shadowBlur = 0;
      // Dark Coffee liquid inside
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(0, 0, obs.radius - 7, 0, Math.PI * 2);
      ctx.fill();

    } else if (obs.id === 'stapler') {
      // 📎 Heavy Metal Stapler
      const w = obs.width, h = obs.height;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 5);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-w / 2 + 10, -h / 2 + 4, w - 20, 5);

    } else if (obs.id === 'salt' || obs.id === 'pepper') {
      // 🧂 Salt / Pepper Shaker
      ctx.fillStyle = obs.color;
      ctx.beginPath();
      ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = obs.id === 'salt' ? '#94a3b8' : '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(obs.id === 'salt' ? 'S' : 'P', -4, 4);

    } else if (obs.id === 'duster') {
      // 🧽 Wooden Chalkboard Duster
      const w = obs.width, h = obs.height;
      // Wooden block top
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Felt layer
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('DUSTER', -22, 4);
    }
    ctx.restore();
  });
}

// Draw Distinct Pen Models
function drawPen(x, y, angle, playerNum, penType) {
  const theme = PLAYER_THEMES[playerNum] || PLAYER_THEMES[1];
  const type = penType ? penType.toUpperCase() : 'GEL';

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;

  if (type === 'PENCIL') {
    // ✏️ PENCIL: Hexagonal slender wooden body + pink eraser
    const w = 125, h = 18;
    // Wood shaft
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-w / 2 + 20, -h / 2, w - 46, h);

    // Player color accent line
    ctx.fillStyle = theme.hex;
    ctx.fillRect(-w / 2 + 20, -2, w - 46, 4);

    ctx.shadowBlur = 0;

    // Sharpened cone
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 26, -h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(w / 2 - 26, h / 2);
    ctx.closePath();
    ctx.fill();

    // Graphite lead tip
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 8, -2.5);
    ctx.lineTo(w / 2 + 5, 0);
    ctx.lineTo(w / 2 - 8, 2.5);
    ctx.closePath();
    ctx.fill();

    // Metal ferrule
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-w / 2 + 8, -h / 2, 12, h);

    // Pink eraser
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, 8, h, [4, 0, 0, 4]);
    ctx.fill();

  } else if (type === 'FOUNTAIN') {
    // 🖋️ FOUNTAIN PEN: Big wide black lacquered body + Gold Nib
    const w = 140, h = 28;
    const barrelGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    barrelGrad.addColorStop(0, '#0f172a');
    barrelGrad.addColorStop(0.5, theme.hex);
    barrelGrad.addColorStop(1, '#020617');

    ctx.fillStyle = barrelGrad;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w - 32, h, 6);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Gold Trim Rings
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-w / 2 + 25, -h / 2, 4, h);
    ctx.fillRect(w / 2 - 36, -h / 2, 4, h);

    // Majestic Gold Fountain Nib
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 32, -h / 2 + 4);
    ctx.lineTo(w / 2 + 12, 0);
    ctx.lineTo(w / 2 - 32, h / 2 - 4);
    ctx.closePath();
    ctx.fill();

    // Breathing Hole
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(w / 2 - 12, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Gold Clip
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-w / 2 + 10, -h / 2 - 3, 35, 4);

  } else if (type === 'SKETCH') {
    // 🖍️ SKETCH PEN: Thick chubby white body + chisel felt tip
    const w = 115, h = 32;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w - 24, h, 6);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Player color thick band
    ctx.fillStyle = theme.hex;
    ctx.fillRect(-w / 2 + 18, -h / 2, 28, h);

    // Thick Felt Chisel Tip
    ctx.fillStyle = theme.hex;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 24, -h / 2 + 5);
    ctx.lineTo(w / 2 + 6, -4);
    ctx.lineTo(w / 2 + 6, 8);
    ctx.lineTo(w / 2 - 24, h / 2 - 5);
    ctx.closePath();
    ctx.fill();

    // Colored Cap Back
    ctx.fillStyle = theme.hex;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, 14, h, [6, 0, 0, 6]);
    ctx.fill();

  } else if (type === 'GOLD_QUILL') {
    // 🪶 GOLDEN FEATHER QUILL (Legendary Store Item)
    const w = 145, h = 26;
    // Glowing golden feather vanes
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.quadraticCurveTo(-w / 4, -h, w / 4, -h / 2);
    ctx.lineTo(w / 2 - 20, 0);
    ctx.quadraticCurveTo(-w / 4, h, -w / 2, 0);
    ctx.fill();

    // Central Gold Quill Shaft
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-w / 2 + 10, -2.5, w - 30, 5);

    // Ornate Gold Nib
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 20, -h / 2 + 6);
    ctx.lineTo(w / 2 + 12, 0);
    ctx.lineTo(w / 2 - 20, h / 2 - 6);
    ctx.closePath();
    ctx.fill();

  } else if (type === 'LASER_PEN') {
    // ⚡ CYBER LASER POINTER (Mythic Store Item)
    const w = 135, h = 22;
    // Titanium aerospace chassis
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w - 20, h, 4);
    ctx.fill();

    // Glowing Cyan Core Stripe
    ctx.fillStyle = '#00f2fe';
    ctx.fillRect(-w / 2 + 15, -3, w - 50, 6);

    // Laser Diode Lens at the tip
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(w / 2 - 8, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

  } else {
    // 🖊️ GEL PEN (Standard transparent blue/red barrel)
    const w = 130, h = 24;
    const barrelGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    barrelGrad.addColorStop(0, theme.grad[0]);
    barrelGrad.addColorStop(0.5, theme.grad[1]);
    barrelGrad.addColorStop(1, theme.grad[2]);

    ctx.fillStyle = barrelGrad;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w - 24, h, 4);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Grip lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const gx = w / 2 - 42 + i * 5;
      ctx.beginPath();
      ctx.moveTo(gx, -h / 2 + 3);
      ctx.lineTo(gx, h / 2 - 3);
      ctx.stroke();
    }

    // Metal cone tip
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 24, -h / 2 + 2);
    ctx.lineTo(w / 2, -2);
    ctx.lineTo(w / 2 + 8, 0);
    ctx.lineTo(w / 2, 2);
    ctx.lineTo(w / 2 - 24, h / 2 - 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = theme.hex;
    ctx.beginPath();
    ctx.arc(w / 2 + 8, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    // Cap & clip
    ctx.fillStyle = theme.grad[2];
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2 + 2, 14, h - 4, 3);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-w / 2 + 10, -h / 2 - 3, 30, 4);
  }

  // Active halo indicator
  if (currentTurn === playerNum) {
    ctx.strokeStyle = theme.hex;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-75, -20, 150, 40, 8);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAimTrajectory() {
  if (!isDragging) return;

  const dx = dragStartPos.x - currentDragPos.x;
  const dy = dragStartPos.y - currentDragPos.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 6) return;

  ctx.save();
  const angle = Math.atan2(dy, dx);
  const clampedDist = Math.min(dist, 260);
  const powerRatio = clampedDist / 260;
  const powerLength = 25 + Math.pow(powerRatio, 1.5) * 260;

  const red = Math.floor(Math.min(powerRatio * 2, 1) * 255);
  const green = Math.floor(Math.max(1 - (powerRatio - 0.5) * 2, 0) * 255);
  const color = `rgb(${red}, ${green}, 40)`;

  // Trajectory dots
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 + powerRatio * 4;
  ctx.beginPath();
  ctx.moveTo(dragStartPos.x, dragStartPos.y);
  ctx.lineTo(dragStartPos.x + Math.cos(angle) * powerLength, dragStartPos.y + Math.sin(angle) * powerLength);
  ctx.stroke();
  ctx.setLineDash([]);

  // Drag pull string
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dragStartPos.x, dragStartPos.y);
  ctx.lineTo(currentDragPos.x, currentDragPos.y);
  ctx.stroke();

  // Anchor
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(currentDragPos.x, currentDragPos.y, 7 + powerRatio * 5, 0, Math.PI * 2);
  ctx.fill();

  // % Power HUD
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui';
  ctx.fillText(`${Math.round(powerRatio * 100)}% POWER`, currentDragPos.x + 14, currentDragPos.y + 4);

  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTableDecorations();
  drawObstacles();

  // Render Pens
  Object.keys(pensData).forEach(pNum => {
    const pen = pensData[pNum];
    if (pen && pen.isAlive) {
      drawPen(pen.x, pen.y, pen.angle, parseInt(pNum), pen.penType);
    }
  });

  drawAimTrajectory();
  requestAnimationFrame(render);
}

render();
