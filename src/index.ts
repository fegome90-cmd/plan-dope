#!/usr/bin/env node

import { Command } from 'commander';
import { registerCommands } from './cli.js';
import { renderBanner } from './ui/index.js';

const program = new Command();

program
  .name('plan')
  .description('plan_dope — CLI para generar, validar y revisar planes técnicos de desarrollo')
  .version('0.1.0')
  .addHelpText('beforeAll', `${renderBanner()}\n`);

registerCommands(program);

await program.parseAsync(process.argv);
