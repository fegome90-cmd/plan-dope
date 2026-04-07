import boxen, { type Options as BoxenOptions } from 'boxen';
import chalk from 'chalk';
import { BOX_STYLE, COLORS, CONTRAST, SPACING } from './theme.js';

export function renderPanel(content: string, options?: Partial<BoxenOptions>): string {
  return boxen(content, {
    padding: { left: SPACING.paddingX, right: SPACING.paddingX, top: 0, bottom: 0 },
    borderStyle: BOX_STYLE.outer,
    borderColor: COLORS.primary,
    ...options,
  });
}

export function renderSection(title: string, lines: string[]): string {
  const body = lines.join('\n');
  const header = chalk[CONTRAST.foreground].bold(title);
  return `${header}\n${chalk[CONTRAST.secondary](body)}`;
}

export function renderComposed(
  headline: string,
  sections: string[],
  options?: Partial<BoxenOptions>
): string {
  const elements = [chalk[COLORS.primary].bold(headline)];
  for (const section of sections) {
    elements.push('');
    elements.push(section);
  }
  return renderPanel(elements.join('\n'), {
    title: '',
    ...options,
  });
}
