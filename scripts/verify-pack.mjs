/**
 * Packs the library and verifies every published entry point actually resolves.
 *
 * `@wendylabsinc/react-three-map` shipped 1.0.0-1.0.10 with `main` pointing at a
 * file the build never emits and without the `maplibre` subpath shim, so no
 * install could resolve. This guards against a repeat.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const PKG = '@wendylabsinc/react-three-map';
const SUBPATHS = ['', '/mapbox', '/maplibre'];

const dir = mkdtempSync(join(tmpdir(), 'r3m-verify-'));
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

try {
  run('npm', ['pack', '--pack-destination', dir], process.cwd());
  const tgz = join(dir, readdirSync(dir).find((f) => f.endsWith('.tgz')));

  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'verify', private: true }));
  run('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock', tgz], dir);

  const require = createRequire(join(dir, 'index.cjs'));
  const failures = [];

  for (const sub of SUBPATHS) {
    const spec = PKG + sub;
    try {
      require.resolve(spec);
    } catch (err) {
      failures.push(`require("${spec}") -> ${err.code || err.message}`);
    }
    try {
      await import.meta.resolve(spec, `file://${join(dir, 'index.mjs')}`);
    } catch (err) {
      failures.push(`import("${spec}") -> ${err.code || err.message}`);
    }
  }

  if (failures.length) {
    console.error('Published entry points failed to resolve:');
    for (const f of failures) console.error('  - ' + f);
    process.exit(1);
  }

  console.log(`All ${SUBPATHS.length * 2} entry points resolve (CJS + ESM).`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
