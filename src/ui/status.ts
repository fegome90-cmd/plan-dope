import chalk from 'chalk';
import { COLORS } from './theme.js';

type StatusType = keyof typeof STATUS_STYLES;

const STATUS_STYLES = {
  pass: { color: COLORS.success, label: 'PASS' },
  fail: { color: COLORS.error, label: 'FAIL' },
  warn: { color: COLORS.warning, label: 'WARN' },
  info: { color: COLORS.primary, label: 'INFO' },
  created: { color: COLORS.success, label: 'CREATED' },
  valid: { color: COLORS.success, label: 'VALID' },
  invalid: { color: COLORS.error, label: 'INVALID' },
  checkpoint: { color: COLORS.primary, label: 'CHECKPOINT' },
} as const;

export function badge(type: StatusType, text?: string): string {
  const { color, label } = STATUS_STYLES[type];
  const tag = chalk[color].inverse(` ${label} `);
  return text ? `${tag} ${chalk.white(text)}` : tag;
}
