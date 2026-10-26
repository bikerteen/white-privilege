import test from 'node:test';
import assert from 'node:assert/strict';
import { orientationGravity, createSnowPile, depositSnow, containsSnow, stepSnowPile, resizeSnowPile } from '../app/snow-physics.mjs';

const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);
const direction = (x, y) => ({ x: x / Math.hypot(x, y), y: y / Math.hypot(x, y) });
function seed() {
  const pile = createSnowPile(160, 240);
  for (let y = 100; y < 120; y += 4) {
    for (let x = 60; x < 100; x += 4) depositSnow(pile, x, y, { x: 0, y: 1 });
  }
  return pile;
}
function simulate(pile, gravity, seconds = 5, fps = 60) {
  for (let i = 0; i < seconds * fps; i++) stepSnowPile(pile, gravity, 1 / fps);
}
function centroid(pile) {
  let x = 0, y = 0, count = 0;
  pile.cells.forEach((cell, i) => {
    if (!cell) return;
    x += (i % pile.columns + 0.5) / pile.columns;
    y += (Math.floor(i / pile.columns) + 0.5) / pile.rows;
    count++;
  });
  assert.equal(count, pile.count, 'The grain count must match occupied cells');
  return { x: x / count, y: y / count };
}

test('upright, inverted, and side orientations point toward the physical lower edge', () => {
  near(orientationGravity(90, 0).y, 1);
  near(orientationGravity(-90, 0).y, -1);
  near(orientationGravity(0, 45).x, 1);
  near(orientationGravity(0, -45).x, -1);
});

test('landscape and reverse portrait rotate gravity into the screen frame', () => {
  const landscape = orientationGravity(0, -90, 90);
  near(landscape.x, 0);
  near(landscape.y, 1);
  const reverseLandscape = orientationGravity(0, 90, 270);
  near(reverseLandscape.x, 0);
  near(reverseLandscape.y, 1);
  near(orientationGravity(-90, 0, 180).y, 1);
});

test('flat phones have a dead zone; missing readings are rejected', () => {
  assert.deepEqual(orientationGravity(1, 1), { x: 0, y: 0 });
  assert.equal(orientationGravity(null, 0), null);
  assert.equal(orientationGravity(NaN, 0), null);
});

for (const [name, x, y] of [['bottom right', 1, 1], ['bottom left', -1, 1], ['top right', 1, -1], ['top left', -1, -1]]) {
  test(`snow accumulates in the ${name} corner without losing grains`, () => {
    const pile = seed();
    const count = pile.count;
    simulate(pile, direction(x, y));
    const center = centroid(pile);
    assert.equal(pile.count, count);
    assert.ok(x > 0 ? center.x > 0.8 : center.x < 0.2, JSON.stringify(center));
    assert.ok(y > 0 ? center.y > 0.8 : center.y < 0.2, JSON.stringify(center));
  });
}

test('existing snow moves across the screen when the tilt is reversed', () => {
  const pile = seed();
  simulate(pile, direction(1, 1));
  simulate(pile, direction(-1, -1));
  const center = centroid(pile);
  assert.ok(center.x < 0.2 && center.y < 0.2);
  assert.equal(pile.count, 50);
});

test('level gravity returns snow to the bottom and stays bounded', () => {
  const pile = seed();
  simulate(pile, direction(-1, -1));
  simulate(pile, direction(0, 1));
  assert.ok(centroid(pile).y > 0.9);
  assert.equal(pile.count, 50);
});

test('deposition detects collisions and limits pile size', () => {
  const pile = createSnowPile(80, 80);
  assert.ok(depositSnow(pile, 40, 79, { x: 0, y: 1 }));
  assert.ok(containsSnow(pile, 40, 79));
  assert.equal(containsSnow(pile, -1, 79), false);
  for (let i = 0; i < 1000; i++) depositSnow(pile, (i % 20) * 4, 79, { x: 0, y: 1 });
  assert.equal(pile.count, pile.limit);
  centroid(pile);
});

test('rotation resizes the snow field and retains its contents', () => {
  const pile = seed();
  const rotated = resizeSnowPile(pile, 240, 160, direction(0, 1));
  assert.equal(rotated.count, pile.count);
  simulate(rotated, direction(1, -1));
  const center = centroid(rotated);
  assert.ok(center.x > 0.8 && center.y < 0.2);
});

test('settling is consistent at 30 and 60 fps and zero time freezes the pile', () => {
  const slow = seed(), fast = seed();
  simulate(slow, direction(1, 1), 5, 30);
  simulate(fast, direction(1, 1), 5, 60);
  assert.deepEqual(slow.cells, fast.cells);
  const snapshot = slow.cells.slice();
  stepSnowPile(slow, direction(-1, -1), 0);
  assert.deepEqual(slow.cells, snapshot);
});
