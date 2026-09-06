'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

/* Extracted pure functions matching the implementation in public/app.js */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseItems(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.*?)\s*[x×]\s*(\d{1,2})$/i);
      if (match && match[1].trim()) {
        return { label: match[1].trim(), weight: clamp(Number(match[2]), 1, 50) };
      }
      return { label: line, weight: 1 };
    });
}

function calculateSegments(items) {
  if (!items || !items.length) return [];
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = 0;
  return items.map((item, index) => {
    const sweep = (item.weight / total) * 360;
    const start = cursor;
    const end = cursor + sweep;
    cursor = end;
    const mid = (start + end) / 2;
    return { ...item, start, end, mid, sweep, index };
  });
}

function calculateSpinTarget(winner, currentRotation, randomJitterRatio = 0) {
  const half = (winner.end - winner.start) / 2;
  const jitter = randomJitterRatio * half * 0.7;
  const targetAngle = winner.mid + jitter;

  const normalized = ((currentRotation % 360) + 360) % 360;
  const delta = (360 - ((targetAngle + normalized) % 360)) % 360;
  const turns = 4;
  const to = currentRotation + turns * 360 + delta;

  return { to, targetAngle };
}

function removeWinnerLine(text, winnerLabel) {
  const lines = String(text || '').split('\n');
  const target = lines.findIndex((line) => {
    const parsed = parseItems(line)[0];
    return parsed && parsed.label === winnerLabel;
  });
  if (target >= 0) {
    lines.splice(target, 1);
  }
  return lines.join('\n');
}

/* ------------------------------------------------------------------ Tests */

test('parseItems correctly parses simple items', () => {
  const input = 'Pizza\nSushi\nBurger';
  const result = parseItems(input);
  assert.equal(result.length, 3);
  assert.deepEqual(result[0], { label: 'Pizza', weight: 1 });
  assert.deepEqual(result[1], { label: 'Sushi', weight: 1 });
  assert.deepEqual(result[2], { label: 'Burger', weight: 1 });
});

test('parseItems correctly handles weighted items and multipliers', () => {
  const input = 'Palačinky x3\nSalát × 2\nKáva x 10';
  const result = parseItems(input);
  assert.equal(result.length, 3);
  assert.deepEqual(result[0], { label: 'Palačinky', weight: 3 });
  assert.deepEqual(result[1], { label: 'Salát', weight: 2 });
  assert.deepEqual(result[2], { label: 'Káva', weight: 10 });
});

test('parseItems clamps weights between 1 and 50', () => {
  const input = 'Super x99\nZero x0';
  const result = parseItems(input);
  assert.equal(result[0].weight, 50);
  assert.equal(result[1].weight, 1);
});

test('parseItems preserves numbers in item names', () => {
  const input = 'The Sims 4\nAgent 007 x2';
  const result = parseItems(input);
  assert.equal(result[0].label, 'The Sims 4');
  assert.equal(result[0].weight, 1);
  assert.equal(result[1].label, 'Agent 007');
  assert.equal(result[1].weight, 2);
});

test('parseItems ignores blank lines and trims whitespace', () => {
  const input = '  Pizza  \n\n   \nSushi x2\n  ';
  const result = parseItems(input);
  assert.equal(result.length, 2);
  assert.equal(result[0].label, 'Pizza');
  assert.equal(result[1].label, 'Sushi');
});

test('calculateSegments distributes sweeps proportionally', () => {
  const items = [
    { label: 'A', weight: 1 },
    { label: 'B', weight: 3 },
  ];
  const segments = calculateSegments(items);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].sweep, 90);
  assert.equal(segments[0].start, 0);
  assert.equal(segments[0].end, 90);
  assert.equal(segments[0].mid, 45);

  assert.equal(segments[1].sweep, 270);
  assert.equal(segments[1].start, 90);
  assert.equal(segments[1].end, 360);
  assert.equal(segments[1].mid, 225);
});

test('calculateSegments sum of sweeps is exactly 360', () => {
  const items = parseItems('A\nB x2\nC x3\nD x4\nE');
  const segments = calculateSegments(items);
  const totalSweep = segments.reduce((sum, s) => sum + s.sweep, 0);
  assert.ok(Math.abs(totalSweep - 360) < 0.0001);
});

test('calculateSpinTarget precisely lands chosen winner under top pointer', () => {
  const items = parseItems('Alpha\nBeta\nGamma\nDelta');
  const segments = calculateSegments(items);

  let currentRotation = 0;
  for (const winner of segments) {
    // Test without jitter and with positive/negative jitter
    for (const jitterRatio of [-0.5, 0, 0.5]) {
      const { to, targetAngle } = calculateSpinTarget(winner, currentRotation, jitterRatio);

      // In CSS, rotating element by `to` degrees clockwise moves a point originally at
      // `targetAngle` to `(targetAngle + to) % 360`.
      // The top pointer is at angle 0.
      const landedAngle = ((targetAngle + to) % 360 + 360) % 360;
      assert.ok(
        Math.abs(landedAngle) < 0.0001 || Math.abs(landedAngle - 360) < 0.0001,
        `Expected targetAngle ${targetAngle} + rotation ${to} to land at 0 deg, got ${landedAngle}`
      );

      // Verify targetAngle is inside the winner's segment
      assert.ok(
        targetAngle >= winner.start && targetAngle <= winner.end,
        `Target angle ${targetAngle} should be within [${winner.start}, ${winner.end}]`
      );

      currentRotation = to; // Consecutive spin test
    }
  }
});

test('removeWinnerLine correctly removes only the winning line', () => {
  const input = 'Pizza x2\nSushi\nBurger x3';
  const updated = removeWinnerLine(input, 'Sushi');
  assert.equal(updated, 'Pizza x2\nBurger x3');
});

