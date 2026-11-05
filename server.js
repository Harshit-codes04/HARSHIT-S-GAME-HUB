const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Matter = require('matter-js');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 9090;

app.use(express.static(path.join(__dirname, 'public')));

const { Engine, World, Bodies, Body, Vector } = Matter;

const TABLE_WIDTH = 900;
const TABLE_HEIGHT = 600;

// Pen Types Definition & Physics Stats
const PEN_TYPES = {
  GEL: {
    id: 'GEL',
    name: 'Gel Pen',
    icon: '🖊️',
    width: 130,
    height: 24,
    density: 0.0014,
    frictionAir: 0.035,
    restitution: 0.75,
    powerMultiplier: 1.0,
    desc: 'Balanced - Classic speed, slide & control'
  },
  FOUNTAIN: {
    id: 'FOUNTAIN',
    name: 'Fountain Pen',
    icon: '🖋️',
    width: 140,
    height: 28,
    density: 0.0025, // Heavy weight tank
    frictionAir: 0.042, // Stops quicker
    restitution: 0.90, // Massive impact punch
    powerMultiplier: 0.88,
    desc: 'Heavy Tank - Hard to knock off, brutal knocks, but slower slide'
  },
  PENCIL: {
    id: 'PENCIL',
    name: 'Wooden Pencil',
    icon: '✏️',
    width: 125,
    height: 18, // Thin profile
    density: 0.0008, // Very lightweight
    frictionAir: 0.024, // High speed, slides very far
    restitution: 0.65,
    powerMultiplier: 1.25, // Fast agile flicks
    desc: 'Agile Speedster - Rapid slide & high range, but easily knocked out'
  },
  SKETCH: {
    id: 'SKETCH',
    name: 'Sketch Pen',
    icon: '🖍️',
    width: 115,
    height: 32, // Chubby body
    density: 0.0017,
    frictionAir: 0.048, // High grip friction on desk
    restitution: 0.80,
    powerMultiplier: 1.1,
    desc: 'Grippy Brawler - Wide hit zone & high desk grip, low slide'
  },
  GOLD_QUILL: {
    id: 'GOLD_QUILL',
    name: 'Golden Feather Quill',
    icon: '🪶',
    width: 145,
    height: 26,
    density: 0.0018,
    frictionAir: 0.028,
    restitution: 0.88,
    powerMultiplier: 1.20,
    desc: 'Legendary Store Item - Gold-infused feather with superior slide & impact'
  },
  LASER_PEN: {
    id: 'LASER_PEN',
    name: 'Cyber Laser Pointer',
    icon: '⚡',
    width: 135,
    height: 22,
    density: 0.0012,
    frictionAir: 0.020,
    restitution: 0.85,
    powerMultiplier: 1.35,
    desc: 'Mythic Store Item - Ultra-lightweight aerospace alloy with hyper-speed flick'
  }
};

const PLAYER_CONFIGS = {
  1: { name: 'Player 1', colorName: 'Blue', color: '#2575fc' },
  2: { name: 'Player 2', colorName: 'Red', color: '#ff416c' },
  3: { name: 'Player 3', colorName: 'Green', color: '#2ecc71' },
  4: { name: 'Player 4', colorName: 'Yellow', color: '#f39c12' },
  5: { name: 'Player 5', colorName: 'Purple', color: '#9b59b6' }
};

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const rooms = new Map();

function getSpawnPositions(maxPlayers) {
  if (maxPlayers === 2) {
    return [
      { x: 180, y: TABLE_HEIGHT / 2, angle: 0 },
      { x: TABLE_WIDTH - 180, y: TABLE_HEIGHT / 2, angle: Math.PI }
    ];
  }
  const cx = TABLE_WIDTH / 2;
  const cy = TABLE_HEIGHT / 2;
  const rx = 280;
  const ry = 190;
  const spawns = [];
  for (let i = 0; i < maxPlayers; i++) {
    const theta = (2 * Math.PI / maxPlayers) * i;
    const x = cx + rx * Math.cos(theta);
    const y = cy + ry * Math.sin(theta);
    const angle = Math.atan2(cy - y, cx - x);
    spawns.push({ x, y, angle });
  }
  return spawns;
}

// Generate Obstacles based on the selected arena theme
function createThemeObstacles(theme) {
  const obstacles = [];
  if (theme === 'SCHOOL_BENCH') {
    // 1) Eraser in upper center
    obstacles.push({
      id: 'eraser',
      type: 'rect',
      x: TABLE_WIDTH / 2 - 35,
      y: TABLE_HEIGHT / 2 - 120,
      width: 70,
      height: 42,
      angle: 0.15,
      label: 'Eraser',
      color: '#ffffff'
    });
    // 2) Sharpener in lower center
    obstacles.push({
      id: 'sharpener',
      type: 'rect',
      x: TABLE_WIDTH / 2 + 35,
      y: TABLE_HEIGHT / 2 + 120,
      width: 52,
      height: 38,
      angle: -0.25,
      label: 'Sharpener',
      color: '#3b82f6'
    });
  } else if (theme === 'OFFICE_DESK') {
    // 1) Coffee Mug in center
    obstacles.push({
      id: 'mug',
      type: 'circle',
      x: TABLE_WIDTH / 2,
      y: TABLE_HEIGHT / 2,
      radius: 36,
      label: 'Coffee Mug',
      color: '#ffffff'
    });
    // 2) Stapler
    obstacles.push({
      id: 'stapler',
      type: 'rect',
      x: TABLE_WIDTH / 2 - 100,
      y: TABLE_HEIGHT / 2 + 110,
      width: 80,
      height: 32,
      angle: 0.4,
      label: 'Stapler',
      color: '#1e293b'
    });
  } else if (theme === 'DINING_TABLE') {
    // 1) Salt & Pepper shakers
    obstacles.push({
      id: 'salt',
      type: 'circle',
      x: TABLE_WIDTH / 2 - 50,
      y: TABLE_HEIGHT / 2 - 70,
      radius: 22,
      label: 'Salt',
      color: '#f8fafc'
    });
    obstacles.push({
      id: 'pepper',
      type: 'circle',
      x: TABLE_WIDTH / 2 + 50,
      y: TABLE_HEIGHT / 2 + 70,
      radius: 22,
      label: 'Pepper',
      color: '#1e293b'
    });
  } else if (theme === 'CHALKBOARD') {
    // 1) Blackboard Wooden Duster
    obstacles.push({
      id: 'duster',
      type: 'rect',
      x: TABLE_WIDTH / 2,
      y: TABLE_HEIGHT / 2,
      width: 100,
      height: 44,
      angle: 0.05,
      label: 'Duster',
      color: '#78350f'
    });
  }
  return obstacles;
}

function createRoom(roomId, mode = 'PVP', maxPlayers = 2, tableTheme = 'SCHOOL_BENCH') {
  const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
  const room = {
    id: roomId,
    mode,
    tableTheme,
    maxPlayers: mode === 'BOT' ? 2 : (mode === 'PVP' ? 2 : maxPlayers),
    engine,
    players: {},
    activePlayerNums: [],
    alivePlayers: [],
    turnIndex: 0,
    state: 'WAITING',
    scores: {},
    roundCount: 0,
    waitingForStop: false,
    pens: {},
    obstacles: []
  };
  rooms.set(roomId, room);
  return room;
}

function initRound(room) {
  World.clear(room.engine.world, false);
  room.pens = {};
  room.obstacles = [];

  // Add Theme Obstacles as DYNAMIC, movable physics bodies with natural desk friction!
  const obstacleConfigs = createThemeObstacles(room.tableTheme);
  obstacleConfigs.forEach(obs => {
    let body;
    if (obs.type === 'circle') {
      body = Bodies.circle(obs.x, obs.y, obs.radius, {
        isStatic: false,
        restitution: 0.70,
        frictionAir: 0.05, // Heavy natural desk friction
        density: 0.003,
        label: obs.label
      });
    } else {
      body = Bodies.rectangle(obs.x, obs.y, obs.width, obs.height, {
        isStatic: false,
        angle: obs.angle || 0,
        restitution: 0.70,
        frictionAir: 0.05,
        density: 0.003,
        label: obs.label
      });
    }
    body.meta = obs;
    room.obstacles.push(body);
    World.add(room.engine.world, body);
  });

  // Spawn Pens
  const total = room.activePlayerNums.length;
  const spawns = getSpawnPositions(total);

  room.alivePlayers = [...room.activePlayerNums];

  room.activePlayerNums.forEach((pNum, idx) => {
    const spawn = spawns[idx];
    const playerObj = Object.values(room.players).find(p => p.playerNum === pNum);
    const penTypeId = playerObj?.penType || 'GEL';
    const penConfig = PEN_TYPES[penTypeId] || PEN_TYPES.GEL;

    const pen = Bodies.rectangle(spawn.x, spawn.y, penConfig.width, penConfig.height, {
      label: `pen${pNum}`,
      frictionAir: penConfig.frictionAir,
      restitution: penConfig.restitution,
      density: penConfig.density,
      angle: spawn.angle
    });

    pen.penType = penTypeId;
    room.pens[pNum] = pen;
    World.add(room.engine.world, pen);
  });
}

function getCurrentTurnPlayer(room) {
  if (room.alivePlayers.length === 0) return null;
  return room.alivePlayers[room.turnIndex % room.alivePlayers.length];
}

function checkPenOffTable(pen) {
  const margin = 20;
  return (
    pen.position.x < -margin ||
    pen.position.x > TABLE_WIDTH + margin ||
    pen.position.y < -margin ||
    pen.position.y > TABLE_HEIGHT + margin
  );
}

function areObjectsStationary(room) {
  const speedThreshold = 0.08;
  const angThreshold = 0.02;

  // Check pens
  for (const pNum of room.alivePlayers) {
    const pen = room.pens[pNum];
    if (!pen) continue;
    const speed = Vector.magnitude(pen.velocity);
    if (speed >= speedThreshold || Math.abs(pen.angularVelocity) >= angThreshold) {
      return false;
    }
  }

  // Check moving obstacles
  for (const obs of room.obstacles) {
    const speed = Vector.magnitude(obs.velocity);
    if (speed >= speedThreshold || Math.abs(obs.angularVelocity) >= angThreshold) {
      return false;
    }
  }

  return true;
}

function startRound(room) {
  initRound(room);
  room.state = 'PLAYING';
  room.roundCount++;
  room.waitingForStop = false;
  room.turnIndex = 0;

  // Obstacles meta for frontend
  const obsData = room.obstacles.map(o => o.meta);

  io.to(room.id).emit('roundStart', {
    round: room.roundCount,
    turn: getCurrentTurnPlayer(room),
    scores: room.scores,
    alivePlayers: room.alivePlayers,
    tableTheme: room.tableTheme,
    obstacles: obsData
  });

  checkBotTurn(room);
}

function endRound(room, winnerNum, reason) {
  room.state = 'ROUND_OVER';
  if (winnerNum) {
    room.scores[winnerNum] = (room.scores[winnerNum] || 0) + 1;
  }

  const targetScore = room.mode === 'PARTY' ? 3 : 5;
  const matchWinner = Object.keys(room.scores).find(p => room.scores[p] >= targetScore) || null;

  io.to(room.id).emit('roundEnd', {
    winner: winnerNum ? parseInt(winnerNum) : null,
    reason,
    scores: room.scores,
    coinsEarned: {
      winner: 25,
      participant: 10
    },
    matchWinner: matchWinner ? parseInt(matchWinner) : null
  });

  if (matchWinner) {
    room.state = 'GAME_OVER';
  } else {
    setTimeout(() => {
      if (rooms.has(room.id) && room.state !== 'GAME_OVER') {
        startRound(room);
      }
    }, 2800);
  }
}

function triggerFlick(room, pNum, forceX, forceY, flickPoint) {
  if (room.state !== 'PLAYING' || room.waitingForStop) return;
  const currentTurn = getCurrentTurnPlayer(room);
  if (currentTurn !== pNum) return;

  const pen = room.pens[pNum];
  if (!pen) return;

  const penConfig = PEN_TYPES[pen.penType] || PEN_TYPES.GEL;
  const multiplier = penConfig.powerMultiplier || 1.0;

  const MAX_FORCE = 0.85;
  let fx = forceX * multiplier;
  let fy = forceY * multiplier;
  const mag = Math.hypot(fx, fy);
  if (mag > MAX_FORCE) {
    fx = (fx / mag) * MAX_FORCE;
    fy = (fy / mag) * MAX_FORCE;
  }

  const pt = flickPoint ? { x: flickPoint.x, y: flickPoint.y } : pen.position;
  Body.applyForce(pen, pt, { x: fx, y: fy });

  room.waitingForStop = true;
  io.to(room.id).emit('flickPerformed', { playerNum: pNum, fx, fy });
}

function checkBotTurn(room) {
  if (room.mode !== 'BOT' || room.state !== 'PLAYING') return;
  const currentTurn = getCurrentTurnPlayer(room);
  if (currentTurn === 2) {
    setTimeout(() => {
      if (room.state !== 'PLAYING' || room.waitingForStop) return;
      const botPen = room.pens[2];
      const targetPen = room.pens[1];
      if (!botPen || !targetPen) return;

      const dx = targetPen.position.x - botPen.position.x;
      const dy = targetPen.position.y - botPen.position.y;
      const dist = Math.hypot(dx, dy);

      const jitter = (Math.random() - 0.5) * 0.14;
      const angle = Math.atan2(dy, dx) + jitter;
      const power = Math.min(0.08 + (dist / TABLE_WIDTH) * 0.16, 0.22);

      const forceX = Math.cos(angle) * power;
      const forceY = Math.sin(angle) * power;

      triggerFlick(room, 2, forceX, forceY, botPen.position);
    }, 900);
  }
}

// 60FPS Physics Tick Loop
setInterval(() => {
  rooms.forEach((room) => {
    if (room.state !== 'PLAYING') return;

    Engine.update(room.engine, 1000 / 60);

    const eliminated = [];
    room.alivePlayers.forEach(pNum => {
      const pen = room.pens[pNum];
      if (pen && checkPenOffTable(pen)) {
        eliminated.push(pNum);
      }
    });

    if (eliminated.length > 0) {
      eliminated.forEach(pNum => {
        World.remove(room.engine.world, room.pens[pNum]);
        room.alivePlayers = room.alivePlayers.filter(p => p !== pNum);
      });

      io.to(room.id).emit('playerEliminated', {
        eliminated,
        alivePlayers: room.alivePlayers
      });

      if (room.alivePlayers.length <= 1) {
        const winner = room.alivePlayers[0] || null;
        const reason = winner
          ? `${PLAYER_CONFIGS[winner].name} survived the arena battle!`
          : 'All pens were knocked out!';
        endRound(room, winner, reason);
        return;
      }
    }

    if (room.waitingForStop) {
      if (areObjectsStationary(room)) {
        room.alivePlayers.forEach(pNum => {
          const pen = room.pens[pNum];
          if (pen) {
            Body.setVelocity(pen, { x: 0, y: 0 });
            Body.setAngularVelocity(pen, 0);
          }
        });

        // Settle obstacles completely
        room.obstacles.forEach(obs => {
          Body.setVelocity(obs, { x: 0, y: 0 });
          Body.setAngularVelocity(obs, 0);
        });

        room.waitingForStop = false;
        room.turnIndex = (room.turnIndex + 1) % room.alivePlayers.length;
        const nextTurn = getCurrentTurnPlayer(room);
        io.to(room.id).emit('turnChange', { turn: nextTurn });
        checkBotTurn(room);
      }
    }

    // Snapshot broadcast
    const pensSnapshot = {};
    Object.keys(room.pens).forEach(pNum => {
      const pen = room.pens[pNum];
      pensSnapshot[pNum] = {
        x: pen.position.x,
        y: pen.position.y,
        angle: pen.angle,
        vx: pen.velocity.x,
        vy: pen.velocity.y,
        penType: pen.penType || 'GEL',
        isAlive: room.alivePlayers.includes(parseInt(pNum))
      };
    });

    // Live dynamic obstacles snapshot
    const obsSnapshot = room.obstacles ? room.obstacles.map(o => ({
      id: o.meta.id,
      type: o.meta.type,
      x: o.position.x,
      y: o.position.y,
      angle: o.angle,
      width: o.meta.width,
      height: o.meta.height,
      radius: o.meta.radius,
      color: o.meta.color
    })) : [];

    io.to(room.id).emit('gameState', {
      pens: pensSnapshot,
      turn: getCurrentTurnPlayer(room),
      state: room.state,
      alivePlayers: room.alivePlayers,
      tableTheme: room.tableTheme,
      obstacles: obsSnapshot
    });
  });
}, 1000 / 60);

// Universal Room Multi-Game Realtime System
const universalRooms = new Map();

io.on('connection', (socket) => {
  // --- Universal 1v1 Room Signaling & State Synchronization ---
  socket.on('universal_join', ({ roomId, gameId, playerName }) => {
    socket.join(`uni_${roomId}`);
    socket.universalRoomId = roomId;
    socket.universalGameId = gameId;

    if (!universalRooms.has(roomId)) {
      universalRooms.set(roomId, {
        roomId,
        gameId,
        players: {},
        scores: { 1: 0, 2: 0 },
        turn: 1,
        state: 'WAITING'
      });
    }

    const uRoom = universalRooms.get(roomId);
    const existingPlayerCount = Object.keys(uRoom.players).length;

    if (existingPlayerCount >= 2 && !uRoom.players[socket.id]) {
      socket.emit('universal_full', { message: 'This 1v1 Room is already full!' });
      return;
    }

    const assignedNum = existingPlayerCount === 0 ? 1 : 2;
    uRoom.players[socket.id] = {
      id: socket.id,
      playerNum: assignedNum,
      name: playerName || `Player ${assignedNum}`
    };
    socket.universalPlayerNum = assignedNum;

    // Notify room of update
    const playerList = Object.values(uRoom.players);
    io.to(`uni_${roomId}`).emit('universal_room_state', {
      roomId,
      gameId: uRoom.gameId,
      playerNum: assignedNum,
      players: playerList,
      scores: uRoom.scores,
      turn: uRoom.turn,
      isReady: playerList.length === 2
    });

    if (playerList.length === 2) {
      io.to(`uni_${roomId}`).emit('universal_match_start', {
        message: 'Both players connected! Match starting!',
        players: playerList,
        scores: uRoom.scores,
        turn: uRoom.turn
      });
    }
  });

  // Relay game actions/events between the 2 players
  socket.on('universal_action', (data) => {
    if (!socket.universalRoomId) return;
    socket.to(`uni_${socket.universalRoomId}`).emit('universal_action_received', {
      senderNum: socket.universalPlayerNum,
      ...data
    });
  });

  // Relay score updates
  socket.on('universal_score', ({ playerNum, score, nextTurn }) => {
    if (!socket.universalRoomId) return;
    const uRoom = universalRooms.get(socket.universalRoomId);
    if (!uRoom) return;

    if (playerNum) uRoom.scores[playerNum] = score;
    if (nextTurn) uRoom.turn = nextTurn;

    io.to(`uni_${socket.universalRoomId}`).emit('universal_score_update', {
      scores: uRoom.scores,
      turn: uRoom.turn,
      lastScorer: playerNum
    });
  });

  // Universal Rematch
  socket.on('universal_rematch', () => {
    if (!socket.universalRoomId) return;
    const uRoom = universalRooms.get(socket.universalRoomId);
    if (!uRoom) return;
    uRoom.scores = { 1: 0, 2: 0 };
    uRoom.turn = 1;
    io.to(`uni_${socket.universalRoomId}`).emit('universal_rematch_start', {
      scores: uRoom.scores,
      turn: 1
    });
  });

  // Cleanup on disconnect
  const cleanupUniversal = () => {
    if (socket.universalRoomId && universalRooms.has(socket.universalRoomId)) {
      const uRoom = universalRooms.get(socket.universalRoomId);
      delete uRoom.players[socket.id];
      socket.to(`uni_${socket.universalRoomId}`).emit('universal_player_left', {
        playerNum: socket.universalPlayerNum,
        message: `Player ${socket.universalPlayerNum} disconnected.`
      });
      if (Object.keys(uRoom.players).length === 0) {
        universalRooms.delete(socket.universalRoomId);
      }
    }
  };
  socket.on('disconnecting', cleanupUniversal);

  let userRoomId = null;
  let playerNumber = null;

  socket.on('joinGame', ({ roomId, playerName, mode, partySize, penType, tableTheme }) => {
    roomId = roomId ? roomId.trim().toUpperCase() : 'CLASSIC';
    userRoomId = roomId;

    let room = rooms.get(roomId);
    if (!room) {
      const maxP = mode === 'PARTY' ? Math.min(Math.max(parseInt(partySize) || 4, 3), 5) : 2;
      room = createRoom(roomId, mode || 'PVP', maxP, tableTheme || 'SCHOOL_BENCH');
    }

    const currentPlayers = Object.keys(room.players);
    if (currentPlayers.length >= room.maxPlayers) {
      socket.emit('roomFull', { message: `Room is already full! (${room.maxPlayers} Players Max)` });
      return;
    }

    const takenNums = Object.values(room.players).map(p => p.playerNum);
    let assignedNum = 1;
    for (let i = 1; i <= room.maxPlayers; i++) {
      if (!takenNums.includes(i)) {
        assignedNum = i;
        break;
      }
    }

    playerNumber = assignedNum;
    room.players[socket.id] = {
      id: socket.id,
      playerNum: assignedNum,
      name: playerName || `Player ${assignedNum}`,
      penType: penType || 'GEL'
    };

    if (!room.scores[assignedNum]) room.scores[assignedNum] = 0;
    if (!room.activePlayerNums.includes(assignedNum)) {
      room.activePlayerNums.push(assignedNum);
      room.activePlayerNums.sort((a, b) => a - b);
    }

    socket.join(roomId);

    socket.emit('joined', {
      playerNum: assignedNum,
      roomId,
      mode: room.mode,
      tableTheme: room.tableTheme,
      maxPlayers: room.maxPlayers,
      scores: room.scores
    });

    if (room.mode === 'BOT' && !room.activePlayerNums.includes(2)) {
      room.players['BOT_SOCKET'] = {
        id: 'BOT_SOCKET',
        playerNum: 2,
        name: '🤖 AI Bot',
        penType: 'FOUNTAIN'
      };
      room.scores[2] = 0;
      room.activePlayerNums.push(2);
    }

    io.to(roomId).emit('playersUpdate', Object.values(room.players));

    if (room.activePlayerNums.length === room.maxPlayers) {
      startRound(room);
    }
  });

  socket.on('changeTheme', ({ tableTheme }) => {
    if (!userRoomId) return;
    const room = rooms.get(userRoomId);
    if (!room) return;
    room.tableTheme = tableTheme;
    // Re-initialize round with new theme & dynamic obstacles
    startRound(room);
  });

  socket.on('changePen', ({ penType }) => {
    if (!userRoomId) return;
    const room = rooms.get(userRoomId);
    if (!room) return;
    if (room.players[socket.id]) {
      room.players[socket.id].penType = penType;
    }
    // Update live pen body configuration if round playing
    startRound(room);
  });

  socket.on('flick', ({ forceX, forceY, flickPoint }) => {
    if (!userRoomId) return;
    const room = rooms.get(userRoomId);
    if (!room) return;
    triggerFlick(room, playerNumber, forceX, forceY, flickPoint);
  });

  socket.on('rematch', () => {
    if (!userRoomId) return;
    const room = rooms.get(userRoomId);
    if (!room) return;
    if (room.state === 'GAME_OVER') {
      room.activePlayerNums.forEach(p => { room.scores[p] = 0; });
      startRound(room);
    }
  });

  socket.on('disconnect', () => {
    if (userRoomId && rooms.has(userRoomId)) {
      const room = rooms.get(userRoomId);
      delete room.players[socket.id];
      room.activePlayerNums = room.activePlayerNums.filter(p => p !== playerNumber);
      delete room.scores[playerNumber];

      io.to(userRoomId).emit('playerDisconnected', {
        playerNum: playerNumber,
        message: `Player ${playerNumber} left the game.`
      });

      if (Object.keys(room.players).length === 0 || (room.mode === 'BOT' && Object.keys(room.players).length <= 1)) {
        rooms.delete(userRoomId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Pen Fight Multiplayer Server running on port ${PORT}`);
  console.log(` Web App: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
