#!/usr/bin/env node

/**
 * Virtual CSE Lab — Unified Application Launcher
 * Concurrently starts both Frontend (React + Vite) and Backend (Express API)
 * with a single command: npm start (or npm run dev)
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m'
};

console.log(`
${colors.bright}${colors.green}================================================================${colors.reset}
  ${colors.bright}Virtual CSE Lab — Unified Application Launcher${colors.reset}
  Starting Frontend (Vite) and Backend (Express) concurrently...
${colors.bright}${colors.green}================================================================${colors.reset}
`);

const children = [];
let isShuttingDown = false;

function formatLog(prefix, color, data) {
  const lines = data.toString().split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().length > 0) {
      console.log(`${color}${prefix}${colors.reset} ${line}`);
    }
  }
}

function startProcess(name, color, command, args, cwd) {
  console.log(`${color}[${name}]${colors.reset} Spawning in ${colors.dim}${cwd}${colors.reset}...`);

  const child = spawn(command, args, {
    cwd,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  children.push({ name, process: child });

  child.stdout.on('data', (data) => {
    formatLog(`[${name}]`, color, data);
  });

  child.stderr.on('data', (data) => {
    const text = data.toString();
    // Catch common MongoDB warning gracefully
    if (name === 'Backend' && text.includes('ECONNREFUSED 127.0.0.1:27017')) {
      console.log(`${colors.yellow}[Backend Notice]${colors.reset} MongoDB is not running on 127.0.0.1:27017.`);
      console.log(`${colors.yellow}[Backend Notice]${colors.reset} The Frontend visual simulation is 100% functional standalone.`);
      console.log(`${colors.yellow}[Backend Notice]${colors.reset} (Start MongoDB if you wish to run backend database queries).`);
    } else {
      formatLog(`[${name}]`, color, data);
    }
  });

  child.on('close', (code) => {
    if (!isShuttingDown) {
      console.log(`${color}[${name}]${colors.reset} Process exited with code ${code}`);
    }
  });

  child.on('error', (err) => {
    console.error(`${colors.red}[${name} Error]${colors.reset}`, err.message);
  });

  return child;
}

// Graceful cleanup handler
function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${colors.yellow}Received ${signal}. Shutting down all processes...${colors.reset}`);

  for (const { name, process: child } of children) {
    try {
      if (child.pid) {
        if (isWindows) {
          spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
        } else {
          child.kill('SIGINT');
        }
      }
    } catch {
      // ignore kill errors on exit
    }
  }

  setTimeout(() => {
    process.exit(0);
  }, 1000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// 1. Launch Backend API
const backendDir = path.resolve(__dirname, 'Backend');
startProcess('Backend', colors.magenta, 'npm', ['run', 'dev'], backendDir);

// 2. Launch Frontend Application
const frontendDir = path.resolve(__dirname, 'Frontend');
startProcess('Frontend', colors.cyan, 'npm', ['run', 'dev'], frontendDir);

console.log(`
${colors.bright}Endpoints:${colors.reset}
  ${colors.cyan}Frontend:${colors.reset} http://localhost:5173
  ${colors.magenta}Backend:${colors.reset}  http://127.0.0.1:5000 (Health: /health/live, Docs: /docs)
  
${colors.dim}Press Ctrl+C to stop both servers.${colors.reset}
`);
