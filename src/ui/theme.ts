// Design system: typeui-clean — simplicity, minimalism, high usability
// "Color for Meaning Only" — gray builds structure, color communicates status

export const COLORS = {
  primary: 'cyan',
  success: 'green',
  warning: 'yellow',
  error: 'red',
} as const;

export const CONTRAST = {
  foreground: 'white',
  secondary: 'gray',
  muted: 'dim',
  faint: 'hidden',
} as const;

export const SPACING = { section: 1, paddingX: 2 } as const;

export const BOX_STYLE = {
  section: 'round' as const,
  outer: 'bold' as const,
};
