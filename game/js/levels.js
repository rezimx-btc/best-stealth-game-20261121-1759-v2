// SHADOW PROTOCOL — level data.
// Tile legend: # wall, c crate (solid), . floor, s shadow floor (hides),
// P player start, C data core, E exit door. 26 cols x 17 rows, tile 32px.
// Guard paths are lists of [tileX, tileY] waypoints (axis-aligned loops).
// Cameras: { tx, ty, base (radians, 0 = east), sweep (radians), range }.
const TILE = 32;
const COLS = 26;
const ROWS = 17;

const LEVELS = [
  {
    name: 'The Lobby',
    sub: 'Level 1 — slip past the front desk',
    map: [
      '##########################',
      '#P....s......c.....C.....#',
      '#........................#',
      '#..cc....s......cc.......#',
      '#..cc...........cc...s...#',
      '#........................#',
      '#....s.......cc..........#',
      '#...........cc......cc...#',
      '#..................cc....#',
      '#..cc....s...............#',
      '#..cc...........C....s...#',
      '#........................#',
      '#......cc......s....cc...#',
      '#......cc...........cc...#',
      '#..s.....................#',
      '#.....C........s....E....#',
      '##########################',
    ],
    guards: [
      { name: 'Marlowe', color: '#e8b64c', speed: 52, path: [[21, 2], [21, 7], [16, 7], [16, 2]] },
      { name: 'Ivo', color: '#7fb069', speed: 46, path: [[6, 9], [6, 4], [12, 4], [12, 9]] },
      { name: 'Sable', color: '#c77dff', speed: 48, path: [[10, 13], [18, 13], [18, 15], [10, 15]] },
    ],
    cameras: [],
  },
  {
    name: 'The Gallery',
    sub: 'Level 2 — the camera watches the hall',
    map: [
      '##########################',
      '#P....#......s.....C.....#',
      '#.....#..................#',
      '#..s..#..cc......cc......#',
      '#.....#..cc......cc..s...#',
      '#.....#..................#',
      '#.............s..........#',
      '#.....#...........#......#',
      '#.....#.....C....#.......#',
      '#.....#...........#......#',
      '#..s..#.....cc....#......#',
      '#.....#.....cc....#..s...#',
      '#........................#',
      '#....cc......s......cc...#',
      '#....cc.............cc...#',
      '#..C........s.......E....#',
      '##########################',
    ],
    guards: [
      { name: 'Marlowe', color: '#e8b64c', speed: 56, path: [[21, 2], [21, 5], [24, 5], [24, 2]] },
      { name: 'Ivo', color: '#7fb069', speed: 50, path: [[2, 9], [2, 13], [4, 13], [4, 9]] },
      { name: 'Sable', color: '#c77dff', speed: 52, path: [[10, 7], [16, 7], [16, 11], [10, 11]] },
      { name: 'Rook', color: '#e07a5f', speed: 54, path: [[20, 8], [24, 8], [24, 14], [19, 14]] },
    ],
    cameras: [
      { tx: 13, ty: 1, base: Math.PI / 2, sweep: 1.1, range: 210, period: 5 },
    ],
  },
  {
    name: 'The Vault',
    sub: 'Level 3 — four guards, one camera, no mistakes',
    map: [
      '##########################',
      '#P...#......s......C.....#',
      '#....#...................#',
      '#..s.#...cc......cc......#',
      '#....#...cc......cc..s...#',
      '#....#...................#',
      '#.............s..........#',
      '#....#.....cc.....#......#',
      '#....#.....cc..C..#......#',
      '#....#...........#.......#',
      '#..s.#.....s.....#..s....#',
      '#....#...........#.......#',
      '#.........cc.............#',
      '#....cc....cc......cc....#',
      '#....cc............cc....#',
      '#..C.......s........E....#',
      '##########################',
    ],
    guards: [
      { name: 'Marlowe', color: '#e8b64c', speed: 60, path: [[21, 2], [21, 5], [24, 5], [24, 2]] },
      { name: 'Ivo', color: '#7fb069', speed: 54, path: [[2, 9], [2, 13], [4, 13], [4, 9]] },
      { name: 'Sable', color: '#c77dff', speed: 56, path: [[10, 7], [16, 7], [16, 11], [10, 11]] },
      { name: 'Rook', color: '#e07a5f', speed: 58, path: [[20, 8], [23, 8], [23, 14], [19, 14]] },
    ],
    cameras: [
      { tx: 13, ty: 1, base: Math.PI / 2, sweep: 1.2, range: 220, period: 4 },
    ],
  },
];

// Parse a level map into runtime data: walls set, shadow set, cores, exit, start.
function parseLevel(def) {
  const walls = new Set();
  const shadow = new Set();
  const cores = [];
  let start = { x: 1.5 * TILE, y: 1.5 * TILE };
  let exit = { x: 24.5 * TILE, y: 15.5 * TILE };
  def.map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const key = x + ',' + y;
      if (ch === '#' || ch === 'c') walls.add(key);
      if (ch === 's') shadow.add(key);
      if (ch === 'C') cores.push({ tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, taken: false });
      if (ch === 'E') exit = { tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      if (ch === 'P') start = { tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
    }
  });
  return { def, walls, shadow, cores, start, exit };
}

function isWall(walls, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return walls.has(tx + ',' + ty);
}

// Flood fill from the player start over walkable tiles (not # / c).
// Returns the set of reachable "x,y" keys — used for the winnability check.
function floodReachable(def) {
  const parsed = parseLevel(def);
  const seen = new Set();
  const queue = [[parsed.start.tx, parsed.start.ty]];
  seen.add(parsed.start.tx + ',' + parsed.start.ty);
  while (queue.length) {
    const [x, y] = queue.pop();
    const next = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of next) {
      const key = nx + ',' + ny;
      if (seen.has(key)) continue;
      if (isWall(parsed.walls, nx, ny)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return { reachable: seen, parsed };
}

if (typeof window !== 'undefined') window.SHADOW_LEVELS = { LEVELS, TILE, COLS, ROWS, parseLevel, isWall, floodReachable };
if (typeof module !== 'undefined' && module.exports) module.exports = { LEVELS, TILE, COLS, ROWS, parseLevel, isWall, floodReachable };
