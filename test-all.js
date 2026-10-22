#!/usr/bin/env node

/**
 * Virtual CSE Lab — Unified Test Runner
 * Executes test suites across Simulation Engine, Frontend, and Backend
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'Simulation Engine', dir: 'Simulation Engine', cmd: 'npm', args: ['test'] },
  { name: 'Frontend', dir: 'Frontend', cmd: 'npm', args: ['test'] },
  { name: 'Backend', dir: 'Backend', cmd: 'npm', args: ['test'] }
];

console.log('\n================================================================');
console.log('  Virtual CSE Lab — Running All Test Suites');
console.log('================================================================\n');

let allPassed = true;
const results = [];

for (const suite of suites) {
  console.log(`\n>>> [${suite.name}] Running test suite in ${suite.dir}...`);
  const cwd = path.resolve(__dirname, suite.dir);
  const start = Date.now();
  
  const res = spawnSync(suite.cmd, suite.args, {
    cwd,
    shell: true,
    stdio: 'inherit'
  });
  
  const duration = ((Date.now() - start) / 1000).toFixed(2);
  const passed = res.status === 0;
  if (!passed) allPassed = false;
  
  results.push({ name: suite.name, passed, duration, code: res.status });
}

console.log('\n================================================================');
console.log('  Test Execution Summary');
console.log('================================================================');

for (const r of results) {
  const status = r.passed ? 'PASSED' : `FAILED (Exit code ${r.code})`;
  console.log(`  ${r.name.padEnd(20)} [${status}] (${r.duration}s)`);
}

console.log('================================================================\n');

process.exit(allPassed ? 0 : 1);
