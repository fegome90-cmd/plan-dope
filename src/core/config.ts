import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';

/**
 * Config boundaries for plan_dope v1:
 *
 * Global config lives at ~/.plan_dope/config/config.yml
 * Per-project overrides live at <project-root>/.plan_dope.yml
 *
 * Resolution precedence (highest to lowest):
 * 1. Explicit flag overrides (passed at CLI invocation time, not persisted)
 * 2. Per-project config (.plan_dope.yml in project root)
 * 3. Global config (~/.plan_dope/config/config.yml)
 * 4. Built-in defaults
 *
 * Per ARCHITECTURE-v1.md: "En v1 no se define un archivo de configuración por proyecto."
 * This module establishes the boundary: global config is canonical, per-project
 * overrides are supported for artifacts_base_path only. Future extensions must
 * be explicitly added to the allowed per-project keys.
 */

export interface GlobalConfig {
  /** Default project path for CLI operations */
  default_project_path?: string;
  /** Base path for artifacts within each project (default: _ctx) */
  artifacts_base_path?: string;
  /** Whether to auto-derive plan.yaml after plan.md creation */
  auto_derive?: boolean;
  /** Default handoff reason for checkpoints */
  default_handoff_reason?: 'pause' | 'transfer' | 'completion';
}

/**
 * Keys allowed in per-project overrides.
 * This is intentionally narrow to prevent config drift.
 */
const ALLOWED_PROJECT_OVERRIDE_KEYS = ['artifacts_base_path'] as const;

export type ProjectOverride = Pick<GlobalConfig, (typeof ALLOWED_PROJECT_OVERRIDE_KEYS)[number]>;

const PROJECT_CONFIG_FILENAME = '.plan_dope.yml';

/** Resolve home dir dynamically (respects process.env.HOME changes for test isolation) */
function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || '/tmp';
}

function getGlobalConfigDir(): string {
  return join(getHomeDir(), '.plan_dope', 'config');
}

function getGlobalConfigPath(): string {
  return join(getGlobalConfigDir(), 'config.yml');
}

const DEFAULTS: GlobalConfig = {
  artifacts_base_path: '_ctx',
  auto_derive: false,
};

/**
 * Read global config from ~/.plan_dope/config/config.yml.
 * Returns defaults if file doesn't exist.
 */
export function readGlobalConfig(): GlobalConfig {
  const configPath = getGlobalConfigPath();
  if (!existsSync(configPath)) {
    return { ...DEFAULTS };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = parse(content) as GlobalConfig;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Write global config to ~/.plan_dope/config/config.yml.
 * Creates the directory if it doesn't exist.
 */
export function writeGlobalConfig(config: GlobalConfig): string {
  const configDir = getGlobalConfigDir();
  const configPath = getGlobalConfigPath();
  mkdirSync(configDir, { recursive: true });
  writeFileSync(configPath, stringify(config), 'utf-8');
  return configPath;
}

/**
 * Read per-project overrides from <project-root>/.plan_dope.yml.
 * Only allowed keys are merged; unknown keys are silently ignored.
 * Returns empty object if file doesn't exist.
 */
export function readProjectOverride(projectRoot: string): ProjectOverride {
  const projectConfigPath = join(projectRoot, PROJECT_CONFIG_FILENAME);
  if (!existsSync(projectConfigPath)) {
    return {};
  }

  try {
    const content = readFileSync(projectConfigPath, 'utf-8');
    const parsed = parse(content) as Record<string, unknown>;
    const override: Partial<ProjectOverride> = {};

    for (const key of ALLOWED_PROJECT_OVERRIDE_KEYS) {
      if (key in parsed) {
        override[key] = parsed[key] as string;
      }
    }

    return override as ProjectOverride;
  } catch {
    return {};
  }
}

/**
 * Resolve the effective config for a given project root.
 * Applies precedence: defaults < global < project override.
 */
export function resolveConfig(projectRoot: string): GlobalConfig {
  const globalConfig = readGlobalConfig();
  const projectOverride = readProjectOverride(projectRoot);

  return {
    ...DEFAULTS,
    ...globalConfig,
    ...projectOverride,
  };
}

/**
 * Get the effective artifacts base path for a project.
 * This is the most commonly resolved config value.
 */
export function resolveArtifactsBasePath(projectRoot: string): string {
  const config = resolveConfig(projectRoot);
  return config.artifacts_base_path ?? '_ctx';
}

/**
 * Ensure the global config directory exists.
 * Returns the global config path.
 */
export function ensureGlobalConfigDir(): string {
  const configDir = getGlobalConfigDir();
  const configPath = getGlobalConfigPath();
  mkdirSync(configDir, { recursive: true });
  return configPath;
}
