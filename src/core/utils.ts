/** Shared utilities — no domain dependencies */
export function now(): string {
  return new Date().toISOString();
}
