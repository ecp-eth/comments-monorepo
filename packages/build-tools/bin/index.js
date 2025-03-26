#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

const scriptPath = path.resolve(import.meta.dirname, '../src/index.ts');

spawn('npx', ['--yes', 'tsx', scriptPath, ...process.argv.slice(2)], {
  stdio: 'inherit'
});
