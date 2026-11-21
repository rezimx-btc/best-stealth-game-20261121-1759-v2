// SHADOW PROTOCOL — canvas rendering: the archive floor, vision cones,
// guards, Wren, cores, exit, noise rings, smoke, and the minimap.
function drawCone(ctx, x, y, dir, range, half, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - half, dir + half);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLevel(ctx, game) {
  const { def, walls, shadow } = game.level;
  const now = performance.now();
  // Floor.
  ctx.fillStyle = '#141824';
  ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const px = tx * TILE;
      const py = ty * TILE;
      const key = tx + ',' + ty;
      if (walls.has(key)) {
        const ch = def.map[ty][tx];
        if (ch === 'c') {
          // Crate.
          ctx.fillStyle = '#6b4f2a';
          ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          ctx.strokeStyle = '#8a6a3b';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8);
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 4);
          ctx.lineTo(px + TILE - 4, py + TILE - 4);
          ctx.moveTo(px + TILE - 4, py + 4);
          ctx.lineTo(px + 4, py + TILE - 4);
          ctx.stroke();
        } else {
          // Wall.
          ctx.fillStyle = '#2c3350';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#3a4368';
          ctx.fillRect(px, py, TILE, 5);
        }
      } else if (shadow.has(key)) {
        // Shadow zone — dark pool where Wren can hide.
        ctx.fillStyle = '#0a0d18';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#1b2340';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SHADOW', px + TILE / 2, py + TILE / 2 + 3);
      } else {
        // Floor tile with a faint checker.
        ctx.fillStyle = (tx + ty) % 2 === 0 ? '#171c2e' : '#151a2a';
        ctx.fillRect(px, py, TILE, TILE);
      }
    }
  }
  // Exit door (locked red until all cores are taken, then green).
  const exit = game.level.exit;
  const open = game.coresTaken >= game.level.cores.length;
  const pulse = open ? 0.6 + 0.4 * Math.sin(now / 240) : 1;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = open ? '#2fd67a' : '#c0392b';
  ctx.fillRect(exit.x - 14, exit.y - 14, 28, 28);
  ctx.fillStyle = '#0b0e18';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCK', exit.x, exit.y + 4);
  ctx.restore();
  ctx.strokeStyle = open ? '#7dffb0' : '#ff7a6b';
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x - 14, exit.y - 14, 28, 28);
  // Data cores.
  for (const core of game.level.cores) {
    if (core.taken) continue;
    const bob = Math.sin(now / 300 + core.tx) * 2;
    ctx.save();
    ctx.shadowColor = '#39d0ff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#39d0ff';
    ctx.beginPath();
    ctx.arc(core.x, core.y + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#dff8ff';
    ctx.beginPath();
    ctx.arc(core.x - 2, core.y + bob - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuards(ctx, game, now) {
  for (const g of game.guards) {
    const blind = now < g.blindUntil;
    const coneColor = g.state === 'alert' ? '#ff3b30' : g.state === 'suspicious' ? '#ff9f1c' : '#e8c15a';
    const coneAlpha = blind ? 0.05 : g.state === 'alert' ? 0.34 : g.state === 'suspicious' ? 0.28 : 0.2;
    drawCone(ctx, g.x, g.y, g.dir, CONE_RANGE, CONE_HALF, coneColor, coneAlpha);
    // Guard body.
    ctx.save();
    ctx.shadowColor = g.color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = g.state === 'alert' ? '#ff3b30' : g.color;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#10131f';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.dir) * 5, g.y + Math.sin(g.dir) * 5, 4, 0, Math.PI * 2);
    ctx.fill();
    // Name tag above the guard.
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(g.name, g.x, g.y - 18);
    ctx.fillText(g.name, g.x, g.y - 18);
    // "?" when suspicious, "!" when the guard sees Wren.
    const mark = g.state === 'alert' ? '!' : g.state === 'suspicious' ? '?' : '';
    if (mark) {
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = g.state === 'alert' ? '#ff3b30' : '#ff9f1c';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 4;
      ctx.strokeText(mark, g.x, g.y - 30);
      ctx.fillText(mark, g.x, g.y - 30);
    }
    // Suspicion bar under the guard.
    if (g.suspicion > 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(g.x - 14, g.y + 17, 28, 5);
      ctx.fillStyle = g.suspicion >= ALERT_AT ? '#ff3b30' : '#ff9f1c';
      ctx.fillRect(g.x - 14, g.y + 17, 28 * (g.suspicion / 100), 5);
    }
  }
  // Security cameras: sweeping cones.
  for (const cam of game.cameras) {
    const ang = cam.base + Math.sin(now / 1000 * (Math.PI * 2 / cam.period)) * cam.sweep;
    const seen = cam.seesPlayer;
    drawCone(ctx, cam.x, cam.y, ang, cam.range, 0.42, seen ? '#ff3b30' : '#ff5d8f', seen ? 0.32 : 0.2);
    ctx.fillStyle = '#ff5d8f';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10131f';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(ang) * 4, cam.y + Math.sin(ang) * 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb3c8';
    ctx.fillText('CAM', cam.x, cam.y - 12);
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  // Noise rings and smoke puffs (under the player).
  const now = performance.now();
  for (const ring of game.rings) {
    const age = now - ring.born;
    const t = age / ring.life;
    if (t > 1) continue;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = ring.kind === 'coin' ? '#ffd94d' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, 8 + t * ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (ring.kind === 'coin') {
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const puff of game.smokes) {
    const age = now - puff.born;
    const t = age / puff.life;
    if (t > 1) continue;
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - t * 0.6);
    ctx.fillStyle = '#9aa3b8';
    ctx.beginPath();
    ctx.arc(puff.x, puff.y, puff.r * (0.7 + 0.3 * t), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Wren: hooded figure, cyan when hidden, amber when sneaking.
  ctx.save();
  ctx.shadowColor = p.hidden ? '#39d0ff' : '#f5f0e6';
  ctx.shadowBlur = p.hidden ? 14 : 6;
  ctx.fillStyle = p.hidden ? '#39d0ff' : p.sneaking ? '#e8b64c' : '#f5f0e6';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#10131f';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.facing) * 4, p.y + Math.sin(p.facing) * 4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 3;
  ctx.strokeText('Wren', p.x, p.y - 17);
  ctx.fillText('Wren', p.x, p.y - 17);
  if (p.hidden) {
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#39d0ff';
    ctx.strokeText('HIDDEN', p.x, p.y + 26);
    ctx.fillText('HIDDEN', p.x, p.y + 26);
  }
}

// Minimap (bottom-right of the canvas): walls, exit, guards, Wren.
function drawMinimap(ctx, game) {
  const scale = 5;
  const w = COLS * scale;
  const h = ROWS * scale;
  const ox = COLS * TILE - w - 10;
  const oy = ROWS * TILE - h - 10;
  ctx.save();
  ctx.fillStyle = 'rgba(5,7,14,0.82)';
  ctx.fillRect(ox - 4, oy - 4, w + 8, h + 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 4, oy - 4, w + 8, h + 8);
  const { def, walls, shadow } = game.level;
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const key = tx + ',' + ty;
      if (walls.has(key)) {
        ctx.fillStyle = '#5a6486';
        ctx.fillRect(ox + tx * scale, oy + ty * scale, scale, scale);
      } else if (shadow.has(key)) {
        ctx.fillStyle = '#1b2340';
        ctx.fillRect(ox + tx * scale, oy + ty * scale, scale, scale);
      }
    }
  }
  const exit = game.level.exit;
  ctx.fillStyle = '#2fd67a';
  ctx.fillRect(ox + exit.tx * scale - 1, oy + exit.ty * scale - 1, scale + 2, scale + 2);
  for (const core of game.level.cores) {
    if (core.taken) continue;
    ctx.fillStyle = '#39d0ff';
    ctx.fillRect(ox + core.tx * scale, oy + core.ty * scale, scale, scale);
  }
  for (const g of game.guards) {
    ctx.fillStyle = g.state === 'alert' ? '#ff3b30' : '#e8b64c';
    ctx.beginPath();
    ctx.arc(ox + (g.x / TILE) * scale, oy + (g.y / TILE) * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ox + (game.player.x / TILE) * scale, oy + (game.player.y / TILE) * scale, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawScene(ctx, game, now) {
  drawLevel(ctx, game);
  drawGuards(ctx, game, now);
  drawPlayer(ctx, game);
  drawMinimap(ctx, game);
  // CLOSE! flash when a cone barely misses Wren.
  if (game.closeCall && game.phase === 'play') {
    const blink = game.staged ? true : Math.sin(now / 90) > 0;
    if (blink) {
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff9f1c';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 6;
      ctx.strokeText('CLOSE!', COLS * TILE / 2, 52);
      ctx.fillText('CLOSE!', COLS * TILE / 2, 52);
    }
  }
  // Center overlays: caught / level clear / game clear.
  if (game.phase === 'caught') {
    overlay(ctx, 'SPOTTED!', 'A guard caught Wren. Press R to retry the level.', '#ff3b30');
  } else if (game.phase === 'clear') {
    const rating = game.lastRating || 'GHOST';
    overlay(ctx, rating + ' — LEVEL CLEAR', 'Cores ' + game.coresTaken + '/' + game.level.cores.length + '  ·  Score ' + game.score + '  ·  Press N for the next level', '#2fd67a');
  } else if (game.phase === 'win') {
    overlay(ctx, 'ALL LEVELS CLEAR', 'Final score ' + game.score + '  ·  ' + game.finalRating + '  ·  Press R to play again', '#39d0ff');
  } else if (game.phase === 'menu') {
    overlay(ctx, 'SHADOW PROTOCOL', 'Infiltrate the Meridian Archive. Grab 3 cores, reach the exit unseen. Click to begin.', '#f5f0e6');
  }
}

function overlay(ctx, title, sub, color) {
  const w = COLS * TILE;
  const h = ROWS * TILE;
  ctx.save();
  ctx.fillStyle = 'rgba(5,7,14,0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(title, w / 2, h / 2 - 12);
  ctx.fillStyle = '#e8eaf2';
  ctx.font = '16px sans-serif';
  ctx.fillText(sub, w / 2, h / 2 + 22);
  ctx.restore();
}

if (typeof window !== 'undefined') window.SHADOW_RENDER = { drawScene, drawLevel, drawGuards, drawPlayer, drawMinimap };
if (typeof module !== 'undefined' && module.exports) module.exports = { drawScene, drawLevel, drawGuards, drawPlayer, drawMinimap };
