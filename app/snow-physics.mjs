/** Gravity projected onto screen coordinates (x right, y down). */
export function orientationGravity(beta, gamma, screenAngle = 0) {
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null;
  const radians = Math.PI / 180;
  const x = Math.cos(beta * radians) * Math.sin(gamma * radians);
  const y = Math.sin(beta * radians);
  const angle = screenAngle * radians;
  const screenX = x * Math.cos(angle) + y * Math.sin(angle);
  const screenY = y * Math.cos(angle) - x * Math.sin(angle);
  const length = Math.hypot(screenX, screenY);
  // Keep the previous direction when the phone is almost flat, avoiding jitter.
  if (length < 0.08) return { x: 0, y: 0 };
  return { x: screenX / length, y: screenY / length };
}

export function createSnowPile(width, height) {
  const cellSize = Math.max(4, Math.ceil(Math.max(width, height) / 240));
  const columns = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  return {
    width, height, cellSize, columns, rows,
    cells: new Uint8Array(columns * rows),
    moved: new Uint32Array(columns * rows),
    count: 0,
    limit: Math.ceil(columns * rows * 0.08),
    tick: 0,
    remainder: 0,
  };
}

export function containsSnow(pile, x, y) {
  const column = Math.floor(x / pile.cellSize);
  const row = Math.floor(y / pile.cellSize);
  return column >= 0 && column < pile.columns && row >= 0 && row < pile.rows &&
    pile.cells[row * pile.columns + column] !== 0;
}

/** Deposit at the collision point, searching upstream if that cell is full. */
export function depositSnow(pile, x, y, gravity) {
  if (pile.count >= pile.limit) return false;
  let column = Math.min(pile.columns - 1, Math.max(0, Math.floor(x / pile.cellSize)));
  let row = Math.min(pile.rows - 1, Math.max(0, Math.floor(y / pile.cellSize)));
  const scale = Math.max(Math.abs(gravity.x), Math.abs(gravity.y), 0.001);
  for (let step = 0; step < pile.columns + pile.rows; step++) {
    const cx = Math.round(column);
    const cy = Math.round(row);
    if (cx < 0 || cx >= pile.columns || cy < 0 || cy >= pile.rows) return false;
    const index = cy * pile.columns + cx;
    if (!pile.cells[index]) {
      pile.cells[index] = 255;
      pile.count++;
      return true;
    }
    column -= gravity.x / scale;
    row -= gravity.y / scale;
  }
  return false;
}

/** A bounded cellular snow simulation; each grain moves at most once per step. */
export function stepSnowPile(pile, gravity, dt) {
  const gx = gravity.x;
  const gy = gravity.y;
  if (Math.hypot(gx, gy) < 0.08 || dt <= 0) return;
  pile.remainder += Math.min(dt, 0.05) * 90;
  const steps = Math.floor(pile.remainder);
  pile.remainder -= steps;
  const sx = Math.sign(gx);
  const sy = Math.sign(gy);
  const vertical = Math.abs(gy) >= Math.abs(gx);
  const primary = vertical ? [0, sy] : [sx, 0];
  const cross = vertical ? [1, 0] : [0, 1];
  const lean = vertical ? gx / Math.abs(gy) : gy / Math.abs(gx);
  const sign = Math.sign(lean) || 1;
  const diagonal = [primary[0] + cross[0] * sign, primary[1] + cross[1] * sign];
  const other = [primary[0] - cross[0] * sign, primary[1] - cross[1] * sign];
  // Only use directions that decrease gravitational potential.
  const lateral = [cross[0] * sign, cross[1] * sign];

  for (let step = 0; step < steps; step++) {
    pile.tick++;
    const tick = pile.tick;
    const diagonalFirst = ((tick * 0.61803398875) % 1) < Math.abs(lean);
    const slopes = lean === 0 && tick % 2 ? [other, diagonal] : [diagonal, other];
    const directions = diagonalFirst ? [diagonal, primary, lateral] : [primary, ...slopes, lateral];
    for (let yi = 0; yi < pile.rows; yi++) {
      const y = sy >= 0 ? pile.rows - 1 - yi : yi;
      for (let xi = 0; xi < pile.columns; xi++) {
        const x = sx >= 0 ? pile.columns - 1 - xi : xi;
        const from = y * pile.columns + x;
        if (!pile.cells[from] || pile.moved[from] === tick) continue;
        for (const [dx, dy] of directions) {
          if (dx * gx + dy * gy <= 0.01) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= pile.columns || ny < 0 || ny >= pile.rows) continue;
          const to = ny * pile.columns + nx;
          if (pile.cells[to]) continue;
          pile.cells[to] = pile.cells[from];
          pile.cells[from] = 0;
          pile.moved[to] = tick;
          break;
        }
      }
    }
  }
}

export function resizeSnowPile(previous, width, height, gravity) {
  const next = createSnowPile(width, height);
  for (let y = 0; y < previous.rows; y++) {
    for (let x = 0; x < previous.columns; x++) {
      if (!previous.cells[y * previous.columns + x]) continue;
      depositSnow(next, (x + 0.5) / previous.columns * width,
        (y + 0.5) / previous.rows * height, gravity);
    }
  }
  return next;
}
