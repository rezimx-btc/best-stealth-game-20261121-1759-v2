// SHADOW PROTOCOL — the player (Wren).
// Walk speed 150 px/s (makes noise rings), sneak (Shift) 70 px/s and silent.
// Standing still in a shadow tile = HIDDEN: guards cannot see the player.
const WALK_SPEED = 150;
const SNEAK_SPEED = 70;
const PLAYER_RADIUS = 11;
const NOISE_STEP = 0.55; // seconds between noise rings while walking
const SMOKE_DURATION = 3000; // ms of blinded vision
const SMOKE_RADIUS = 95;

function makePlayer(start) {
  return {
    x: start.x,
    y: start.y,
    vx: 0,
    vy: 0,
    sneaking: false,
    moving: false,
    hidden: false,
    inShadow: false,
    noiseTimer: 0,
    smokes: 3,
    coins: 99,
    facing: 0,
  };
}

function playerTile(player) {
  return { tx: Math.floor(player.x / TILE), ty: Math.floor(player.y / TILE) };
}

function updatePlayer(player, input, walls, shadow, dt) {
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  const len = Math.hypot(mx, my);
  player.moving = len > 0;
  player.sneaking = !!input.sneak;
  if (len > 0) {
    mx /= len;
    my /= len;
    const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
    player.facing = Math.atan2(my, mx);
    moveWithWalls(walls, player, mx * speed * dt, my * speed * dt, PLAYER_RADIUS);
  }
  const t = playerTile(player);
  player.inShadow = shadow.has(t.tx + ',' + t.ty);
  // HIDDEN: inside a shadow zone and not moving fast (sneak or still).
  player.hidden = player.inShadow && (player.sneaking || !player.moving);
  // Noise rings while walking (not sneaking).
  let madeNoise = null;
  if (player.moving && !player.sneaking) {
    player.noiseTimer -= dt;
    if (player.noiseTimer <= 0) {
      player.noiseTimer = NOISE_STEP;
      madeNoise = { x: player.x, y: player.y, r: 120 };
    }
  } else {
    player.noiseTimer = 0.15;
  }
  return madeNoise;
}

// Coin throw: the coin lands at the clicked point, clinks, and shows a
// noise ring. The nearest guard walks over to investigate it.
function throwCoin(player, targetX, targetY, now) {
  if (player.coins <= 0) return null;
  player.coins -= 1;
  return {
    x: targetX,
    y: targetY,
    r: 130,
    born: now,
    life: 1400,
    kind: 'coin',
  };
}

// Smoke puff (Q): blinds every guard whose position is inside the puff
// radius, for SMOKE_DURATION ms. Returns the puff object or null.
function throwSmoke(player, now) {
  if (player.smokes <= 0) return null;
  player.smokes -= 1;
  return {
    x: player.x,
    y: player.y,
    r: SMOKE_RADIUS,
    born: now,
    life: SMOKE_DURATION,
    kind: 'smoke',
  };
}

function applySmokeToGuards(puff, guards, now) {
  for (const g of guards) {
    const d = Math.hypot(g.x - puff.x, g.y - puff.y);
    if (d < puff.r + 40) g.blindUntil = Math.max(g.blindUntil, now + SMOKE_DURATION);
  }
}

// A noise event (footstep ring or coin) draws the nearest non-alert guard
// to investigate the point.
function investigateNoise(guards, point) {
  let best = null;
  let bestD = Infinity;
  for (const g of guards) {
    if (g.state === 'alert') continue;
    const d = Math.hypot(g.x - point.x, g.y - point.y);
    if (d < bestD) { bestD = d; best = g; }
  }
  if (best && bestD < 420) {
    best.investigate = { x: point.x, y: point.y };
    if (best.state === 'patrol') best.state = 'suspicious';
    best.suspicion = Math.max(best.suspicion, 18);
  }
}

if (typeof window !== 'undefined') {
  window.SHADOW_PLAYER = { makePlayer, updatePlayer, throwCoin, throwSmoke, applySmokeToGuards, investigateNoise, playerTile, WALK_SPEED, SNEAK_SPEED, PLAYER_RADIUS, SMOKE_DURATION, SMOKE_RADIUS };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { makePlayer, updatePlayer, throwCoin, throwSmoke, applySmokeToGuards, investigateNoise, playerTile, WALK_SPEED, SNEAK_SPEED, PLAYER_RADIUS, SMOKE_DURATION, SMOKE_RADIUS };
