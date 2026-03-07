import * as fs from 'node:fs';
import * as path from 'node:path';

import { CONFIG_FILE_NAME, DEFAULT_DOMAIN, DEFAULT_DOMAINS_ROOT } from './constants.js';
import type { PixelAgentsConfig, ResolvedConfig } from './types.js';

let resolvedConfig: ResolvedConfig | null = null;

/**
 * Reads (or re-reads) pixel-agents.config.json from workspaceRoot.
 * Falls back to defaults if the file is absent or malformed.
 * Stores the result in module-level state for later use by getConfig() / detectDomain().
 */
export function loadConfig(workspaceRoot: string): ResolvedConfig {
  let domainsRoot = DEFAULT_DOMAINS_ROOT;
  let defaultDomain = DEFAULT_DOMAIN;

  const configFilePath = path.join(workspaceRoot, CONFIG_FILE_NAME);
  if (fs.existsSync(configFilePath)) {
    try {
      const raw = fs.readFileSync(configFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as PixelAgentsConfig;
      if (typeof parsed.domainsRoot === 'string') {
        domainsRoot = parsed.domainsRoot;
      }
      if (typeof parsed.defaultDomain === 'string') {
        defaultDomain = parsed.defaultDomain;
      }
    } catch (err) {
      console.error('[Pixel Agents] Failed to parse config file, using defaults:', err);
    }
  }

  const absoluteDomainsRoot = path.join(workspaceRoot, domainsRoot);
  const domainsRootExists = fs.existsSync(absoluteDomainsRoot);

  resolvedConfig = {
    domainsRoot: absoluteDomainsRoot,
    domainsRootExists,
    defaultDomain,
  };

  return resolvedConfig;
}

/**
 * Returns the current resolved config, or null if loadConfig() has not been called yet.
 */
export function getConfig(): ResolvedConfig | null {
  return resolvedConfig;
}

/**
 * Determines which domain a file belongs to based on the resolved config.
 * Returns defaultDomain for files outside domainsRoot or when config is unavailable.
 * Never throws.
 */
export function detectDomain(absFilePath: string): string {
  if (resolvedConfig === null || !resolvedConfig.domainsRootExists) {
    return resolvedConfig?.defaultDomain ?? DEFAULT_DOMAIN;
  }

  const { domainsRoot, defaultDomain } = resolvedConfig;

  try {
    const relative = path.relative(domainsRoot, absFilePath);

    // If relative path starts with '..' or is absolute, the file is outside domainsRoot
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return defaultDomain;
    }

    // Split on path separator to get the first path segment (domain folder name)
    const parts = relative.split(path.sep);
    const domainFolder = parts[0];

    if (!domainFolder || domainFolder === '') {
      return defaultDomain;
    }

    return domainFolder;
  } catch {
    return defaultDomain;
  }
}
