/** dsh-overview 双 half 构建：Node（esm）+ 官方 client bundle（cjs，__ModuleLoader__ 契约）。 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
function resolveDshSchemastery() {
  try {
    return require.resolve('@deepseek-ai/schemastery');
  } catch {
    const dshBin = execSync('readlink -f "$(which dsh)"', { encoding: 'utf8' }).trim();
    return join(dirname(dshBin), '..', 'node_modules', '@deepseek-ai', 'schemastery', 'lib', 'index.mjs');
  }
}

export default [
  {
    entry: ['src/index.mjs'],
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    outDir: 'lib',
    clean: true,
    alias: {
      '@deepseek-ai/schemastery': resolveDshSchemastery(),
    },
    noExternal: ['@deepseek-ai/schemastery'],
  },
  {
    name: '@vlln/dsh-overview/client',
    entry: { client: 'src/client/index.tsx' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    dts: false,
    clean: false,
    external: [/@deepseek-ai\/dsh-client-/, /^react($|\/)/, /^react-dom($|\/)/],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "@vlln/dsh-overview", factory: (require) => {',
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
]
