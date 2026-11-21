// SHADOW PROTOCOL — game state, loop, scoring, camera hazard, scenes.
// Phases: menu, play, caught, clear, win.
// Rating per level: GHOST (never seen), SHADOW (seen but escaped),
// SPOTTED (caught). Score: +100 per core, +500 GHOST bonus, +250 SHADOW.
const game = {
  levelIndex: 0,
  level: null,
  guards: [],
  cameras: [],
  player: null,
  rings: [],
  smokes: [],
  score: 0,
  scoreAtLevelStart: 0,
  coresTaken: 0,
  everSeen: false,
  phase: 'menu',
  lastRating: '',
  finalRating: '',
  closeCall: false,
  staged: false,
  coinCooldown: 0,
  input: null,
  audio: null,
};

function loadLevel(index) {
  const def = LEVELS[index];
  const level = parseLevel(def);
  game.levelIndex = index;
  game.level = level;
  game.guards = def.guards.map((g, i) => makeGuard(g, i));
  game.cameras = (def.cameras || []).map((c) => ({
    x: (c.tx + 0.5) * TILE,
    y: (c.ty + 0.5) * TILE,
    base: c.base,
    sweep: c.sweep,
    range: c.range,
    period: c.period,
    angle: c.base,
    seesPlayer: false,
    alarm: 0,
    sounded: false,
  }));
  game.player = makePlayer(level.start);
  game.rings = [];
  game.smokes = [];
  game.coresTaken = 0;
  game.everSeen = false;
  game.closeCall = false;
  game.scoreAtLevelStart = game.score;
  game.phase = 'play';
}

function levelRating() {
  return game.everSeen ? 'SHADOW' : 'GHOST';
}

function clearLevel() {
  const rating = levelRating();
  game.lastRating = rating;
  game.score += rating === 'GHOST' ? 500 : 250;
  game.phase = 'clear';
  playSound(game.audio, 'clear');
}

function nextLevel() {
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.finalRating = game.score >= 1900 ? 'GHOST PROTOCOL' : game.score >= 1200 ? 'SHADOW OPERATIVE' : 'ROOKIE SHADOW';
    game.phase = 'win';
    return;
  }
  loadLevel(game.levelIndex + 1);
}

// Security camera: sweeping cone. Seeing Wren raises the alarm.
function updateCameras(dt, now) {
  for (const cam of game.cameras) {
    cam.angle = cam.base + Math.sin((now / 1000) * (Math.PI * 2 / cam.period)) * cam.sweep;
    const p = game.player;
    const dx = p.x - cam.x;
    const dy = p.y - cam.y;
    const dist = Math.hypot(dx, dy);
    let sees = false;
    if (dist < cam.range && !p.hidden) {
      const diff = Math.abs(angleDiff(Math.atan2(dy, dx), cam.angle));
      if (diff < 0.42 && hasLOS(game.level.walls, cam.x, cam.y, p.x, p.y)) sees = true;
    }
    // Smoke near the camera blinds it.
    for (const puff of game.smokes) {
      if (now - puff.born < puff.life && Math.hypot(cam.x - puff.x, cam.y - puff.y) < puff.r + 30) sees = false;
    }
    cam.seesPlayer = sees;
    if (sees) {
      cam.alarm += dt;
      if (cam.alarm > 0.7) {
        game.everSeen = true;
        for (const g of game.guards) g.suspicion = Math.min(100, g.suspicion + 34 * dt);
        if (!cam.sounded) {
          cam.sounded = true;
          playSound(game.audio, 'suspicious');
        }
      }
    } else {
      cam.alarm = Math.max(0, cam.alarm - dt);
      cam.sounded = false;
    }
  }
}

// Deterministic staged states for screenshots (?scene=cover|hide|alarm|exit).
// Positions are set exactly; the update loop is frozen so the shot is stable.
function stageScene(scene) {
  game.staged = true;
  loadLevel(scene === 'exit' ? 0 : 0);
  const now = performance.now();
  const P = game.player;
  const G = game.guards;
  if (scene === 'cover') {
    // Mid-gameplay: Wren mid-floor, two cones visible, one core taken.
    P.x = 13.5 * TILE; P.y = 8.5 * TILE; P.facing = -Math.PI / 2;
    game.level.cores[0].taken = true;
    game.coresTaken = 1;
    game.score = 100;
    G[0].x = 19.5 * TILE; G[0].y = 5.5 * TILE; G[0].dir = Math.PI;
    G[0].suspicion = 46; G[0].state = 'suspicious';
    G[1].x = 8.5 * TILE; G[1].y = 6.5 * TILE; G[1].dir = Math.PI / 2;
    G[2].x = 14.5 * TILE; G[2].y = 13.5 * TILE; G[2].dir = 0;
    game.rings.push({ x: P.x + 40, y: P.y + 30, r: 120, born: now - 300, life: 1400, kind: 'step' });
  } else if (scene === 'hide') {
    // Wren HIDDEN in a shadow tile while Marlowe patrols past.
    P.x = 6.5 * TILE; P.y = 1.5 * TILE; P.sneaking = true; P.moving = false;
    P.inShadow = true; P.hidden = true; P.facing = Math.PI / 2;
    G[0].x = 10.5 * TILE; G[0].y = 2.5 * TILE; G[0].dir = Math.PI;
    G[1].x = 8.5 * TILE; G[1].y = 6.5 * TILE; G[1].dir = 0;
    G[2].x = 14.5 * TILE; G[2].y = 13.5 * TILE; G[2].dir = -Math.PI / 2;
  } else if (scene === 'alarm') {
    // Red cone, "!" over Marlowe, CLOSE! flashing, Wren at the cone rim.
    P.x = 15.5 * TILE; P.y = 5.5 * TILE; P.facing = Math.PI;
    G[0].x = 19.5 * TILE; G[0].y = 5.5 * TILE; G[0].dir = Math.PI;
    G[0].suspicion = 100; G[0].state = 'alert';
    G[0].lastSeen = { x: P.x, y: P.y, t: now };
    game.everSeen = true;
    game.closeCall = true;
    G[1].x = 8.5 * TILE; G[1].y = 6.5 * TILE; G[1].dir = Math.PI / 2;
    G[1].suspicion = 38; G[1].state = 'suspicious';
    G[2].x = 14.5 * TILE; G[2].y = 13.5 * TILE; G[2].dir = 0;
    game.rings.push({ x: P.x, y: P.y, r: 120, born: now - 200, life: 1400, kind: 'step' });
  } else if (scene === 'exit') {
    // Level clear: all cores taken, exit open, Wren at the green door.
    for (const c of game.level.cores) c.taken = true;
    game.coresTaken = game.level.cores.length;
    game.score = 800;
    P.x = game.level.exit.x - 40; P.y = game.level.exit.y; P.facing = 0;
    G[0].x = 19.5 * TILE; G[0].y = 5.5 * TILE; G[0].dir = Math.PI / 2;
    G[1].x = 8.5 * TILE; G[1].y = 6.5 * TILE; G[1].dir = 0;
    G[2].x = 14.5 * TILE; G[2].y = 13.5 * TILE; G[2].dir = -Math.PI / 2;
    game.lastRating = 'GHOST';
    game.phase = 'clear';
  }
  if (scene !== 'exit') game.phase = 'play';
  updateHud(game);
  updateFooter(game);
}

function update(dt, now) {
  if (game.phase !== 'play' || game.staged) return;
  const p = game.player;
  // Player movement + noise.
  const noise = updatePlayer(p, game.input, game.level.walls, game.level.shadow, dt);
  if (noise) {
    game.rings.push({ x: noise.x, y: noise.y, r: noise.r, born: now, life: 900, kind: 'step' });
    investigateNoise(game.guards, noise);
    if (Math.random() < 0.5) playSound(game.audio, 'step');
  }
  // Coin throw (click).
  const click = consumeClick(game.input);
  if (click && game.coinCooldown <= 0) {
    const ring = throwCoin(p, click.x, click.y, now);
    if (ring) {
      game.rings.push(ring);
      investigateNoise(game.guards, ring);
      playSound(game.audio, 'coin');
      game.coinCooldown = 0.8;
    }
  }
  game.coinCooldown = Math.max(0, game.coinCooldown - dt);
  // Smoke (Q).
  if (consumePressed(game.input, 'KeyQ')) {
    const puff = throwSmoke(p, now);
    if (puff) {
      game.smokes.push(puff);
      applySmokeToGuards(puff, game.guards, now);
      playSound(game.audio, 'smoke');
    }
  }
  // Restart (R), next (N), mute (M).
  if (consumePressed(game.input, 'KeyR')) {
    game.score = game.scoreAtLevelStart;
    loadLevel(game.levelIndex);
  }
  if (consumePressed(game.input, 'KeyN') && game.phase === 'clear') nextLevel();
  if (consumePressed(game.input, 'KeyM')) {
    game.audio.muted = !game.audio.muted;
  }
  // Guards.
  game.closeCall = false;
  for (const g of game.guards) {
    const events = updateGuard(g, p, game.level.walls, dt, now);
    if (events.includes('alert')) {
      game.everSeen = true;
      playSound(game.audio, 'alert');
    } else if (events.includes('suspicious')) {
      playSound(game.audio, 'suspicious');
    }
    if (g.closeCall) game.closeCall = true;
  }
  updateCameras(dt, now);
  // Core pickup.
  for (const core of game.level.cores) {
    if (!core.taken && Math.hypot(core.x - p.x, core.y - p.y) < 22) {
      core.taken = true;
      game.coresTaken += 1;
      game.score += 100;
      playSound(game.audio, 'core');
    }
  }
  // Caught? Any guard within 18px touches Wren.
  for (const g of game.guards) {
    if (Math.hypot(g.x - p.x, g.y - p.y) < 18) {
      game.phase = 'caught';
      playSound(game.audio, 'caught');
      break;
    }
  }
  // Exit: all cores taken and Wren reaches the door.
  if (game.phase === 'play' && game.coresTaken >= game.level.cores.length) {
    const e = game.level.exit;
    if (Math.hypot(e.x - p.x, e.y - p.y) < 26) {
      playSound(game.audio, 'exit');
      clearLevel();
    }
  }
  // Prune old rings / puffs.
  game.rings = game.rings.filter((r) => now - r.born < r.life);
  game.smokes = game.smokes.filter((s) => now - s.born < s.life);
}

function boot() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  game.input = makeInput();
  game.audio = makeAudio();
  bindInput(game.input, canvas, (code) => {
    if (game.phase === 'menu') {
      game.phase = 'play';
      return;
    }
    if (code === 'KeyN' && game.phase === 'clear') nextLevel();
    if (code === 'KeyR' && (game.phase === 'caught' || game.phase === 'win')) {
      game.score = game.phase === 'win' ? 0 : game.scoreAtLevelStart;
      loadLevel(game.phase === 'win' ? 0 : game.levelIndex);
    }
  });
  canvas.addEventListener('mousedown', () => {
    if (game.phase === 'menu') {
      game.phase = 'play';
      // The click that starts the game must not also throw a coin.
      game.input.click = null;
    }
  });
  const params = new URLSearchParams(window.location.search);
  const scene = params.get('scene');
  if (scene) {
    stageScene(scene);
  } else {
    loadLevel(0);
    game.phase = 'menu';
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt, now);
    drawScene(ctx, game, now);
    updateHud(game);
    updateFooter(game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (typeof window !== 'undefined') window.SHADOW_MAIN = { game, loadLevel, stageScene, boot };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
