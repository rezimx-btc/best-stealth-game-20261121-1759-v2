// SHADOW PROTOCOL — right-side HUD panel (DOM).
// Big detection word, one row per guard (name + state), loot count,
// goal status, score, smoke count. Updated every frame from game state.
function detectionWord(game) {
  let worst = 0;
  let anyAlert = false;
  let anyClose = false;
  for (const g of game.guards) {
    worst = Math.max(worst, g.suspicion);
    if (g.state === 'alert') anyAlert = true;
  }
  const p = game.player;
  for (const g of game.guards) {
    if (g.state === 'alert' && Math.hypot(g.x - p.x, g.y - p.y) < 130) anyClose = true;
  }
  if (game.phase === 'caught') return { word: 'CAUGHT', cls: 'caught' };
  if (anyClose) return { word: 'HUNTED', cls: 'hunted' };
  if (anyAlert || worst >= ALERT_AT) return { word: 'ALERT', cls: 'alert' };
  if (worst >= SUSPICIOUS_AT) return { word: 'SUSPICIOUS', cls: 'suspicious' };
  return { word: 'CALM', cls: 'calm' };
}

function updateHud(game) {
  const $ = (id) => document.getElementById(id);
  const det = detectionWord(game);
  const detEl = $('detection-word');
  if (detEl) {
    detEl.textContent = det.word;
    detEl.className = 'detection-word ' + det.cls;
  }
  const bar = $('detection-bar-fill');
  if (bar) {
    let worst = 0;
    for (const g of game.guards) worst = Math.max(worst, g.suspicion);
    bar.style.width = Math.round(worst) + '%';
    bar.className = 'detection-bar-fill ' + det.cls;
  }
  const roster = $('guard-roster');
  if (roster) {
    roster.innerHTML = game.guards.map((g) => {
      const mark = g.state === 'alert' ? ' !' : g.state === 'suspicious' ? ' ?' : '';
      return '<div class="roster-row"><span class="roster-dot" style="background:' + g.color + '"></span>' +
        '<span class="roster-name">' + g.name + '</span>' +
        '<span class="roster-state ' + g.state + '">' + guardStateLabel(g) + mark + '</span></div>';
    }).join('');
  }
  const loot = $('loot-count');
  if (loot) loot.textContent = game.coresTaken + ' / ' + game.level.cores.length + ' cores';
  const goal = $('goal-status');
  if (goal) {
    goal.textContent = game.coresTaken >= game.level.cores.length
      ? 'Exit open — reach the green door'
      : 'Collect all cores to open the exit';
  }
  const score = $('score-value');
  if (score) score.textContent = String(game.score);
  const level = $('level-name');
  if (level) level.textContent = game.level.def.name + ' — ' + game.level.def.sub;
  const smoke = $('smoke-count');
  if (smoke) smoke.textContent = 'Smoke: ' + game.player.smokes + ' (Q)';
  const rating = $('rating-line');
  if (rating) {
    rating.textContent = game.everSeen
      ? 'Rating so far: SHADOW (seen once)'
      : 'Rating so far: GHOST (never seen)';
  }
}

// Footer status line: position hint + gadget counts, kept in sync too.
function updateFooter(game) {
  const $ = (id) => document.getElementById(id);
  const status = $('status-line');
  if (!status) return;
  const p = game.player;
  if (game.phase === 'caught') status.textContent = 'SPOTTED — press R to retry.';
  else if (game.phase === 'clear') status.textContent = 'Level clear — press N for the next level.';
  else if (game.phase === 'win') status.textContent = 'Archive cleared. Press R to play again.';
  else if (p.hidden) status.textContent = 'HIDDEN in shadow — guards cannot see you.';
  else if (p.sneaking) status.textContent = 'Sneaking — slow and silent.';
  else if (p.moving) status.textContent = 'Moving — footsteps make noise rings.';
  else status.textContent = 'Stay out of the cones. Shadows hide you.';
}

if (typeof window !== 'undefined') window.SHADOW_HUD = { detectionWord, updateHud, updateFooter };
if (typeof module !== 'undefined' && module.exports) module.exports = { detectionWord, updateHud, updateFooter };
