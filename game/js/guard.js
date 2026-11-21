// SHADOW PROTOCOL — guard AI.
// States: patrol, suspicious, alert (chase), search, return, investigate.
// Vision: cone (range, half-angle) + line of sight sampled against walls.
// Suspicion 0..100: rises while the player is seen, decays when unseen.
const CONE_RANGE = 175;
const CONE_HALF = 0.62; // ~35 degrees each side
const SUSPICIOUS_AT = 30;
const ALERT_AT = 72;

function makeGuard(def, idx) {
  const start = def.path[0];
  return {
    name: def.name,
    color: def.color,
    speed: def.speed,
    path: def.path,
    wp: 1 % def.path.length,
    x: (start[0] + 0.5) * TILE,
    y: (start[1] + 0.5) * TILE,
    dir: 0, // facing angle, radians
    state: 'patrol',
    suspicion: 0,
    lastSeen: null, // {x, y, t}
    lostTimer: 0,
    searchTimer: 0,
    pauseTimer: 0,
    investigate: null, // {x, y}
    blindUntil: 0, // smoke blind timestamp (ms)
    closeCall: false,
    idx,
  };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Line of sight: sample points along the segment; blocked by any wall tile.
function hasLOS(walls, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (isWall(walls, tx, ty)) return false;
  }
  return true;
}

// Can this guard see the player right now? Returns { seen, dist, edge }.
// edge = true when the player is at the rim of the cone (near-miss -> CLOSE!).
function guardSees(guard, player, walls, now) {
  if (now < guard.blindUntil) return { seen: false, dist: 0, edge: false };
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CONE_RANGE) return { seen: false, dist, edge: false };
  const ang = Math.atan2(dy, dx);
  const diff = Math.abs(angleDiff(ang, guard.dir));
  if (diff > CONE_HALF) return { seen: false, dist, edge: false };
  if (!hasLOS(walls, guard.x, guard.y, player.x, player.y)) return { seen: false, dist, edge: false };
  if (player.hidden) return { seen: false, dist, edge: false };
  const edge = dist > CONE_RANGE * 0.78 || diff > CONE_HALF * 0.82;
  return { seen: true, dist, edge };
}

// Move a point toward a target with wall sliding (axis-separated collision).
function moveWithWalls(walls, pos, dx, dy, radius) {
  const nx = pos.x + dx;
  const ny = pos.y + dy;
  if (!circleHitsWall(walls, nx, pos.y, radius)) pos.x = nx;
  if (!circleHitsWall(walls, pos.x, ny, radius)) pos.y = ny;
}

function circleHitsWall(walls, x, y, r) {
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isWall(walls, tx, ty)) return true;
    }
  }
  return false;
}

function stepToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return true;
  const step = Math.min(d, speed * dt);
  guard.dir = Math.atan2(dy, dx);
  guard.x += (dx / d) * step;
  guard.y += (dy / d) * step;
  return d - step < 3;
}

// One AI tick. dt seconds, now ms. Returns events for sound/HUD.
function updateGuard(guard, player, walls, dt, now) {
  const events = [];
  const see = guardSees(guard, player, walls, now);
  guard.closeCall = false;

  if (see.seen) {
    // Seen: suspicion climbs faster up close, slower at the rim / while sneaking.
    let rate = 46;
    if (see.dist < 70) rate = 95;
    else if (see.dist < 120) rate = 62;
    if (player.sneaking) rate *= 0.45;
    if (see.edge) rate *= 0.55;
    guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y, t: now };
    guard.lostTimer = 0;
    if (see.edge && guard.suspicion < SUSPICIOUS_AT) guard.closeCall = true;
    if (guard.suspicion >= ALERT_AT && guard.state !== 'alert') {
      guard.state = 'alert';
      events.push('alert');
    } else if (guard.suspicion >= SUSPICIOUS_AT && guard.state === 'patrol') {
      guard.state = 'suspicious';
      events.push('suspicious');
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - 26 * dt);
    if (guard.state === 'alert') {
      guard.lostTimer += dt;
      if (guard.lostTimer > 2.5) {
        guard.state = 'search';
        guard.searchTimer = 0;
        events.push('search');
      }
    } else if (guard.state === 'suspicious' && guard.suspicion <= 2) {
      guard.state = 'patrol';
    }
  }

  // Movement by state.
  if (guard.state === 'patrol') {
    const target = guard.path[guard.wp];
    const tx = (target[0] + 0.5) * TILE;
    const ty = (target[1] + 0.5) * TILE;
    if (stepToward(guard, tx, ty, guard.speed, dt)) {
      guard.wp = (guard.wp + 1) % guard.path.length;
    }
  } else if (guard.state === 'suspicious') {
    // Turn toward the last seen point, hold position, scan.
    if (guard.lastSeen) {
      const want = Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x);
      guard.dir += angleDiff(want, guard.dir) * Math.min(1, 6 * dt);
    }
    if (guard.investigate) {
      const done = stepToward(guard, guard.investigate.x, guard.investigate.y, guard.speed * 1.15, dt);
      if (done) {
        guard.pauseTimer += dt;
        if (guard.pauseTimer > 2.2) {
          guard.investigate = null;
          guard.pauseTimer = 0;
          guard.state = 'return';
        }
      }
    }
  } else if (guard.state === 'alert') {
    // Chase the player's live position, faster than patrol.
    stepToward(guard, player.x, player.y, guard.speed * 1.75, dt);
  } else if (guard.state === 'search') {
    if (guard.lastSeen) {
      const done = stepToward(guard, guard.lastSeen.x, guard.lastSeen.y, guard.speed * 1.3, dt);
      guard.searchTimer += dt;
      if (done || guard.searchTimer > 6) {
        guard.state = 'return';
        guard.searchTimer = 0;
      }
    } else {
      guard.state = 'return';
    }
  } else if (guard.state === 'return') {
    // Walk back to the nearest patrol waypoint, then resume patrol.
    let best = 0;
    let bestD = Infinity;
    guard.path.forEach((p, i) => {
      const d = Math.hypot((p[0] + 0.5) * TILE - guard.x, (p[1] + 0.5) * TILE - guard.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    const target = guard.path[best];
    const done = stepToward(guard, (target[0] + 0.5) * TILE, (target[1] + 0.5) * TILE, guard.speed * 1.2, dt);
    if (done) {
      guard.wp = (best + 1) % guard.path.length;
      guard.state = 'patrol';
    }
  }
  return events;
}

function guardStateLabel(guard) {
  if (guard.state === 'patrol') return 'PATROL';
  if (guard.state === 'suspicious') return 'SUSPICIOUS';
  if (guard.state === 'alert') return 'CHASE';
  if (guard.state === 'search') return 'SEARCH';
  if (guard.state === 'return') return 'RETURN';
  return guard.state.toUpperCase();
}

if (typeof window !== 'undefined') {
  window.SHADOW_GUARD = { makeGuard, updateGuard, guardSees, hasLOS, guardStateLabel, moveWithWalls, circleHitsWall, CONE_RANGE, CONE_HALF, SUSPICIOUS_AT, ALERT_AT };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { makeGuard, updateGuard, guardSees, hasLOS, guardStateLabel, moveWithWalls, circleHitsWall, CONE_RANGE, CONE_HALF, SUSPICIOUS_AT, ALERT_AT };
