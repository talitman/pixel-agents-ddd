// CFG-01 through DOM-04 — Config Loader and Domain Detection unit tests
// Uses node:test (built-in) + node:assert + real temp directories

import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { after,before, describe, it } from 'node:test';

// NOTE: configLoader.ts uses module-level singleton state.
// We call loadConfig() with a fresh tmpDir at the start of each group's `before`
// to reset the in-memory resolved config before every test group.
import { detectDomain,getConfig, loadConfig } from '../configLoader.js';
import { DEFAULT_DOMAIN } from '../constants.js';

// ── CFG tests ─────────────────────────────────────────────────

describe('CFG-01: loadConfig with no config file', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agents-test-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('does not throw when no config file exists', () => {
    assert.doesNotThrow(() => loadConfig(tmpDir));
  });

  it('domainsRootExists is false when packages/ does not exist', () => {
    const cfg = loadConfig(tmpDir);
    assert.equal(cfg.domainsRootExists, false);
  });

  it('defaultDomain equals DEFAULT_DOMAIN constant', () => {
    const cfg = loadConfig(tmpDir);
    assert.equal(cfg.defaultDomain, DEFAULT_DOMAIN);
  });
});

describe('CFG-02: loadConfig reads domainsRoot from config file', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agents-test-'));
    fs.writeFileSync(
      path.join(tmpDir, 'pixel-agents.config.json'),
      JSON.stringify({ domainsRoot: 'apps', defaultDomain: 'workspace' }),
    );
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('resolves domainsRoot to absolute path from config', () => {
    const cfg = loadConfig(tmpDir);
    assert.equal(cfg.domainsRoot, path.join(tmpDir, 'apps'));
  });
});

describe('CFG-03: loadConfig reads defaultDomain from config file', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agents-test-'));
    fs.writeFileSync(
      path.join(tmpDir, 'pixel-agents.config.json'),
      JSON.stringify({ domainsRoot: 'packages', defaultDomain: 'main' }),
    );
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('resolvedConfig.defaultDomain equals "main"', () => {
    const cfg = loadConfig(tmpDir);
    assert.equal(cfg.defaultDomain, 'main');
  });
});

describe('CFG-04: loadConfig detects existing packages/ directory', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agents-test-'));
    fs.mkdirSync(path.join(tmpDir, 'packages'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('domainsRoot ends with "packages"', () => {
    const cfg = loadConfig(tmpDir);
    assert.ok(
      cfg.domainsRoot.endsWith('packages'),
      `expected to end with "packages", got: ${cfg.domainsRoot}`,
    );
  });

  it('domainsRootExists is true when packages/ directory exists', () => {
    const cfg = loadConfig(tmpDir);
    assert.equal(cfg.domainsRootExists, true);
  });
});

// ── DOM tests ─────────────────────────────────────────────────

describe('DOM-01: detectDomain never throws', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agents-test-'));
    loadConfig(tmpDir);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns a string for any absolute path', () => {
    const result = detectDomain(path.join(tmpDir, 'some/random/file.ts'));
    assert.equal(typeof result, 'string');
  });

  it('does not throw for edge-case paths', () => {
    assert.doesNotThrow(() => detectDomain('/nonexistent/path/file.ts'));
    assert.doesNotThrow(() => detectDomain(''));
    assert.doesNotThrow(() => detectDomain(tmpDir));
  });
});

describe('DOM-02: detectDomain returns domain folder name for files inside domainsRoot', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agents-test-'));
    fs.mkdirSync(path.join(tmpDir, 'packages', 'api', 'src'), { recursive: true });
    loadConfig(tmpDir);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns "api" for packages/api/src/index.ts', () => {
    const result = detectDomain(path.join(tmpDir, 'packages', 'api', 'src', 'index.ts'));
    assert.equal(result, 'api');
  });
});

describe('DOM-03: detectDomain returns defaultDomain for files outside domainsRoot', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agents-test-'));
    loadConfig(tmpDir);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns DEFAULT_DOMAIN for src/utils/helpers.ts', () => {
    const result = detectDomain(path.join(tmpDir, 'src', 'utils', 'helpers.ts'));
    assert.equal(result, DEFAULT_DOMAIN);
  });
});

describe('DOM-04: detectDomain preserves casing of domain folder name', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agents-test-'));
    fs.mkdirSync(path.join(tmpDir, 'packages', 'MyApp'), { recursive: true });
    loadConfig(tmpDir);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns "MyApp" (not "myapp") for packages/MyApp/index.ts', () => {
    const result = detectDomain(path.join(tmpDir, 'packages', 'MyApp', 'index.ts'));
    assert.equal(result, 'MyApp');
  });
});

describe('EDGE: detectDomain before loadConfig (singleton reset behavior)', () => {
  // NOTE: This test relies on the module singleton having been reset by a
  // prior loadConfig() call in earlier test groups. We explicitly reset it
  // here by loading a fresh tmpDir with no packages/ dir to simulate
  // "domainsRootExists === false" state, then test behavior.
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agents-test-'));
    // Load config with no domainsRoot so domainsRootExists = false
    loadConfig(tmpDir);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns DEFAULT_DOMAIN when domainsRootExists is false', () => {
    const result = detectDomain(path.join(tmpDir, 'src', 'file.ts'));
    assert.equal(result, DEFAULT_DOMAIN);
  });

  it('returns defaultDomain when path equals domainsRoot itself', () => {
    // path.relative(domainsRoot, domainsRoot) === "" → should return defaultDomain
    const cfg = getConfig();
    assert.ok(cfg !== null);
    const result = detectDomain(cfg!.domainsRoot);
    assert.equal(result, cfg!.defaultDomain);
  });
});

describe('EDGE: loadConfig with malformed JSON', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agents-test-'));
    fs.writeFileSync(path.join(tmpDir, 'pixel-agents.config.json'), '{ invalid json !!!');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('does not throw on malformed JSON', () => {
    assert.doesNotThrow(() => loadConfig(tmpDir));
  });

  it('returns defaults (DEFAULT_DOMAIN) on malformed JSON', () => {
    const cfg = loadConfig(tmpDir);
    assert.equal(cfg.defaultDomain, DEFAULT_DOMAIN);
  });
});
