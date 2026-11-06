// bitval.mjs (the ES-module entry) must be bitval.js plus exports: regenerated from it, and
// scoring every random hand exactly as bitval.js does.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { build } = require('../scripts/build-esm.js');
const onDisk = fs.readFileSync(new URL('../bitval.mjs', import.meta.url), 'utf8');
if (build() !== onDisk) {
  console.error('bitval.mjs was out of date with bitval.js; it has been regenerated, commit it');
  process.exit(1);
}
const CjsBitVal = require('../bitval.js');
const { default: EsmBitVal } = await import('../bitval.mjs');
const a = new CjsBitVal();
const b = new EsmBitVal();
const n = +(process.argv[2] || 200000);
let seed = 9;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const R = 'AKQJT98765432';
const deck = [];
for (const r of R) for (const s of 'shdc') deck.push(r + s);
for (let i = 0; i < n; i++) {
  const hand = [];
  while (hand.length < 5 + (i % 3)) { const c = deck[Math.floor(rnd() * 52)]; if (!hand.includes(c)) hand.push(c); }
  const lanes = a.toSuitMasks(hand);
  if (a.evaluateCards(hand) !== b.evaluateCards(hand) || a.evaluateSuits(...lanes) !== b.evaluateSuits(...lanes)) {
    console.error('Mismatch on', hand.join(' '));
    process.exit(1);
  }
}
const x = await a.compareRange(['AhKh'], ['QsQd'], ['2c', '7d', '9h'], [], 5, 1000, true, null, 100, false);
const y = await b.compareRange(['AhKh'], ['QsQd'], ['2c', '7d', '9h'], [], 5, 1000, true, null, 100, false);
if (JSON.stringify(x) !== JSON.stringify(y)) { console.error('compareRange differs', x, y); process.exit(1); }
console.log(`ESM entry OK: ${n} hands and compareRange match bitval.js`);
