// SHADOW PROTOCOL — keyboard + mouse input.
// WASD / arrows move, Shift sneak, Q smoke, R restart, M mute.
// Click on the canvas throws a coin toward that point.
function makeInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    click: null, // {x, y} canvas coords, consumed by the game loop
    pressed: {}, // edge-triggered keys, consumed by the game loop
  };
}

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

function bindInput(input, canvas, onKey) {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    const dir = KEYMAP[e.code];
    if (dir) {
      input[dir] = true;
      e.preventDefault();
    }
    if (!e.repeat) {
      input.pressed[e.code] = true;
      if (onKey) onKey(e.code);
    }
  });
  window.addEventListener('keyup', (e) => {
    const dir = KEYMAP[e.code];
    if (dir) input[dir] = false;
  });
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.click = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  });
  // Do not lose held keys when the window blurs.
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = input.sneak = false;
  });
}

// Consume edge-triggered keys once per frame.
function consumePressed(input, code) {
  if (input.pressed[code]) {
    input.pressed[code] = false;
    return true;
  }
  return false;
}

function consumeClick(input) {
  const c = input.click;
  input.click = null;
  return c;
}

if (typeof window !== 'undefined') window.SHADOW_INPUT = { makeInput, bindInput, consumePressed, consumeClick };
if (typeof module !== 'undefined' && module.exports) module.exports = { makeInput, bindInput, consumePressed, consumeClick };
