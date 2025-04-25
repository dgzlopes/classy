#!/usr/bin/env node
import { program } from 'commander';
import path from 'path';
import { runCodegen } from './codegen.js';

program
  .name('classy-k6')
  .description('CLI that converts Classy files to k6 tests')
  .argument('<path>', 'file path to the Classy file')
  .action((target) => {
    const fullPath = path.resolve(process.cwd(), target);
    runCodegen(fullPath);
  });

program.parse();

