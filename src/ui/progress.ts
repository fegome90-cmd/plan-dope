import chalk from 'chalk';
import { COLORS, CONTRAST } from './theme.js';

export function stepStart(step: number, total: number, label: string): string {
  const counter = chalk[CONTRAST.muted](`[${step}/${total}]`);
  return `${counter} ${chalk[CONTRAST.foreground](label)}`;
}

export function stepDone(path: string): string {
  const check = chalk[COLORS.success]('  ✓');
  return `${check} ${chalk[CONTRAST.secondary](path)}`;
}

export function pipelineStart(title: string): string {
  const line = '─'.repeat(40);
  return `\n${chalk[COLORS.primary](line)}\n  ${chalk[COLORS.primary].bold(title)}\n${chalk[COLORS.primary](line)}\n`;
}

export function pipelineDone(): string {
  const line = '─'.repeat(40);
  return `\n${chalk[COLORS.primary](line)}\n  Pipeline completado\n${chalk[COLORS.primary](line)}`;
}
