// Helper worker for bench/worker-spawn.js (Node worker_threads proxy).
// Loading bitval.js here is the node analogue of a browser Worker's
// importScripts('./bitval.js') on startup.
const { parentPort } = require('worker_threads');
const BitVal = require('../bitval.js');
const bv = new BitVal();
// Touch the evaluator so the module is actually parsed/compiled, like a real worker.
bv.evaluate(bv.getBitMasked(['As', 'Ks', 'Qs', 'Js', 'Ts', '9s', '8s']));
parentPort.postMessage('ready');
parentPort.on('message', (m) => parentPort.postMessage(m)); // echo, for warm round-trip timing
