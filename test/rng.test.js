'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

/* Extracted pure RNG functions matching the implementation in public/app.js */

function randomInt(bound) {
  if (!Number.isInteger(bound) || bound < 1) throw new RangeError('bound must be a positive integer');
  if (bound === 1) return 0;

  if (bound <= 0x100000000) {
    const limit = Math.floor(0x100000000 / bound) * bound;
    const buffer = new Uint32Array(1);
    let value;
    do {
      crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return value % bound;
  }

  const max = Number.MAX_SAFE_INTEGER + 1;
  const limit = Math.floor(max / bound) * bound;
  const buffer = new Uint32Array(2);
  let value;
  do {
    crypto.getRandomValues(buffer);
    value = (buffer[0] % 0x200000) * 0x100000000 + buffer[1];
  } while (value >= limit);
  return value % bound;
}

function randomBetween(min, max) {
  return min + randomInt(max - min + 1);
}

function draw(min, max, count, unique) {
  const span = max - min + 1;
  if (!unique) {
    return Array.from({ length: count }, () => randomBetween(min, max));
  }

  // Optimized draw: when span is small and count is close to span,
  // partial Fisher-Yates shuffle is O(count) with zero duplicate rejections.
  if (span <= 2000) {
    const pool = Array.from({ length: span }, (_, i) => min + i);
    for (let i = 0; i < count; i += 1) {
      const j = i + randomInt(span - i);
      const temp = pool[i];
      pool[i] = pool[j];
      pool[j] = temp;
    }
    return pool.slice(0, count);
  }

  // For very large spans, Set rejection sampling is fast and memory-efficient.
  const chosen = new Set();
  while (chosen.size < count) {
    chosen.add(randomBetween(min, max));
  }
  return Array.from(chosen);
}

function calculateStats(numbers) {
  if (!numbers || !numbers.length) return null;
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  const avg = Math.round((sum / numbers.length) * 10) / 10;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return { sum, avg, min, max, count: numbers.length };
}

/* ------------------------------------------------------------------ Tests */

test('randomInt throws on invalid bounds', () => {
  assert.throws(() => randomInt(0), RangeError);
  assert.throws(() => randomInt(-5), RangeError);
  assert.throws(() => randomInt(1.5), RangeError);
});

test('randomInt(1) returns 0', () => {
  assert.equal(randomInt(1), 0);
});

test('randomBetween handles identical min and max', () => {
  assert.equal(randomBetween(42, 42), 42);
  assert.equal(randomBetween(-7, -7), -7);
});

test('randomBetween respects range boundaries', () => {
  for (let i = 0; i < 100; i += 1) {
    const r = randomBetween(1, 6);
    assert.ok(r >= 1 && r <= 6);
  }

  for (let i = 0; i < 100; i += 1) {
    const r = randomBetween(-20, -10);
    assert.ok(r >= -20 && r <= -10);
  }

  for (let i = 0; i < 100; i += 1) {
    const r = randomBetween(-5, 5);
    assert.ok(r >= -5 && r <= 5);
  }
});

test('draw generates requested count of numbers without unique constraint', () => {
  const result = draw(1, 10, 20, false);
  assert.equal(result.length, 20);
  for (const n of result) {
    assert.ok(n >= 1 && n <= 10);
  }
});

test('draw generates unique numbers with Fisher-Yates for small spans', () => {
  const result = draw(1, 10, 10, true);
  assert.equal(result.length, 10);
  const set = new Set(result);
  assert.equal(set.size, 10);
  for (let i = 1; i <= 10; i += 1) {
    assert.ok(set.has(i), `Expected set to contain ${i}`);
  }
});

test('draw generates unique numbers for large spans', () => {
  const result = draw(10000, 50000, 50, true);
  assert.equal(result.length, 50);
  const set = new Set(result);
  assert.equal(set.size, 50);
  for (const n of result) {
    assert.ok(n >= 10000 && n <= 50000);
  }
});

test('calculateStats correctly computes sum, avg, min, max', () => {
  const numbers = [10, 20, 30, 40];
  const stats = calculateStats(numbers);
  assert.equal(stats.sum, 100);
  assert.equal(stats.avg, 25);
  assert.equal(stats.min, 10);
  assert.equal(stats.max, 40);
  assert.equal(stats.count, 4);
});

